/**
 * Media Routes - Full implementation with S3 support
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/database';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer from 'multer';
import * as crypto from 'crypto';

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

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Get all media for a project
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, type } = req.query;
    
    const where: any = {
      userId: req.user!.id
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
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Generate unique file ID and S3 key
    const fileId = crypto.randomUUID();
    const fileName = name || req.file.originalname;
    const s3Key = `${type.toLowerCase()}/${projectId}/${fileId}/${fileName}`;
    
    // Upload to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    });
    
    await s3Client.send(uploadCommand);
    
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
        type: type.toUpperCase(),
        name: fileName,
        url,
        size: req.file.size,
        mimeType: req.file.mimetype,
        metadata: {
          s3Key,
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
  } catch (error) {
    console.error('Error uploading media:', error);
    res.status(500).json({ error: 'Failed to upload media' });
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

// Delete media
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const media = await prisma.media.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id
      }
    });
    
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }
    
    // Delete from S3
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
    
    res.json({ message: 'Media deleted successfully' });
  } catch (error) {
    console.error('Error deleting media:', error);
    res.status(500).json({ error: 'Failed to delete media' });
  }
});

export default router;