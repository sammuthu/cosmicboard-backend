const { S3Client, CreateBucketCommand, ListBucketsCommand } = require('@aws-sdk/client-s3');

// Configure S3 client for LocalStack
const s3Client = new S3Client({
  endpoint: 'http://localhost:4566',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test'
  },
  forcePathStyle: true
});

async function setupLocalStack() {
  console.log('🚀 Setting up LocalStack for CosmicSpace...\n');
  
  try {
    // List existing buckets
    console.log('📋 Checking existing buckets...');
    const listCommand = new ListBucketsCommand({});
    const listResponse = await s3Client.send(listCommand);
    console.log('Existing buckets:', listResponse.Buckets?.map(b => b.Name) || []);
    
    // Check if bucket exists
    const bucketName = 'cosmicspace-media';
    const bucketExists = listResponse.Buckets?.some(bucket => bucket.Name === bucketName);
    
    if (!bucketExists) {
      // Create the bucket
      console.log(`\n🪣 Creating S3 bucket: ${bucketName}`);
      const createCommand = new CreateBucketCommand({
        Bucket: bucketName,
        CreateBucketConfiguration: {
          LocationConstraint: 'us-east-1'
        }
      });
      
      await s3Client.send(createCommand);
      console.log(`✅ Successfully created bucket: ${bucketName}`);
    } else {
      console.log(`✅ Bucket already exists: ${bucketName}`);
    }
    
    // List buckets again to confirm
    console.log('\n📋 Final bucket list:');
    const finalListResponse = await s3Client.send(listCommand);
    finalListResponse.Buckets?.forEach(bucket => {
      console.log(`  - ${bucket.Name} (created: ${bucket.CreationDate})`);
    });
    
    console.log('\n🎉 LocalStack setup complete!');
    console.log('🔗 LocalStack S3 endpoint: http://localhost:4566');
    console.log('🪣 Media bucket: cosmicspace-media');
    
  } catch (error) {
    console.error('❌ Error setting up LocalStack:', error.message);
    process.exit(1);
  }
}

setupLocalStack();