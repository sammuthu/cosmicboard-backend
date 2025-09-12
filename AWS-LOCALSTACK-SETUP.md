# AWS LocalStack Setup & Testing Documentation

## ✅ Setup Completed

All AWS services are now configured and working with LocalStack for local development.

## 🚀 Quick Start

```bash
# 1. Start infrastructure
npm run docker:up          # PostgreSQL + Redis
npm run localstack:start    # AWS LocalStack

# 2. Run tests
./scripts/test-all.sh       # Run all tests

# 3. Start server
npm run dev:localstack      # Start with LocalStack config
```

## 📊 Test Results Summary

### ✅ S3 Storage Operations
- **Status**: WORKING
- **Test Script**: `scripts/test-s3.ts`
- **Features Tested**:
  - File upload to S3 bucket
  - File download from S3
  - Presigned URL generation
  - File listing
  - File existence check
  - File deletion
- **Fix Applied**: Modified S3Service to initialize client in constructor

### ✅ Email Service (SES)
- **Status**: WORKING
- **Test Script**: `scripts/test-email.ts`
- **Features Tested**:
  - Magic link email sending
  - Development mode console logging
  - LocalStack SES integration
- **Note**: Emails are logged to console in development mode

### ✅ Database Operations (Prisma)
- **Status**: WORKING
- **Test Script**: `scripts/test-database.ts`
- **Migration Script**: `scripts/migrate-preserve-data.ts`
- **Features**:
  - Safe migration preserving existing data
  - All data associated with nmuthu@gmail.com
  - No data loss during schema updates

## 🔧 Issues Fixed

1. **S3 Client Initialization**
   - Problem: S3Client was initialized at module load time
   - Solution: Moved initialization to constructor for proper env loading

2. **Database Schema Mismatch**
   - Problem: Old schema with password field vs new auth system
   - Solution: Created safe migration script that preserves data

3. **Missing tslib Dependency**
   - Problem: AWS SDK requiring tslib
   - Solution: Reinstalled dependencies with `npm ci`

## 📁 Test Scripts Created

```
scripts/
├── test-s3.ts              # S3 operations test
├── test-s3-debug.ts        # S3 configuration debug
├── test-email.ts           # Email service test
├── test-database.ts        # Database operations test
├── test-auth-flow.ts       # Authentication flow test
├── migrate-preserve-data.ts # Safe database migration
└── test-all.sh            # Run all tests
```

## 🌐 Environment Configuration

### LocalStack Environment (.env.localstack)
```env
NODE_ENV=development
DATABASE_URL=postgresql://admin:localdev123@localhost:5432/cosmicspace
AWS_ENDPOINT=http://localhost:4566
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_S3_BUCKET=cosmicspace-media
EMAIL_FROM=noreply@cosmicspace.app
```

## 🐳 Docker Services

### Running Containers
- `cosmicspace-postgres`: PostgreSQL database
- `cosmicspace-localstack`: AWS services simulation
- `cosmicboard_redis`: Redis cache

## 📝 Important Notes

### Database Management
- **NEVER reset the database** - use migrations to alter tables
- All existing data is preserved and associated with nmuthu@gmail.com
- New tables can be created freely
- Existing tables are altered, not dropped

### LocalStack Services
- **S3 Buckets**: cosmicspace-media, cosmicspace-backups
- **SES Identities**: noreply@cosmicspace.app, nmuthu@gmail.com, sammuthu@me.com
- **Endpoint**: http://localhost:4566

### Development Workflow
1. Always start Docker containers first
2. Use `.env.localstack` for LocalStack development
3. Run tests to verify services before starting development
4. Check logs for magic link codes in development mode

## 🎯 Next Steps for Web Development

Now that the backend is fully functional with LocalStack, you can:

1. Switch to the web project: `/Users/sammuthu/Projects/cosmicboard`
2. Configure the web app to use the backend API at `http://localhost:7779/api`
3. Test authentication flow with magic links
4. Implement file uploads using the S3 service
5. Use the verified email addresses for testing

## 🛠️ Troubleshooting

### Server Won't Start
- Check if port 7779 is available
- Verify DATABASE_URL is correct
- Ensure Docker containers are running

### S3 Upload Fails
- Verify LocalStack is running
- Check AWS credentials in environment
- Ensure bucket exists: `docker exec cosmicspace-localstack awslocal s3 ls`

### Email Not Sending
- Check LocalStack logs: `docker logs cosmicspace-localstack`
- Verify email is in verified list
- In development, check console for logged emails

### Database Connection Issues
- Verify PostgreSQL container is running
- Check DATABASE_URL format
- Run migrations: `DATABASE_URL=... npx prisma migrate deploy`