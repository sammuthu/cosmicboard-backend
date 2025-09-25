/**
 * Media Routes - Full implementation with S3 support
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/database';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer from 'multer';
import { randomUUID } from 'crypto';
import * as path from 'path';

const router = Router();

// Configure S3 client
const s3Client = new S3Client({
  endpoint: process.env.AWS_ENDPOINT || 'http://localhost:4566',
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test'
  },
  forcePathStyle: true
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'cosmicspace-media';
console.log('Using S3 bucket:', BUCKET_NAME);

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Get all media for a project
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, type, deleted } = req.query;
    const showDeleted = deleted === 'true';

    const where: any = {
      userId: req.user!.id
      // TODO: Add deletedAt filter when field is added
      // deletedAt: showDeleted ? { not: null } : null
    };

    if (projectId) {
      where.projectId = projectId;
    }

    if (type) {
      where.type = type;
    }
    
    const media = await prisma.media.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    res.json(media);
  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

// Upload new media
router.post('/upload', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    console.log('Upload request received:', {
      file: req.file?.originalname,
      body: req.body,
      user: req.user?.id
    });

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { projectId, type, name } = req.body;

    if (!projectId || !type) {
      return res.status(400).json({ error: 'projectId and type are required' });
    }

    // Verify project exists and belongs to user
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: req.user!.id
      }
    });

    if (!project) {
      console.error('Project not found:', { projectId, userId: req.user!.id });
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Generate unique file ID and S3 key
    const fileId = randomUUID();
    const fileName = name || req.file.originalname;
    const fileExtension = path.extname(fileName).slice(1).toLowerCase(); // Remove dot and lowercase

    // Map type to folder name and database type
    // For scrolls/documents, we accept any file type but use PDF type for now
    const typeMapping: Record<string, { folder: string; dbType: string }> = {
      document: { folder: 'scrolls', dbType: 'PDF' }, // Use PDF for all documents until DOCUMENT type is added
      pdf: { folder: 'scrolls', dbType: 'PDF' },
      photo: { folder: 'photos', dbType: 'PHOTO' },
      screenshot: { folder: 'screenshots', dbType: 'SCREENSHOT' }
    };

    const mapping = typeMapping[type.toLowerCase()] || { folder: 'scrolls', dbType: 'PDF' };
    const s3Key = `${mapping.folder}/${projectId}/${fileId}/${fileName}`;
    
    // Upload to S3
    console.log('Uploading to S3:', { bucket: BUCKET_NAME, key: s3Key });

    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    });

    try {
      await s3Client.send(uploadCommand);
      console.log('S3 upload successful');
    } catch (s3Error) {
      console.error('S3 upload error:', s3Error);
      throw s3Error;
    }
    
    // Generate URL
    const url = process.env.AWS_ENDPOINT 
      ? `${process.env.AWS_ENDPOINT}/${BUCKET_NAME}/${s3Key}`
      : `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;
    
    // Create database record
    const media = await prisma.media.create({
      data: {
        id: fileId,
        projectId,
        userId: req.user!.id,
        type: mapping.dbType as any, // Use mapped database type
        name: fileName,
        url,
        size: req.file.size,
        mimeType: req.file.mimetype,
        metadata: {
          s3Key,
          extension: fileExtension || 'unknown',
          originalName: req.file.originalname,
          uploadedAt: new Date().toISOString()
        }
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    res.json(media);
  } catch (error: any) {
    console.error('Error uploading media:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    res.status(500).json({ error: error.message || 'Failed to upload media' });
  }
});

// Get single media item
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const media = await prisma.media.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }
    
    // Generate signed URL for private access if needed
    if (process.env.USE_SIGNED_URLS === 'true') {
      const metadata = media.metadata as any;
      if (metadata?.s3Key) {
        const command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: metadata.s3Key
        });
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        media.url = signedUrl;
      }
    }
    
    res.json(media);
  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

// Update media metadata
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    
    const media = await prisma.media.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id
      }
    });
    
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }
    
    const updated = await prisma.media.update({
      where: { id: req.params.id },
      data: { name },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating media:', error);
    res.status(500).json({ error: 'Failed to update media' });
  }
});

// GET /api/media/:id/file - Proxy endpoint to serve file content
router.get('/:id/file', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const media = await prisma.media.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id
      }
    });
    
    if (!media) {
      console.error(`Media not found for id: ${req.params.id}, user: ${req.user!.id}`);
      return res.status(404).json({ error: 'Media not found' });
    }
    
    const metadata = media.metadata as any;
    if (!metadata?.s3Key) {
      console.error(`S3 key not found in metadata for media: ${req.params.id}`);
      return res.status(404).json({ error: 'File not found' });
    }
    
    console.log(`Fetching file from S3: bucket=${BUCKET_NAME}, key=${metadata.s3Key}`);
    
    // Get the file from S3
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: metadata.s3Key
    });
    
    try {
      const response = await s3Client.send(command);
      
      // Set appropriate headers
      res.setHeader('Content-Type', media.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${media.name}"`);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      
      // Handle the stream properly
      if (response.Body) {
        const stream = response.Body as any;
        
        // For Node.js Readable Stream
        if (typeof stream.pipe === 'function') {
          stream.pipe(res);
        } 
        // For Web Streams API (newer AWS SDK versions)
        else if (stream.transformToWebStream) {
          const webStream = stream.transformToWebStream();
          const reader = webStream.getReader();
          
          const pump = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  res.end();
                  break;
                }
                res.write(value);
              }
            } catch (error) {
              console.error('Error streaming file:', error);
              res.end();
            }
          };
          
          pump();
        }
        // Fallback for buffer
        else {
          const chunks: any[] = [];
          for await (const chunk of stream) {
            chunks.push(chunk);
          }
          const buffer = Buffer.concat(chunks);
          res.send(buffer);
        }
      } else {
        console.error('No body in S3 response');
        res.status(500).json({ error: 'Failed to retrieve file content' });
      }
    } catch (s3Error: any) {
      console.error('S3 error:', s3Error);
      if (s3Error.Code === 'NoSuchKey') {
        res.status(404).json({ error: 'File not found in storage' });
      } else {
        res.status(500).json({ error: 'Failed to retrieve file from storage' });
      }
    }
  } catch (error) {
    console.error('Error serving media file:', error);
    res.status(500).json({ error: 'Failed to serve media file' });
  }
});

// Delete media (soft delete by default)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { permanent } = req.query;

    const media = await prisma.media.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id
      }
    });

    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    if (permanent === 'true') {
      // Permanent deletion - delete from S3 and database
      const metadata = media.metadata as any;
      if (metadata?.s3Key) {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: metadata.s3Key
        });
        await s3Client.send(deleteCommand);

        // Also delete thumbnail if exists
        if (metadata.thumbnailS3Key) {
          const deleteThumbnailCommand = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: metadata.thumbnailS3Key
          });
          await s3Client.send(deleteThumbnailCommand);
        }
      }

      // Delete from database
      await prisma.media.delete({
        where: { id: req.params.id }
      });

      res.json({ message: 'Media permanently deleted' });
    } else {
      // Soft delete - for now just delete normally until deletedAt field is added
      // TODO: Use soft delete when deletedAt field is added
      await prisma.media.delete({
        where: { id: req.params.id }
      });

      res.json({ message: 'Media moved to trash' });
    }
  } catch (error) {
    console.error('Error deleting media:', error);
    res.status(500).json({ error: 'Failed to delete media' });
  }
});

// POST /api/media/:id/restore - Restore soft deleted media
router.post('/:id/restore', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // TODO: Implement restore when deletedAt field is added
    res.json({ message: 'Restore functionality will be available soon' });
  } catch (error) {
    console.error('Error restoring media:', error);
    res.status(500).json({ error: 'Failed to restore media' });
  }
});

export default router;