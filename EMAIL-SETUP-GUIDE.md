# Email Service Setup Guide

## Current Setup ✅
- **Service:** Gmail SMTP
- **Cost:** FREE
- **Limit:** 500 emails/day
- **From:** nmuthu@gmail.com

## Professional Email Setup Options

### Option 1: AWS SES (Recommended for Production)
```bash
# Already integrated with your LocalStack setup!
# To use in production:

1. Verify your domain in AWS SES Console
2. Update .env:
   AWS_SES_ENABLED=true
   AWS_SES_FROM=noreply@cosmicspace.app
   
3. Cost: $0.10 per 1000 emails
```

### Option 2: Resend (Easiest Setup)
```bash
# 1. Sign up at https://resend.com
# 2. Get API key
# 3. Update your .env:

RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_SERVICE=resend
EMAIL_FROM=noreply@cosmicspace.app
```

### Option 3: Keep Gmail + Custom From Address
```javascript
// In src/services/auth.service.ts, update:
from: '"CosmicSpace" <noreply@cosmicspace.app>',
replyTo: 'nmuthu@gmail.com',
```

## To Create noreply@cosmicspace.app

### Free Option (Forwarding Only):
1. Sign up for ImprovMX (free)
2. Add MX records to your domain
3. Forwards all emails to nmuthu@gmail.com

### Professional Option:
1. Google Workspace ($6/month)
2. Full Gmail interface
3. 2,000 emails/day

## Current Gmail Limits
- **Daily limit:** 500 recipients
- **Rate limit:** 20 messages/minute
- **Perfect for:** Development, testing, small production

## When to Upgrade
Upgrade when you:
- Send more than 500 emails/day
- Need better deliverability
- Want professional sender domain
- Need email analytics

## Quick AWS SES Setup (When Ready)
```bash
# Your LocalStack is already configured for SES!
# Just switch from LocalStack to real AWS:

1. Remove AWS_ENDPOINT from .env
2. Add real AWS credentials
3. Verify domain in AWS Console
4. Update EMAIL_FROM to noreply@cosmicspace.app
```

## Cost Comparison (Monthly)
- **Current (Gmail):** $0
- **AWS SES:** ~$1-5 (10,000-50,000 emails)
- **SendGrid:** $20 (40,000 emails)
- **Resend:** $20 (5,000 emails)
- **Google Workspace:** $6 + Gmail limits

## Recommendation
Stick with Gmail for now - it's FREE and working great!
When you launch, switch to AWS SES for professional emails at minimal cost.