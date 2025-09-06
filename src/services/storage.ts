/**
 * Storage Abstraction Layer
 * Supports local file storage and S3 with automatic fallback
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { config, isDevelopment } from '../config/environment';
import { imageProcessor } from './imageProcessor';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const access = promisify(fs.access);

export interface StorageResult {
  url: string;
  thumbnailUrl?: string;
  size: number;
  mimeType: string;
}

export interface FileInfo {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

export class StorageService {
  
  async saveFile(
    projectId: string,
    type: 'photo' | 'screenshot' | 'pdf',
    fileInfo: FileInfo,
    generateThumbnail: boolean = true
  ): Promise<StorageResult> {
    
    let processedFileInfo = fileInfo;
    let fileName: string;
    
    // Process images (photos and screenshots)
    if (type === 'photo' || type === 'screenshot') {
      // Process image: convert to JPEG and get metadata
      const processed = type === 'screenshot' 
        ? await imageProcessor.processScreenshot(fileInfo.buffer)
        : await imageProcessor.processPhoto(fileInfo.buffer, fileInfo.originalName);
      
      // Create filename with .jpg extension
      fileName = imageProcessor.createFileName(fileInfo.originalName, 'jpg');
      
      // Update file info with processed data
      processedFileInfo = {
        buffer: processed.buffer,
        originalName: fileName,
        mimeType: 'image/jpeg',
        size: processed.size
      };
    } else {
      // For PDFs, keep original format
      const timestamp = Date.now();
      const sanitizedName = fileInfo.originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
      fileName = `${timestamp}_${sanitizedName}`;
    }
    
    let url: string;
    let thumbnailUrl: string | undefined;
    
    if (config.storage.type === 'local') {
      const result = await this.saveToLocal(projectId, type, fileName, processedFileInfo, generateThumbnail);
      url = result.url;
      thumbnailUrl = result.thumbnailUrl;
    } else {
      // For S3 implementation later
      throw new Error('S3 storage not implemented yet');
    }
    
    return {
      url,
      thumbnailUrl,
      size: processedFileInfo.size,
      mimeType: processedFileInfo.mimeType
    };
  }
  
  async deleteFile(url: string, thumbnailUrl?: string): Promise<void> {
    if (config.storage.type === 'local') {
      await this.deleteFromLocal(url, thumbnailUrl);
    } else {
      // For S3 implementation later
      throw new Error('S3 storage not implemented yet');
    }
  }
  
  private async saveToLocal(
    projectId: string,
    type: string,
    fileName: string,
    fileInfo: FileInfo,
    generateThumbnail: boolean
  ): Promise<{ url: string; thumbnailUrl?: string }> {
    
    // Create directory structure
    const baseDir = path.join(config.storage.uploadDir, type, projectId);
    const originalsDir = path.join(baseDir, 'originals');
    const thumbnailsDir = path.join(baseDir, 'thumbnails');
    
    await this.ensureDirectoryExists(originalsDir);
    
    // Save original file
    const originalPath = path.join(originalsDir, fileName);
    await writeFile(originalPath, fileInfo.buffer);
    
    // Generate relative URL for original
    // In development, return full URL with backend host
    const baseUrl = isDevelopment ? `http://localhost:${config.port}` : '';
    const url = `${baseUrl}/uploads/${type}/${projectId}/originals/${fileName}`;
    
    let thumbnailUrl: string | undefined;
    
    // Generate thumbnail for images
    if (generateThumbnail && (type === 'photo' || type === 'screenshot')) {
      await this.ensureDirectoryExists(thumbnailsDir);
      
      try {
        // Generate thumbnail using image processor
        const thumbnail = await imageProcessor.generateThumbnail(
          fileInfo.buffer,
          {
            width: config.storage.thumbnailSize.width,
            height: config.storage.thumbnailSize.height,
            quality: 80
          }
        );
        
        // Create thumbnail filename with .jpg extension
        const thumbnailFileName = imageProcessor.createThumbnailName(fileName);
        const thumbnailPath = path.join(thumbnailsDir, thumbnailFileName);
        
        // Save thumbnail
        await writeFile(thumbnailPath, thumbnail.buffer);
        
        thumbnailUrl = `${baseUrl}/uploads/${type}/${projectId}/thumbnails/${thumbnailFileName}`;
      } catch (error) {
        console.warn('Failed to generate thumbnail:', error);
        // Continue without thumbnail
      }
    }
    
    return { url, thumbnailUrl };
  }
  
  private async deleteFromLocal(url: string, thumbnailUrl?: string): Promise<void> {
    try {
      // Convert URL back to file path (handle both absolute and relative URLs)
      const cleanUrl = url.replace(/^https?:\/\/[^\/]+/, ''); // Remove protocol and host if present
      const filePath = path.join(config.storage.uploadDir, cleanUrl.replace('/uploads/', ''));
      
      // Check if file exists before attempting to delete
      try {
        await access(filePath, fs.constants.F_OK);
        await unlink(filePath);
      } catch (error) {
        console.warn('File does not exist, skipping deletion:', filePath);
      }
      
      // Delete thumbnail if exists
      if (thumbnailUrl) {
        const cleanThumbnailUrl = thumbnailUrl.replace(/^https?:\/\/[^\/]+/, '');
        const thumbnailPath = path.join(config.storage.uploadDir, cleanThumbnailUrl.replace('/uploads/', ''));
        try {
          await access(thumbnailPath, fs.constants.F_OK);
          await unlink(thumbnailPath);
        } catch (error) {
          console.warn('Thumbnail does not exist, skipping deletion:', thumbnailPath);
        }
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }
  
  private async ensureDirectoryExists(dir: string): Promise<void> {
    try {
      await access(dir, fs.constants.F_OK);
    } catch (error) {
      await mkdir(dir, { recursive: true });
    }
  }
  
  private isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }
  
  
  // Validate file type and size
  validateFile(fileInfo: FileInfo): { valid: boolean; error?: string } {
    let { mimeType, size } = fileInfo;
    const extension = path.extname(fileInfo.originalName).substring(1).toLowerCase();
    
    // Check file size
    if (size > config.storage.maxFileSize) {
      return {
        valid: false,
        error: `File size exceeds maximum limit of ${config.storage.maxFileSize / (1024 * 1024)}MB`
      };
    }
    
    // Fallback MIME type detection based on file extension if MIME type is missing or generic
    if (!mimeType || mimeType === 'application/octet-stream' || mimeType === '') {
      // Map common extensions to MIME types
      const extensionToMime: Record<string, string> = {
        // Images
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'bmp': 'image/bmp',
        'svg': 'image/svg+xml',
        'ico': 'image/x-icon',
        'tiff': 'image/tiff',
        'tif': 'image/tiff',
        'heic': 'image/heic',
        'heif': 'image/heif',
        'avif': 'image/avif',
        // PDFs
        'pdf': 'application/pdf'
      };
      
      if (extensionToMime[extension]) {
        mimeType = extensionToMime[extension];
        console.log(`Detected MIME type '${mimeType}' from extension '${extension}'`);
      }
    }
    
    // Check file type
    if (mimeType.startsWith('image/')) {
      // Accept all image types - we'll convert unsupported ones
      return { valid: true };
    } else if (mimeType === 'application/pdf' || extension === 'pdf') {
      // Accept PDFs
      return { valid: true };
    } else {
      // Try to determine if it's an image based on extension
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico', 'tiff', 'tif', 'heic', 'heif', 'avif'];
      if (imageExtensions.includes(extension)) {
        return { valid: true };
      }
      
      return {
        valid: false,
        error: `File type '${mimeType || extension}' is not supported. Supported types: images (jpg, png, gif, etc.) and PDFs`
      };
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();