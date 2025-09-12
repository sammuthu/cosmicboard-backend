#!/usr/bin/env npx tsx
import dotenv from 'dotenv';

// Load LocalStack environment
dotenv.config({ path: '.env.localstack' });

console.log('🔍 S3 Configuration Debug\n');
console.log('Environment Variables:');
console.log('  AWS_ENDPOINT:', process.env.AWS_ENDPOINT);
console.log('  AWS_S3_ENDPOINT:', process.env.AWS_S3_ENDPOINT);
console.log('  AWS_REGION:', process.env.AWS_REGION);
console.log('  AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID);
console.log('  AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '***' : 'not set');
console.log('  AWS_S3_BUCKET:', process.env.AWS_S3_BUCKET);
console.log('  AWS_S3_FORCE_PATH_STYLE:', process.env.AWS_S3_FORCE_PATH_STYLE);

// Now let's check the S3 client configuration
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';

const s3Config: any = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  } : undefined,
};

// For LocalStack development
if (process.env.AWS_S3_ENDPOINT || process.env.AWS_ENDPOINT) {
  s3Config.endpoint = process.env.AWS_S3_ENDPOINT || process.env.AWS_ENDPOINT;
  s3Config.forcePathStyle = true;
}

console.log('\nS3 Client Configuration:');
console.log('  endpoint:', s3Config.endpoint);
console.log('  region:', s3Config.region);
console.log('  forcePathStyle:', s3Config.forcePathStyle);
console.log('  credentials:', s3Config.credentials ? 'configured' : 'not configured');

const s3Client = new S3Client(s3Config);

// Try to list buckets
async function testConnection() {
  try {
    console.log('\n🧪 Testing S3 Connection...');
    const command = new ListBucketsCommand({});
    const result = await s3Client.send(command);
    console.log('✅ Connection successful!');
    console.log('Buckets:', result.Buckets?.map(b => b.Name).join(', '));
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error details:', {
      code: error.Code,
      statusCode: error.$metadata?.httpStatusCode,
      requestId: error.$metadata?.requestId,
    });
  }
}

testConnection();