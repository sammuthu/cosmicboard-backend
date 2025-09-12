#!/usr/bin/env npx tsx
import { S3Service } from '../src/services/aws/s3.service';
import fs from 'fs';
import path from 'path';
import { Buffer } from 'buffer';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.localstack' });

async function testS3Operations() {
  console.log('🧪 Testing S3 Operations with LocalStack\n');
  
  const s3Service = new S3Service();
  
  try {
    // Test 1: Upload text file
    console.log('1️⃣ Testing text file upload...');
    const textContent = Buffer.from('Hello from CosmicBoard S3 Test!');
    const textKey = 'test/hello.txt';
    
    const uploadResult = await s3Service.uploadFile(
      textKey,
      textContent,
      'text/plain'
    );
    console.log('✅ Text file uploaded:', uploadResult.url);
    
    // Test 2: Upload image file (create a test image)
    console.log('\n2️⃣ Testing image file upload...');
    const imageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG header
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    ]);
    const imageKey = 'test/sample.png';
    
    const imageUploadResult = await s3Service.uploadFile(
      imageKey,
      imageBuffer,
      'image/png'
    );
    console.log('✅ Image file uploaded:', imageUploadResult.url);
    
    // Test 3: Generate presigned URL for download
    console.log('\n3️⃣ Testing presigned URL generation...');
    const presignedUrl = await s3Service.getDownloadUrl(textKey);
    console.log('✅ Presigned URL generated:', presignedUrl);
    
    // Test 4: Download file
    console.log('\n4️⃣ Testing file download...');
    const downloadedFile = await s3Service.downloadFile(textKey);
    const downloadedContent = downloadedFile.toString();
    console.log('✅ Downloaded content:', downloadedContent);
    
    if (downloadedContent !== 'Hello from CosmicBoard S3 Test!') {
      throw new Error('Downloaded content does not match uploaded content');
    }
    
    // Test 5: List files
    console.log('\n5️⃣ Testing file listing...');
    const files = await s3Service.listFiles('test/');
    console.log('✅ Files in test/ prefix:', files);
    
    // Test 6: Check if file exists
    console.log('\n6️⃣ Testing file existence check...');
    const exists = await s3Service.fileExists(textKey);
    console.log('✅ File exists:', exists);
    
    // Test 7: Delete files
    console.log('\n7️⃣ Testing file deletion...');
    await s3Service.deleteFile(textKey);
    console.log('✅ Text file deleted');
    
    await s3Service.deleteFile(imageKey);
    console.log('✅ Image file deleted');
    
    // Verify deletion
    const existsAfterDelete = await s3Service.fileExists(textKey);
    console.log('✅ File exists after deletion:', existsAfterDelete);
    
    if (existsAfterDelete) {
      throw new Error('File still exists after deletion');
    }
    
    console.log('\n🎉 All S3 operations tested successfully!');
    
  } catch (error) {
    console.error('❌ S3 Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testS3Operations().catch(console.error);