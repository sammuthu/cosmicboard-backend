#!/usr/bin/env ts-node

/**
 * Script to migrate existing local media files to S3 and create database records
 * Run with: npx ts-node scripts/migrate-media-to-s3.ts
 */

import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Configure S3 client for LocalStack
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
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

interface FileInfo {
  type: 'photo' | 'screenshot' | 'pdf';
  projectId: string;
  originalPath: string;
  thumbnailPath?: string;
  filename: string;
}

async function getAllFiles(): Promise<FileInfo[]> {
  const files: FileInfo[] = [];
  
  // Scan each type directory
  const types = ['photo', 'screenshot', 'pdf'];
  
  for (const type of types) {
    const typeDir = path.join(UPLOADS_DIR, type);
    if (!fs.existsSync(typeDir)) continue;
    
    // List all project directories
    const projectDirs = fs.readdirSync(typeDir);
    
    for (const projectId of projectDirs) {
      const projectDir = path.join(typeDir, projectId);
      const originalsDir = path.join(projectDir, 'originals');
      const thumbnailsDir = path.join(projectDir, 'thumbnails');
      
      if (fs.existsSync(originalsDir)) {
        const originalFiles = fs.readdirSync(originalsDir);
        
        for (const filename of originalFiles) {
          const fileInfo: FileInfo = {
            type: type as 'photo' | 'screenshot' | 'pdf',
            projectId,
            originalPath: path.join(originalsDir, filename),
            filename
          };
          
          // Check for thumbnail
          const thumbnailPath = path.join(thumbnailsDir, `thumb_${filename}`);
          if (fs.existsSync(thumbnailPath)) {
            fileInfo.thumbnailPath = thumbnailPath;
          }
          
          files.push(fileInfo);
        }
      }
    }
  }
  
  return files;
}

async function uploadToS3(filePath: string, key: string, contentType: string): Promise<string> {
  const fileContent = fs.readFileSync(filePath);
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileContent,
    ContentType: contentType
  });
  
  await s3Client.send(command);
  
  // Return the S3 URL
  if (process.env.AWS_ENDPOINT) {
    return `${process.env.AWS_ENDPOINT}/${BUCKET_NAME}/${key}`;
  }
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
}

function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const contentTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf'
  };
  return contentTypes[ext] || 'application/octet-stream';
}

async function ensureBucketExists() {
  try {
    // Check if bucket exists
    await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
    console.log(`✅ S3 bucket ${BUCKET_NAME} already exists`);
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      // Create bucket if it doesn't exist
      console.log(`📦 Creating S3 bucket: ${BUCKET_NAME}`);
      await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
      console.log(`✅ S3 bucket ${BUCKET_NAME} created successfully`);
    } else {
      throw error;
    }
  }
}

async function migrateMedia() {
  console.log('🚀 Starting media migration to S3...\n');
  
  try {
    // Ensure S3 bucket exists
    await ensureBucketExists();
    
    // Get the user (we'll use the existing user nmuthu@gmail.com)
    const user = await prisma.user.findUnique({
      where: { email: 'nmuthu@gmail.com' }
    });
    
    if (!user) {
      console.error('❌ User nmuthu@gmail.com not found. Please ensure user exists.');
      return;
    }
    
    console.log(`✅ Found user: ${user.email} (${user.id})\n`);
    
    // Get a default project to use for migration
    const defaultProject = await prisma.project.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' }
    });
    
    if (!defaultProject) {
      console.error('❌ No projects found for user. Creating a default project for media.');
      const newProject = await prisma.project.create({
        data: {
          name: 'Media Archive',
          description: 'Migrated media files',
          userId: user.id
        }
      });
      console.log(`✅ Created project: ${newProject.name} (${newProject.id})\n`);
    } else {
      console.log(`✅ Using project: ${defaultProject.name} (${defaultProject.id})\n`);
    }
    
    // Get the project ID to use
    const projectToUse = defaultProject || (await prisma.project.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' }
    }));
    
    if (!projectToUse) {
      console.error('❌ No project available for migration.');
      return;
    }
    
    // Get all files
    const files = await getAllFiles();
    console.log(`📁 Found ${files.length} files to migrate\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const file of files) {
      try {
        console.log(`📤 Processing: ${file.filename}`);
        
        // Generate S3 keys - use the actual project ID for organization
        const fileId = crypto.randomUUID();
        const originalKey = `${file.type}/${projectToUse.id}/${fileId}/${file.filename}`;
        let thumbnailKey: string | undefined;
        let thumbnailUrl: string | undefined;
        
        // Upload original file
        const url = await uploadToS3(
          file.originalPath,
          originalKey,
          getContentType(file.filename)
        );
        
        // Upload thumbnail if exists
        if (file.thumbnailPath) {
          thumbnailKey = `${file.type}/${projectToUse.id}/${fileId}/thumb_${file.filename}`;
          thumbnailUrl = await uploadToS3(
            file.thumbnailPath,
            thumbnailKey,
            getContentType(file.filename)
          );
        }
        
        // Get file stats
        const stats = fs.statSync(file.originalPath);
        
        // Extract clean name from filename (remove timestamp prefix if present)
        const cleanName = file.filename.replace(/^\d+_/, '');
        
        // Create Media record in database
        await prisma.media.create({
          data: {
            id: fileId,
            projectId: projectToUse.id,  // Use the actual project ID
            userId: user.id,
            type: file.type.toUpperCase() as 'PHOTO' | 'SCREENSHOT' | 'PDF',
            name: cleanName,
            url,
            thumbnailUrl,
            size: stats.size,
            mimeType: getContentType(file.filename),
            metadata: {
              originalPath: file.originalPath,
              originalProjectId: file.projectId,  // Store the original project ID for reference
              s3Key: originalKey,
              thumbnailS3Key: thumbnailKey,
              migratedAt: new Date().toISOString()
            }
          }
        });
        
        console.log(`✅ Migrated: ${file.filename} -> ${originalKey}`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Failed to migrate ${file.filename}:`, error);
        errorCount++;
      }
    }
    
    console.log('\n===========================================');
    console.log('📊 Migration Summary');
    console.log('===========================================');
    console.log(`✅ Successfully migrated: ${successCount} files`);
    console.log(`❌ Failed: ${errorCount} files`);
    console.log(`📁 Total processed: ${files.length} files`);
    console.log('===========================================\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateMedia().catch(console.error);