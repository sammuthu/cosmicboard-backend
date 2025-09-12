#!/usr/bin/env npx tsx
import { EmailService } from '../src/services/aws/ses.service';
import dotenv from 'dotenv';

// Load LocalStack environment
dotenv.config({ path: '.env.localstack' });

async function testEmailSending() {
  console.log('📧 Testing Email Sending with LocalStack SES\n');
  
  const emailService = new EmailService();
  
  const testEmails = [
    'nmuthu@gmail.com',
    'sammuthu@me.com'
  ];
  
  try {
    for (const email of testEmails) {
      console.log(`\n🔄 Sending magic link to ${email}...`);
      
      // Generate a test magic link code
      const magicCode = Math.floor(100000 + Math.random() * 900000).toString();
      const magicLink = `http://localhost:7777/auth/verify?code=${magicCode}`;
      
      // Test magic link email
      const result = await emailService.sendMagicLink(email, magicLink, magicCode, false);
      
      console.log(`✅ Email sent to ${email}`);
      console.log(`   Message ID: ${result.MessageId}`);
      console.log(`   Magic Code: ${magicCode}`);
    }
    
    console.log('\n🎉 All emails sent successfully!');
    console.log('\n📝 Note: With LocalStack, emails are not actually delivered.');
    console.log('   Check LocalStack logs to verify email processing.');
    console.log('\n   To view LocalStack SES activity:');
    console.log('   docker logs cosmicspace-localstack | grep SES');
    
  } catch (error) {
    console.error('❌ Email test failed:', error);
    process.exit(1);
  }
}

// Run the test
testEmailSending().catch(console.error);