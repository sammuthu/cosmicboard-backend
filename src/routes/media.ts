/**
 * Media Routes - Handles photos, screenshots, and PDFs
 */

import { Router, Request, Response } from 'express';
import formidable from 'formidable';
import * as fs from 'fs';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import { prisma } from '../server';
import { storageService, FileInfo } from '../services/storage';
import { config } from '../config/environment';

const router = Router();

// Configure formidable for file uploads
const uploadOptions = {
  maxFileSize: config.storage.maxFileSize,
  keepExtensions: true,
  allowEmptyFiles: false,
};

/**
 * POST /api/media/upload
 * Upload media files (photos, screenshots, PDFs)
 */
router.post('/upload', async (req: Request, res: Response) => {
  try {
    const form = formidable(uploadOptions);
    
    const [fields, files] = await form.parse(req);
    
    // Extract form data
    const projectId = Array.isArray(fields.projectId) ? fields.projectId[0] : fields.projectId;
    const type = Array.isArray(fields.type) ? fields.type[0] : fields.type;
    const name = Array.isArray(fields.name) ? fields.name[0] : fields.name;
    
    if (!projectId || !type) {
      return res.status(400).json({ error: 'projectId and type are required' });
    }
    
    if (!['photo', 'screenshot', 'pdf'].includes(type)) {
      return res.status(400).json({ error: 'type must be one of: photo, screenshot, pdf' });
    }
    
    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Get uploaded file
    const fileArray = Array.isArray(files.file) ? files.file : [files.file];
    const file = fileArray.find(f => f !== undefined);
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Read file buffer
    const buffer = fs.readFileSync(file.filepath);
    
    // Create FileInfo object
    const fileInfo: FileInfo = {
      buffer,
      originalName: file.originalFilename || `upload_${Date.now()}`,
      mimeType: file.mimetype || 'application/octet-stream',
      size: file.size
    };
    
    // Validate file (now accepts all file types)
    const validation = storageService.validateFile(fileInfo);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    // Save file to storage
    const storageResult = await storageService.saveFile(
      projectId,
      type as 'photo' | 'screenshot' | 'pdf',
      fileInfo,
      type !== 'pdf' // Generate thumbnails for images only
    );
    
    // Extract metadata based on file type
    let metadata: any = {};
    const extension = path.extname(fileInfo.originalName).substring(1).toLowerCase();
    
    if (fileInfo.mimeType.startsWith('image/')) {
      // For images, we could use sharp to get dimensions, but it's optional
      metadata = { 
        type: 'image',
        extension,
        isViewable: true 
      };
    } else if (fileInfo.mimeType === 'application/pdf') {
      try {
        const pdfData = await pdfParse(buffer);
        metadata = {
          type: 'document',
          extension: 'pdf',
          pages: pdfData.numpages,
          text: pdfData.text.substring(0, 1000), // Store first 1000 chars for search
          isViewable: true
        };
      } catch (error) {
        console.warn('Failed to parse PDF metadata:', error);
        metadata = { 
          type: 'document',
          extension: 'pdf',
          isViewable: true 
        };
      }
    } else {
      // For other file types, store basic metadata
      const viewableExtensions = ['txt', 'csv', 'md', 'json', 'xml', 'html', 'css', 'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'sql', 'sh', 'yml', 'yaml', 'toml', 'ini', 'cfg', 'conf', 'log'];
      metadata = {
        type: 'document',
        extension,
        isViewable: viewableExtensions.includes(extension),
        mimeType: fileInfo.mimeType
      };
    }
    
    // Save to database
    const media = await prisma.media.create({
      data: {
        projectId,
        type: type as any,
        name: name || fileInfo.originalName,
        originalName: fileInfo.originalName,
        url: storageResult.url,
        thumbnailUrl: storageResult.thumbnailUrl,
        size: storageResult.size,
        mimeType: storageResult.mimeType,
        metadata,
      }
    });
    
    // Clean up temporary file
    fs.unlinkSync(file.filepath);
    
    res.status(201).json(media);
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

/**
 * POST /api/media/screenshot
 * Handle screenshot paste from clipboard
 */
router.post('/screenshot', async (req: Request, res: Response) => {
  try {
    const { projectId, imageData, name } = req.body;
    
    if (!projectId || !imageData) {
      return res.status(400).json({ error: 'projectId and imageData are required' });
    }
    
    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Parse base64 image data
    const matches = imageData.match(/^data:([^;]*);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Invalid image data format' });
    }
    
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Create FileInfo object - storage service will process and convert to JPEG
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = name || `screenshot_${timestamp}`;
    
    const fileInfo: FileInfo = {
      buffer,
      originalName: fileName,
      mimeType: 'image/png', // Default, will be converted to JPEG by storage service
      size: buffer.length
    };
    
    // Validate file
    const validation = storageService.validateFile(fileInfo);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    // Save file to storage
    const storageResult = await storageService.saveFile(
      projectId,
      'screenshot',
      fileInfo,
      true // Generate thumbnail
    );
    
    // Save to database
    const media = await prisma.media.create({
      data: {
        projectId,
        type: 'screenshot',
        name: fileName,
        originalName: fileName,
        url: storageResult.url,
        thumbnailUrl: storageResult.thumbnailUrl,
        size: storageResult.size,
        mimeType: storageResult.mimeType,
        metadata: { type: 'screenshot', source: 'clipboard' },
      }
    });
    
    res.status(201).json(media);
    
  } catch (error) {
    console.error('Screenshot upload error:', error);
    res.status(500).json({ error: 'Failed to save screenshot' });
  }
});

/**
 * GET /api/media
 * List media files with filtering and pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      projectId,
      type,
      page = '1',
      limit = '20'
    } = req.query;
    
    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }
    
    // Build where clause
    const where: any = {
      projectId: projectId as string
    };
    
    if (type && ['photo', 'screenshot', 'pdf'].includes(type as string)) {
      where.type = type;
    }
    
    // Pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;
    
    // Fetch media with pagination
    const [media, total] = await Promise.all([
      prisma.media.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          project: {
            select: { id: true, name: true }
          }
        }
      }),
      prisma.media.count({ where })
    ]);
    
    // Add pagination info to headers
    res.set('X-Total-Count', total.toString());
    res.set('X-Page-Count', Math.ceil(total / limitNum).toString());
    
    res.json(media);
    
  } catch (error) {
    console.error('Media list error:', error);
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

/**
 * GET /api/media/:id
 * Get single media item
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const media = await prisma.media.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true }
        }
      }
    });
    
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }
    
    res.json(media);
    
  } catch (error) {
    console.error('Media get error:', error);
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

/**
 * PUT /api/media/:id
 * Update media item (name, description)
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    const media = await prisma.media.findUnique({
      where: { id }
    });
    
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }
    
    // Update metadata with description if provided
    const updatedMetadata = description 
      ? { ...media.metadata as any, description }
      : media.metadata;
    
    const updatedMedia = await prisma.media.update({
      where: { id },
      data: {
        ...(name && { name }),
        metadata: updatedMetadata
      },
      include: {
        project: {
          select: { id: true, name: true }
        }
      }
    });
    
    res.json(updatedMedia);
    
  } catch (error) {
    console.error('Media update error:', error);
    res.status(500).json({ error: 'Failed to update media' });
  }
});

/**
 * DELETE /api/media/:id
 * Delete media item and associated files
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const media = await prisma.media.findUnique({
      where: { id }
    });
    
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }
    
    // Delete files from storage
    await storageService.deleteFile(media.url, media.thumbnailUrl || undefined);
    
    // Delete from database
    await prisma.media.delete({
      where: { id }
    });
    
    res.json({ message: 'Media deleted successfully' });
    
  } catch (error) {
    console.error('Media delete error:', error);
    res.status(500).json({ error: 'Failed to delete media' });
  }
});

export default router;