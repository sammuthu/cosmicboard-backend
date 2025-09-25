const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const s3Client = new S3Client({
  endpoint: 'http://localhost:4566',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test'
  },
  forcePathStyle: true
});

async function checkMissingFiles() {
  const projectId = 'cmfgwu1qz0001m6knbhq19qbh';
  const BUCKET_NAME = 'cosmicspace-media';

  try {
    // List all S3 objects for this project
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `pdf/${projectId}/`
    });

    const scrollsCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `scrolls/${projectId}/`
    });

    const [pdfResponse, scrollsResponse] = await Promise.all([
      s3Client.send(listCommand),
      s3Client.send(scrollsCommand)
    ]);

    const s3Files = [];
    if (pdfResponse.Contents) {
      s3Files.push(...pdfResponse.Contents.map(f => f.Key));
    }
    if (scrollsResponse.Contents) {
      s3Files.push(...scrollsResponse.Contents.map(f => f.Key));
    }

    console.log(`\n📦 S3 files for project ${projectId}:`);
    console.log('Found', s3Files.length, 'files in S3\n');

    // Get all database records for this project
    const dbRecords = await prisma.media.findMany({
      where: { projectId },
      select: { id: true, name: true, type: true, metadata: true }
    });

    console.log(`💾 Database records: ${dbRecords.length} items\n`);

    // Check each S3 file
    for (const s3Key of s3Files) {
      const parts = s3Key.split('/');
      if (parts.length >= 4) {
        const [folder, , fileId, ...filenameParts] = parts;
        const filename = filenameParts.join('/');

        const inDb = dbRecords.some(r => r.id === fileId);

        if (!inDb) {
          console.log(`❌ Missing in DB: ${filename}`);
          console.log(`   S3 Key: ${s3Key}`);
          console.log(`   File ID: ${fileId}\n`);
        } else {
          console.log(`✅ In DB: ${filename}`);
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMissingFiles();