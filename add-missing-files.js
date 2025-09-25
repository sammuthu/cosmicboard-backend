const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();

async function addMissingFiles() {
  const projectId = 'cmfgwu1qz0001m6knbhq19qbh';
  const userId = '6b0a6f4f-002f-40cb-babe-95908a565f45'; // Get from existing records

  const missingFiles = [
    {
      id: '524b4d33-5472-4046-a36b-d2517db54cac',
      name: '1757374219165_CLAUDE.md',
      s3Key: 'pdf/cmfgwu1qz0001m6knbhq19qbh/524b4d33-5472-4046-a36b-d2517db54cac/1757374219165_CLAUDE.md'
    },
    {
      id: 'ce1fd183-e2ee-4ae9-bdde-285b2a3c57dc',
      name: '1757374200183_web-mobile-sync-guide.txt',
      s3Key: 'pdf/cmfgwu1qz0001m6knbhq19qbh/ce1fd183-e2ee-4ae9-bdde-285b2a3c57dc/1757374200183_web-mobile-sync-guide.txt'
    },
    {
      id: 'ec1f44ef-d2ae-4fe5-a364-0dbffeaaf04e',
      name: '1757156771483_Sam_Muthu_Updated_One_Pager.pdf',
      s3Key: 'pdf/cmfgwu1qz0001m6knbhq19qbh/ec1f44ef-d2ae-4fe5-a364-0dbffeaaf04e/1757156771483_Sam_Muthu_Updated_One_Pager.pdf'
    },
    {
      id: 'f6d16c49-deea-4e19-8ae4-94b54ed49c4b',
      name: '1757374207030_package.json',
      s3Key: 'pdf/cmfgwu1qz0001m6knbhq19qbh/f6d16c49-deea-4e19-8ae4-94b54ed49c4b/1757374207030_package.json'
    },
    {
      id: 'fdd93b9e-df6b-4548-b200-cd717bbc8cb6',
      name: '1757374213086_tsconfig.json',
      s3Key: 'pdf/cmfgwu1qz0001m6knbhq19qbh/fdd93b9e-df6b-4548-b200-cd717bbc8cb6/1757374213086_tsconfig.json'
    }
  ];

  for (const file of missingFiles) {
    const extension = path.extname(file.name).slice(1).toLowerCase();
    const isPdf = extension === 'pdf';

    try {
      await prisma.media.create({
        data: {
          id: file.id,
          projectId,
          userId,
          type: isPdf ? 'PDF' : 'DOCUMENT',
          name: file.name,
          url: `http://localhost:4566/cosmicspace-media/${file.s3Key}`,
          size: 0, // We don't have the size, but it will still work
          mimeType: getMimeType(extension),
          metadata: {
            s3Key: file.s3Key,
            extension: extension || 'unknown',
            originalName: file.name,
            uploadedAt: new Date().toISOString(),
            restoredFromS3: true
          }
        }
      });
      console.log(`✅ Added: ${file.name}`);
    } catch (error) {
      console.error(`❌ Failed to add ${file.name}:`, error.message);
    }
  }

  console.log('\n✅ Done!');
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

addMissingFiles();