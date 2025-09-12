const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  endpoint: 'http://localhost:4566',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test'
  },
  forcePathStyle: true
});

const corsConfiguration = {
  CORSRules: [
    {
      AllowedOrigins: [
        'http://localhost:7777',
        'http://localhost:3000',
        'http://cosmicspace.app',
        'https://cosmicspace.app',
        'http://cosmic.board',
        'https://cosmic.board'
      ],
      AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
      AllowedHeaders: ['*'],
      ExposeHeaders: ['ETag', 'Content-Length', 'x-amz-request-id'],
      MaxAgeSeconds: 3000
    }
  ]
};

async function setupCORS() {
  try {
    const command = new PutBucketCorsCommand({
      Bucket: 'cosmicspace-media',
      CORSConfiguration: corsConfiguration
    });
    
    await s3Client.send(command);
    console.log('✅ CORS configuration applied successfully to cosmicspace-media bucket');
  } catch (error) {
    console.error('❌ Error applying CORS configuration:', error);
  }
}

setupCORS();