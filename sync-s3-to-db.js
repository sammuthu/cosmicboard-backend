const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();

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

async function syncS3ToDatabase() {
  try {
    console.log('🔄 Syncing S3 files to database...\n');

    // List all objects in the bucket
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME
    });

    const response = await s3Client.send(listCommand);

    if (!response.Contents) {
      console.log('No files found in S3 bucket');
      return;
    }

    console.log(`Found ${response.Contents.length} files in S3`);

    for (const object of response.Contents) {
      if (!object.Key) continue;

      // Parse the S3 key to extract information
      // Expected format: folder/projectId/fileId/filename
      const parts = object.Key.split('/');
      if (parts.length < 4) continue;

      const [folder, projectId, fileId, ...filenameParts] = parts;
      const filename = filenameParts.join('/');

      // Check if this media already exists in the database
      const existingMedia = await prisma.media.findUnique({
        where: { id: fileId }
      });

      if (existingMedia) {
        console.log(`✓ Already in DB: ${filename}`);
        continue;
      }

      // Determine the media type based on folder
      let mediaType = 'DOCUMENT'; // Default to DOCUMENT
      if (folder === 'photos' || folder === 'photo') {
        mediaType = 'PHOTO';
      } else if (folder === 'screenshots' || folder === 'screenshot') {
        mediaType = 'SCREENSHOT';
      } else if (filename.toLowerCase().endsWith('.pdf')) {
        mediaType = 'PDF';
      }

      // Get the project to find the userId
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });

      if (!project) {
        console.log(`⚠️  No project found for: ${filename} (project: ${projectId})`);
        continue;
      }

      // Create the media record
      const url = `${process.env.AWS_ENDPOINT || 'http://localhost:4566'}/${BUCKET_NAME}/${object.Key}`;
      const extension = path.extname(filename).slice(1).toLowerCase();

      try {
        await prisma.media.create({
          data: {
            id: fileId,
            projectId,
            userId: project.userId,
            type: mediaType,
            name: filename,
            url,
            size: object.Size || 0,
            mimeType: getMimeType(extension),
            metadata: {
              s3Key: object.Key,
              extension: extension || 'unknown',
              originalName: filename,
              uploadedAt: object.LastModified ? object.LastModified.toISOString() : new Date().toISOString(),
              syncedFromS3: true
            }
          }
        });

        console.log(`✅ Added to DB: ${filename} (${mediaType})`);
      } catch (error) {
        console.error(`❌ Failed to add ${filename}:`, error.message);
      }
    }

    console.log('\n✅ Sync completed!');

  } catch (error) {
    console.error('Error syncing S3 to database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function getMimeType(extension) {
  const mimeTypes = {
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
    md: 'text/markdown',
    json: 'application/json',

    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',

    // Default
    '': 'application/octet-stream'
  };

  return mimeTypes[extension] || 'application/octet-stream';
}

// Load environment variables
require('dotenv').config();

syncS3ToDatabase();