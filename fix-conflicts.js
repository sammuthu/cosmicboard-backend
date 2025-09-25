const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');
const { S3Client, CopyObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

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

const BUCKET_NAME = 'cosmicspace-media';

async function fixConflicts() {
  const targetProject = 'cmfgwu1qz0001m6knbhq19qbh';
  const userId = '6b0a6f4f-002f-40cb-babe-95908a565f45';

  // Files that need to be fixed (currently assigned to wrong project)
  const filesToFix = [
    {
      oldId: '524b4d33-5472-4046-a36b-d2517db54cac',
      name: '1757374219165_CLAUDE.md',
      oldS3Key: 'pdf/cmfgwu1qz0001m6knbhq19qbh/524b4d33-5472-4046-a36b-d2517db54cac/1757374219165_CLAUDE.md'
    },
    {
      oldId: 'ce1fd183-e2ee-4ae9-bdde-285b2a3c57dc',
      name: '1757374200183_web-mobile-sync-guide.txt',
      oldS3Key: 'pdf/cmfgwu1qz0001m6knbhq19qbh/ce1fd183-e2ee-4ae9-bdde-285b2a3c57dc/1757374200183_web-mobile-sync-guide.txt'
    },
    {
      oldId: 'ec1f44ef-d2ae-4fe5-a364-0dbffeaaf04e',
      name: '1757156771483_Sam_Muthu_Updated_One_Pager.pdf',
      oldS3Key: 'pdf/cmfgwu1qz0001m6knbhq19qbh/ec1f44ef-d2ae-4fe5-a364-0dbffeaaf04e/1757156771483_Sam_Muthu_Updated_One_Pager.pdf'
    },
    {
      oldId: 'f6d16c49-deea-4e19-8ae4-94b54ed49c4b',
      name: '1757374207030_package.json',
      oldS3Key: 'pdf/cmfgwu1qz0001m6knbhq19qbh/f6d16c49-deea-4e19-8ae4-94b54ed49c4b/1757374207030_package.json'
    },
    {
      oldId: 'fdd93b9e-df6b-4548-b200-cd717bbc8cb6',
      name: '1757374213086_tsconfig.json',
      oldS3Key: 'pdf/cmfgwu1qz0001m6knbhq19qbh/fdd93b9e-df6b-4548-b200-cd717bbc8cb6/1757374213086_tsconfig.json'
    }
  ];

  console.log('🔧 Fixing file conflicts for project:', targetProject);
  console.log('=' + '='.repeat(60));

  for (const file of filesToFix) {
    console.log('\nProcessing:', file.name);

    try {
      // Generate new ID for this file
      const newId = randomUUID();
      const newS3Key = file.oldS3Key.replace(file.oldId, newId);

      // Copy the S3 object to new location
      console.log('  📦 Copying S3 object to new key...');
      await s3Client.send(new CopyObjectCommand({
        Bucket: BUCKET_NAME,
        CopySource: `${BUCKET_NAME}/${file.oldS3Key}`,
        Key: newS3Key
      }));

      // Create new database entry
      console.log('  💾 Creating new database entry...');
      const extension = file.name.split('.').pop().toLowerCase();
      const isPdf = extension === 'pdf';

      await prisma.media.create({
        data: {
          id: newId,
          projectId: targetProject,
          userId: userId,
          type: isPdf ? 'PDF' : 'DOCUMENT',
          name: file.name,
          url: `http://localhost:4566/${BUCKET_NAME}/${newS3Key}`,
          size: 0, // We don't have the exact size but it doesn't matter for display
          mimeType: getMimeType(extension),
          metadata: {
            s3Key: newS3Key,
            extension: extension || 'unknown',
            originalName: file.name,
            uploadedAt: new Date().toISOString(),
            fixed: true,
            oldId: file.oldId
          }
        }
      });

      // Delete the old S3 object (cleanup)
      console.log('  🗑️  Deleting old S3 object...');
      await s3Client.send(new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: file.oldS3Key
      }));

      console.log('  ✅ Fixed:', file.name);
      console.log('     Old ID:', file.oldId);
      console.log('     New ID:', newId);

    } catch (error) {
      console.error('  ❌ Failed to fix:', file.name);
      console.error('     Error:', error.message);
    }
  }

  console.log('\n✅ Conflict resolution complete!');
  await prisma.$disconnect();
}

function getMimeType(extension) {
  const mimeTypes = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
    md: 'text/markdown',
    json: 'application/json',
    '': 'application/octet-stream'
  };

  return mimeTypes[extension] || 'application/octet-stream';
}

fixConflicts();