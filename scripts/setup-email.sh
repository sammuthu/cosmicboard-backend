#!/bin/bash

# Email Setup Script for CosmicBoard Backend
# This script helps you configure email sending with Gmail

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}📧 CosmicBoard Email Configuration Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}This script will help you set up Gmail SMTP for sending magic link emails.${NC}"
echo ""

# Step 1: Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    cp .env.example .env 2>/dev/null || touch .env
fi

# Step 2: Instructions for Gmail App Password
echo -e "${BLUE}Step 1: Generate Gmail App Password${NC}"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "To send emails from your Gmail account, you need an app-specific password:"
echo ""
echo "1. Go to: ${GREEN}https://myaccount.google.com/security${NC}"
echo "2. Enable 2-Factor Authentication if not already enabled"
echo "3. Go to: ${GREEN}https://myaccount.google.com/apppasswords${NC}"
echo "4. Select 'Mail' as the app"
echo "5. Select 'Other' as the device and name it 'CosmicBoard'"
echo "6. Click 'Generate'"
echo "7. Copy the 16-character password (spaces don't matter)"
echo ""

# Step 3: Get user input
read -p "Enter your Gmail address [nmuthu@gmail.com]: " gmail_address
gmail_address=${gmail_address:-nmuthu@gmail.com}

echo ""
read -sp "Enter your Gmail App Password (input hidden): " app_password
echo ""
echo ""

# Step 4: Update .env file
echo -e "${YELLOW}Updating .env file...${NC}"

# Remove old email config if exists
sed -i.bak '/^SMTP_/d' .env
sed -i.bak '/^EMAIL_FROM/d' .env
sed -i.bak '/^ENABLE_EMAIL_SENDING/d' .env

# Add new email config
cat >> .env << EOF

# Email Configuration (Added by setup-email.sh)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=$gmail_address
SMTP_PASS=$app_password
SMTP_FROM=$gmail_address
EMAIL_FROM=$gmail_address
EMAIL_FROM_NAME=CosmicSpace
ENABLE_EMAIL_SENDING=true
EOF

echo -e "${GREEN}✅ Email configuration added to .env${NC}"
echo ""

# Step 5: Test email sending
echo -e "${BLUE}Step 2: Test Email Sending${NC}"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Would you like to send a test magic link email?"
read -p "Send test email to $gmail_address? (y/n): " send_test

if [[ $send_test == "y" || $send_test == "Y" ]]; then
    echo ""
    echo -e "${YELLOW}Sending test magic link...${NC}"
    
    # Create test script
    cat > /tmp/test-email.js << 'EOF'
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const testEmail = async () => {
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: process.env.SMTP_USER,
      subject: '🚀 CosmicSpace Test Magic Link',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Test Email from CosmicSpace! 🎉</h2>
          <p>Your email configuration is working correctly!</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p>Test Magic Code: <strong style="font-size: 24px; letter-spacing: 2px;">${code}</strong></p>
          </div>
          <p style="color: #666; font-size: 14px;">This is a test email to verify your SMTP configuration.</p>
        </div>
      `,
    });
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ Failed to send test email:', error.message);
    process.exit(1);
  }
};

testEmail();
EOF

    # Run test
    node /tmp/test-email.js
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ Email configuration is working!${NC}"
        echo -e "${GREEN}Check your inbox at $gmail_address${NC}"
    else
        echo ""
        echo -e "${RED}❌ Email test failed. Please check your credentials.${NC}"
        echo "Common issues:"
        echo "  - Make sure 2FA is enabled on your Gmail account"
        echo "  - Use an app-specific password, not your regular password"
        echo "  - Check that 'Less secure app access' is not blocking it"
    fi
    
    rm /tmp/test-email.js
fi

echo ""
echo -e "${BLUE}Step 3: Restart Backend Server${NC}"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "To apply the email configuration, restart your backend server:"
echo ""
echo -e "  ${YELLOW}./start-simple.sh${NC}"
echo ""
echo "Or if you're already running the server, press Ctrl+C and restart it."
echo ""
echo -e "${GREEN}✅ Email setup complete!${NC}"
echo ""
echo "Your backend will now send real magic link emails to users."
echo "The magic links will direct users to: ${BLUE}http://localhost:7777/auth${NC}"
echo ""