import { S3Client, PutObjectCommand, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

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

async function ensureBucket() {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
    console.log('✓ Bucket exists');
  } catch {
    console.log('Creating bucket...');
    await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
    console.log('✓ Bucket created');
  }
}

async function uploadFile(localPath: string, s3Key: string, contentType: string) {
  const fileContent = fs.readFileSync(localPath);
  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: fileContent,
    ContentType: contentType
  }));
  console.log('✓ Uploaded:', s3Key);
}

async function recoverMedia() {
  await ensureBucket();
  
  const allMedia = await prisma.media.findMany();
  console.log('\nFound', allMedia.length, 'media records in database\n');
  
  let recovered = 0;
  let missing = 0;
  const missingFiles: any[] = [];
  
  for (const media of allMedia) {
    const urlParts = media.url.split('/');
    const s3Key = urlParts.slice(4).join('/');
    
    const projectId = media.projectId;
    const typeFolder = media.type.toLowerCase();
    
    const uploadsDir = path.join(__dirname, '..', 'uploads', typeFolder);
    
    let found = false;
    if (fs.existsSync(uploadsDir)) {
      const projectDirs = fs.readdirSync(uploadsDir);
      
      for (const projDir of projectDirs) {
        const originalsDir = path.join(uploadsDir, projDir, 'originals');
        if (fs.existsSync(originalsDir)) {
          const files = fs.readdirSync(originalsDir);
          const matchingFile = files.find(f => f.includes(media.name) || media.name.includes(f));
          
          if (matchingFile) {
            const localPath = path.join(originalsDir, matchingFile);
            await uploadFile(localPath, s3Key, media.mimeType);
            
            if (media.thumbnailUrl) {
              const thumbKey = media.thumbnailUrl.split('/').slice(4).join('/');
              const thumbDir = path.join(uploadsDir, projDir, 'thumbnails');
              if (fs.existsSync(thumbDir)) {
                const thumbFiles = fs.readdirSync(thumbDir);
                const thumbFile = thumbFiles.find(f => f.includes('thumb'));
                if (thumbFile) {
                  await uploadFile(path.join(thumbDir, thumbFile), thumbKey, media.mimeType);
                }
              }
            }
            
            recovered++;
            found = true;
            break;
          }
        }
      }
    }
    
    if (!found) {
      missing++;
      missingFiles.push({
        id: media.id,
        name: media.name,
        type: media.type
      });
    }
  }
  
  console.log('\n=== Recovery Summary ===');
  console.log('✓ Recovered:', recovered, 'files');
  console.log('✗ Missing:', missing, 'files');
  
  if (missingFiles.length > 0) {
    console.log('\nMissing files:');
    missingFiles.forEach(f => {
      console.log('  -', f.name, '(' + f.type + ')');
    });
    console.log('\n⚠️  These files were only in LocalStack S3 and are permanently lost.');
  }
}

recoverMedia()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
