# LocalStack Setup for CosmicSpace

## Overview
LocalStack provides a local AWS cloud stack for development and testing. This setup allows you to develop and test AWS services (S3, SES, RDS, etc.) locally without incurring AWS costs or requiring internet connectivity.

## Current Status
✅ **LocalStack is configured and running**
- Docker containers are running (LocalStack + PostgreSQL)
- S3 buckets created: `cosmicspace-media` and `cosmicspace-backups`
- AWS SDK integrated into backend services
- Service wrappers created for S3 and SES

## Quick Start

### 1. Start LocalStack Services
```bash
# Start LocalStack and PostgreSQL
npm run localstack:start

# Or manually:
./start-localstack.sh
```

### 2. Run Backend with LocalStack Configuration
```bash
# This uses the .env.localstack configuration
npm run dev:localstack
```

### 3. Verify Services
```bash
# Check running containers
docker ps | grep cosmicspace

# Test S3 buckets (from within container)
docker exec cosmicspace-localstack awslocal s3 ls

# Check LocalStack health
curl http://localhost:4566/_localstack/health
```

## Architecture

### Services Configuration
```yaml
LocalStack Services:
- S3 (Object Storage)
- SES (Email Service)
- Secrets Manager
- RDS (Database - using separate PostgreSQL container)

Endpoints:
- LocalStack Gateway: http://localhost:4566
- PostgreSQL: localhost:5432
```

### Environment Variables (.env.localstack)
```env
# AWS Configuration
AWS_ENDPOINT=http://localhost:4566
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test

# S3 Configuration
AWS_S3_BUCKET=cosmicspace-media
AWS_S3_ENDPOINT=http://localhost:4566
AWS_S3_FORCE_PATH_STYLE=true

# SES Configuration  
AWS_SES_ENDPOINT=http://localhost:4566
EMAIL_FROM=noreply@cosmicspace.app

# Database
DATABASE_URL=postgresql://admin:localdev123@localhost:5432/cosmicspace
```

## Service Integration

### S3 Service (`src/services/aws/s3.service.ts`)
- Automatically detects LocalStack via `AWS_ENDPOINT` environment variable
- Handles file uploads, downloads, and presigned URLs
- Works identically in local and production environments

### SES Service (`src/services/aws/ses.service.ts`)
- Sends magic link emails for authentication
- In development mode, logs emails to console
- HTML email templates with cosmic theme

### Authentication Flow
1. User requests magic link → Backend generates token
2. SES service sends email (or logs in dev mode)
3. User clicks link or enters code
4. Backend verifies and issues JWT tokens

## Troubleshooting

### Issue: tslib module not found
```bash
# Install missing dependency
cd /Users/sammuthu/Projects/cosmicboard-backend
npm install tslib
# Restart backend
```

### Issue: PostgreSQL version mismatch
```bash
# Reset volumes and restart
docker-compose -f docker-compose.localstack.yml down -v
docker-compose -f docker-compose.localstack.yml up -d
```

### Issue: SES email verification
LocalStack's SES implementation doesn't require actual email verification. The `verify-email-identity` command may show errors but emails will still work.

## Testing Authentication

### Web Application
1. Open http://localhost:7777
2. Click "Sign In" 
3. Enter email (e.g., nmuthu@gmail.com)
4. Check backend console for magic link
5. Open magic link in browser

### Mobile Application
1. Open app in simulator/device
2. Enter email on auth screen
3. Check backend console for 6-digit code
4. Enter code in app

## Next Steps for Production

When ready to deploy to AWS:

1. **Update Environment Variables**
   - Remove `AWS_ENDPOINT` configurations
   - Add real AWS credentials
   - Update S3 bucket names if needed

2. **Verify AWS Services**
   - Create S3 buckets in AWS
   - Verify domain in SES
   - Move out of SES sandbox for production emails

3. **Database Migration**
   - Set up RDS Aurora PostgreSQL Serverless v2
   - Run Prisma migrations
   - Update DATABASE_URL

4. **No Code Changes Required**
   - Service wrappers automatically detect environment
   - Same code works in local and production

## Useful Commands

```bash
# Stop all services
docker-compose -f docker-compose.localstack.yml down

# Reset everything (including data)
docker-compose -f docker-compose.localstack.yml down -v

# View LocalStack logs
docker logs cosmicspace-localstack

# View PostgreSQL logs
docker logs cosmicspace-postgres

# Execute commands in LocalStack
docker exec cosmicspace-localstack awslocal [command]

# Run Prisma migrations
npx prisma migrate deploy
```

## Additional Resources
- [LocalStack Documentation](https://docs.localstack.cloud/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [Main Deployment Strategy](./AWS-backend-deployment-Beta-README.md)