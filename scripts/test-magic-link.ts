#!/usr/bin/env npx tsx
import axios from 'axios';

const API_URL = 'http://localhost:7779/api';
const TEST_EMAIL = 'nmuthu@gmail.com';

async function testMagicLink() {
  console.log('🔐 Testing Magic Link Email Service\n');
  console.log(`Sending magic link to: ${TEST_EMAIL}`);
  console.log('─'.repeat(50));
  
  try {
    const response = await axios.post(`${API_URL}/auth/magic-link`, {
      email: TEST_EMAIL
    });
    
    if (response.data.success !== false) {
      console.log('\n✅ Magic link request successful!');
      console.log('📧 Check your email at:', TEST_EMAIL);
      console.log('\nThe email should contain:');
      console.log('  • A clickable magic link button');
      console.log('  • A 6-digit code for mobile app');
      console.log('  • Link expires in 15 minutes');
      
      console.log('\n📝 Note: If email is not configured, check the server logs');
      console.log('for the magic link URL and code.');
    } else {
      console.log('\n❌ Failed to send magic link:', response.data.message);
    }
  } catch (error: any) {
    if (error.response) {
      console.error('\n❌ API Error:', error.response.data);
    } else if (error.request) {
      console.error('\n❌ Server not responding. Is it running on port 7779?');
      console.log('Start the server with: ./start-simple.sh');
    } else {
      console.error('\n❌ Error:', error.message);
    }
  }
}

// Check if server is running first
async function checkServer() {
  try {
    await axios.get(`${API_URL}/health`);
    return true;
  } catch {
    return false;
  }
}

// Main execution
async function main() {
  console.log('Checking server status...');
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.error('\n❌ Backend server is not running!');
    console.log('\nStart the server with:');
    console.log('  ./start-simple.sh');
    process.exit(1);
  }
  
  console.log('✅ Server is running\n');
  await testMagicLink();
}

main().catch(console.error);