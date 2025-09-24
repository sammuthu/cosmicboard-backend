const { S3Client, CreateBucketCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  endpoint: 'http://localhost:4566',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test'
  },
  forcePathStyle: true
});

async function ensureBucket() {
  const bucketName = 'cosmicspace-media';
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    console.log('✅ Bucket exists:', bucketName);
  } catch (error) {
    if (error.name === 'NotFound' || (error.$metadata && error.$metadata.httpStatusCode === 404)) {
      console.log('Creating bucket:', bucketName);
      try {
        await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
        console.log('✅ Bucket created successfully');
      } catch (createError) {
        console.error('Error creating bucket:', createError);
      }
    } else {
      console.error('Error checking bucket:', error);
    }
  }
}

ensureBucket();