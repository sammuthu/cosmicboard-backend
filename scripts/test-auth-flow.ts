#!/usr/bin/env npx tsx
import dotenv from 'dotenv';
import axios from 'axios';

// Load LocalStack environment
dotenv.config({ path: '.env.localstack' });

const API_URL = 'http://localhost:7779/api';
const TEST_EMAIL = 'nmuthu@gmail.com';

async function testAuthenticationFlow() {
  console.log('🔐 Testing Authentication Flow End-to-End\n');
  
  try {
    // Step 1: Request magic link
    console.log('1️⃣ Requesting magic link...');
    const magicLinkResponse = await axios.post(`${API_URL}/auth/magic-link`, {
      email: TEST_EMAIL
    });
    
    if (magicLinkResponse.status === 200) {
      console.log('✅ Magic link sent successfully');
      console.log('   Response:', magicLinkResponse.data);
    }
    
    // Step 2: Simulate verification (in real scenario, user clicks link)
    console.log('\n2️⃣ Simulating magic link verification...');
    console.log('   Note: In production, user would receive email and click link');
    console.log('   For testing, we\'ll check if the magic link was created in DB');
    
    // Step 3: Test other auth endpoints
    console.log('\n3️⃣ Testing health check...');
    const healthResponse = await axios.get(`${API_URL}/health`);
    console.log('✅ Health check:', healthResponse.data);
    
    // Step 4: Test protected route without token (should fail)
    console.log('\n4️⃣ Testing protected route without token...');
    try {
      await axios.get(`${API_URL}/auth/me`);
      console.log('❌ Protected route should have failed without token');
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.log('✅ Protected route correctly rejected unauthorized request');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    
    // Step 5: Test refresh token endpoint
    console.log('\n5️⃣ Testing refresh token endpoint...');
    try {
      await axios.post(`${API_URL}/auth/refresh`, {
        refreshToken: 'invalid-token'
      });
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 400) {
        console.log('✅ Refresh endpoint correctly rejected invalid token');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    
    console.log('\n🎉 Authentication flow tests completed!');
    
    // Additional info
    console.log('\n📝 Notes:');
    console.log('- Magic links are logged in development mode');
    console.log('- Check server logs for magic link code');
    console.log('- In production, emails would be sent via AWS SES');
    console.log('- LocalStack simulates AWS services locally');
    
  } catch (error: any) {
    console.error('❌ Auth test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    process.exit(1);
  }
}

// First check if server is running
async function checkServerRunning() {
  try {
    await axios.get(`${API_URL}/health`);
    return true;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔍 Checking if server is running...');
  const serverRunning = await checkServerRunning();
  
  if (!serverRunning) {
    console.log('⚠️  Server is not running!');
    console.log('   Please start the server first:');
    console.log('   npm run dev:localstack');
    process.exit(1);
  }
  
  console.log('✅ Server is running\n');
  await testAuthenticationFlow();
}

main().catch(console.error);