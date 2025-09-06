/**
 * Image Processing Service
 * Handles all image formats including HEIC, converts to JPEG, and generates thumbnails
 */

import sharp from 'sharp';
import * as path from 'path';
import { FileInfo } from './storage';

export interface ProcessedImage {
  buffer: Buffer;
  format: string;
  width?: number;
  height?: number;
  size: number;
  mimeType: string;
  originalFormat?: string;
}

export class ImageProcessor {
  /**
   * Process any image format and convert to JPEG
   * Handles HEIC, PNG, GIF, BMP, TIFF, WebP, etc.
   */
  async processImage(input: Buffer | string, options?: {
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
  }): Promise<ProcessedImage> {
    const quality = options?.quality || 90;
    const maxWidth = options?.maxWidth || 4096;
    const maxHeight = options?.maxHeight || 4096;

    try {
      // Create sharp instance
      const image = sharp(input);
      
      // Get image metadata
      const metadata = await image.metadata();
      const originalFormat = metadata.format;
      
      // Rotate based on EXIF orientation (important for phone photos)
      image.rotate();
      
      // Resize if needed (maintaining aspect ratio)
      if (metadata.width && metadata.height) {
        if (metadata.width > maxWidth || metadata.height > maxHeight) {
          image.resize(maxWidth, maxHeight, {
            fit: 'inside',
            withoutEnlargement: true
          });
        }
      }
      
      // Convert to JPEG
      const processedBuffer = await image
        .jpeg({ 
          quality, 
          progressive: true,
          mozjpeg: true // Better compression
        })
        .toBuffer();
      
      // Get new metadata after processing
      const processedMetadata = await sharp(processedBuffer).metadata();
      
      return {
        buffer: processedBuffer,
        format: 'jpeg',
        width: processedMetadata.width,
        height: processedMetadata.height,
        size: processedBuffer.length,
        mimeType: 'image/jpeg',
        originalFormat
      };
    } catch (error) {
      console.error('Image processing failed:', error);
      throw new Error(`Failed to process image: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate thumbnail from image
   */
  async generateThumbnail(input: Buffer | string, options?: {
    width?: number;
    height?: number;
    quality?: number;
  }): Promise<ProcessedImage> {
    const width = options?.width || 200;
    const height = options?.height || 200;
    const quality = options?.quality || 80;

    try {
      const image = sharp(input);
      
      // Rotate based on EXIF orientation
      image.rotate();
      
      // Create thumbnail with cover fit (fills the dimensions, cropping if needed)
      const thumbnailBuffer = await image
        .resize(width, height, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ 
          quality,
          progressive: true
        })
        .toBuffer();
      
      const metadata = await sharp(thumbnailBuffer).metadata();
      
      return {
        buffer: thumbnailBuffer,
        format: 'jpeg',
        width: metadata.width,
        height: metadata.height,
        size: thumbnailBuffer.length,
        mimeType: 'image/jpeg'
      };
    } catch (error) {
      console.error('Thumbnail generation failed:', error);
      throw new Error(`Failed to generate thumbnail: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Detect image format from buffer
   */
  async detectFormat(buffer: Buffer): Promise<string | undefined> {
    try {
      const metadata = await sharp(buffer).metadata();
      return metadata.format;
    } catch (error) {
      console.warn('Could not detect image format:', error);
      return undefined;
    }
  }

  /**
   * Process screenshot from clipboard (base64 or buffer)
   */
  async processScreenshot(input: string | Buffer): Promise<ProcessedImage> {
    let buffer: Buffer;
    
    // Handle base64 input
    if (typeof input === 'string') {
      // Remove data URL prefix if present
      const base64Data = input.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      buffer = input;
    }
    
    // Process with standard settings for screenshots
    return this.processImage(buffer, {
      quality: 85,
      maxWidth: 1920,
      maxHeight: 1080
    });
  }

  /**
   * Process photo upload (handles HEIC and other formats)
   */
  async processPhoto(input: Buffer, originalName?: string): Promise<ProcessedImage> {
    // Detect format from buffer
    const detectedFormat = await this.detectFormat(input);
    
    console.log(`Processing photo: ${originalName}, detected format: ${detectedFormat}`);
    
    // Process with higher quality for photos
    return this.processImage(input, {
      quality: 92,
      maxWidth: 4096,
      maxHeight: 4096
    });
  }

  /**
   * Validate if buffer is a valid image
   */
  async isValidImage(buffer: Buffer): Promise<boolean> {
    try {
      const metadata = await sharp(buffer).metadata();
      return !!metadata.format;
    } catch {
      return false;
    }
  }

  /**
   * Get image dimensions without processing
   */
  async getImageDimensions(buffer: Buffer): Promise<{ width?: number; height?: number }> {
    try {
      const metadata = await sharp(buffer).metadata();
      return {
        width: metadata.width,
        height: metadata.height
      };
    } catch {
      return {};
    }
  }

  /**
   * Create a properly named file with extension
   */
  createFileName(baseName: string, extension: string = 'jpg'): string {
    // Remove any existing extension
    const nameWithoutExt = baseName.replace(/\.[^/.]+$/, '');
    // Sanitize filename
    const sanitized = nameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, '_');
    // Add timestamp for uniqueness
    const timestamp = Date.now();
    return `${timestamp}_${sanitized}.${extension}`;
  }

  /**
   * Create thumbnail filename
   */
  createThumbnailName(originalName: string): string {
    // Remove extension if present
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    return `thumb_${nameWithoutExt}.jpg`;
  }
}

// Export singleton instance
export const imageProcessor = new ImageProcessor();