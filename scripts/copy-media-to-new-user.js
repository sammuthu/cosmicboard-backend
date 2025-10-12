const { PrismaClient } = require('@prisma/client');
const { S3Client, CopyObjectCommand, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { randomUUID } = require('crypto');

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

async function copyMediaFiles() {
  try {
    console.log('🚀 Starting media copy process...\n');

    // Get new user and project
    const newUser = await prisma.user.findUnique({
      where: { email: 'sammuthu@me.com' },
      include: {
        Project: {
          where: { deletedAt: null },
          take: 1
        }
      }
    });

    if (!newUser || !newUser.Project[0]) {
      console.error('❌ New user or project not found!');
      return;
    }

    const newUserId = newUser.id;
    const newProjectId = newUser.Project[0].id;

    console.log(`✅ New User: ${newUser.email} (${newUserId})`);
    console.log(`✅ New Project: ${newUser.Project[0].name} (${newProjectId})\n`);

    // Get source media files
    const sourceMedia = await prisma.media.findMany({
      where: {
        user: { email: 'nmuthu@gmail.com' },
        deletedAt: null
      },
      take: 5
    });

    console.log(`📦 Found ${sourceMedia.length} media files to copy\n`);

    for (const media of sourceMedia) {
      console.log(`📄 Processing: ${media.name} (${media.type})`);

      const metadata = media.metadata;
      const sourceS3Key = metadata?.s3Key;

      if (!sourceS3Key) {
        console.log(`  ⚠️  No S3 key found, skipping...\n`);
        continue;
      }

      // Generate new S3 key for the new user
      const fileId = randomUUID();
      const typeFolder = media.type.toLowerCase() === 'photo' ? 'photos' :
                        media.type.toLowerCase() === 'screenshot' ? 'screenshots' :
                        'scrolls';

      const newS3Key = `${typeFolder}/${newProjectId}/${fileId}/${media.name}`;

      try {
        // Try to copy the file in S3
        console.log(`  📋 Copying S3 file...`);
        console.log(`     From: ${sourceS3Key}`);
        console.log(`     To: ${newS3Key}`);

        const copyCommand = new CopyObjectCommand({
          Bucket: BUCKET_NAME,
          CopySource: `${BUCKET_NAME}/${sourceS3Key}`,
          Key: newS3Key
        });

        await s3Client.send(copyCommand);
        console.log(`  ✅ S3 file copied successfully`);

        // Create new media record
        const newUrl = `${process.env.AWS_ENDPOINT || 'http://localhost:4566'}/${BUCKET_NAME}/${newS3Key}`;

        const newMedia = await prisma.media.create({
          data: {
            id: fileId,
            projectId: newProjectId,
            userId: newUserId,
            type: media.type,
            visibility: 'PUBLIC',
            name: media.name,
            url: newUrl,
            thumbnailUrl: null,
            size: media.size,
            mimeType: media.mimeType,
            metadata: {
              s3Key: newS3Key,
              extension: metadata?.extension || 'unknown',
              originalName: media.name,
              uploadedAt: new Date().toISOString(),
              copiedFrom: media.id
            }
          }
        });

        console.log(`  ✅ Database record created (ID: ${newMedia.id})`);
        console.log(`  🌐 URL: ${newUrl}\n`);

      } catch (s3Error) {
        console.error(`  ❌ S3 copy failed:`, s3Error.message);
        console.log(`  ℹ️  Creating database record with original URL...\n`);

        // Still create the database record even if S3 copy fails
        await prisma.media.create({
          data: {
            id: randomUUID(),
            projectId: newProjectId,
            userId: newUserId,
            type: media.type,
            visibility: 'PUBLIC',
            name: media.name,
            url: media.url, // Use original URL
            thumbnailUrl: media.thumbnailUrl,
            size: media.size,
            mimeType: media.mimeType,
            metadata: {
              ...metadata,
              copiedFrom: media.id,
              note: 'S3 copy failed, using original URL'
            }
          }
        });
      }
    }

    console.log('\n✨ Media copy process completed!\n');

    // Show summary
    const finalMediaCount = await prisma.media.count({
      where: { userId: newUserId }
    });

    console.log('=== Summary ===');
    console.log(`User: sammuthu@me.com`);
    console.log(`Total media files: ${finalMediaCount}`);
    console.log('===============\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

copyMediaFiles();
