# AWS Migration Guide for CosmicBoard

## Database Migration Strategy

### Prerequisites
- AWS RDS PostgreSQL instance (version 14+)
- AWS S3 bucket for media storage
- AWS IAM credentials configured

### Migration Steps

#### 1. Database Schema Migration

```bash
# Connect to AWS RDS instance
psql -h <rds-endpoint> -U <username> -d <database>

# Create database if needed
CREATE DATABASE cosmicspace;

# Run Prisma migrations
cd /path/to/cosmicboard-backend
DATABASE_URL="postgresql://username:password@rds-endpoint:5432/cosmicspace" npx prisma migrate deploy
```

#### 2. Data Migration

```bash
# Export current data (already done)
node database/export-data.js

# Import to AWS RDS
DATABASE_URL="postgresql://username:password@rds-endpoint:5432/cosmicspace" node database/import-data.js data_2025-09-24
```

#### 3. Environment Variables for AWS

Create `.env.production`:

```env
NODE_ENV=production
PORT=7779

# AWS RDS Database
DATABASE_URL=postgresql://username:password@rds-endpoint:5432/cosmicspace

# AWS S3 Storage
STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=cosmicboard-media

# Auth Configuration
JWT_SECRET=your-jwt-secret
REFRESH_TOKEN_SECRET=your-refresh-secret

# Email Service (if using AWS SES)
EMAIL_ENABLED=true
AWS_SES_REGION=us-east-1
```

#### 4. Media Files Migration to S3

```bash
# Use AWS CLI to sync local uploads to S3
aws s3 sync ./uploads s3://cosmicboard-media/uploads --acl public-read
```

#### 5. Update Frontend Configuration

In the frontend `.env.production`:

```env
NEXT_PUBLIC_USE_EXTERNAL_BACKEND=true
NEXT_PUBLIC_BACKEND_URL=https://api.cosmicboard.com
```

## Database Backup Structure

### Current Backup (2025-09-24)
- **users.json**: User accounts and authentication
- **themeTemplates.json**: All available themes
- **userThemeGlobals.json**: User global theme preferences
- **userThemeCustomizations.json**: Device-specific themes
- **projects.json**: User projects
- **tasks.json**: Project tasks
- **references.json**: Documentation references
- **media.json**: Media metadata
- **metadata.json**: Export information

### Critical Tables for Migration
1. **User** - Core user data
2. **AuthMethod** - Authentication methods
3. **ThemeTemplate** - System themes
4. **UserThemeGlobal** - Global theme preferences (NEW)
5. **UserThemeCustomization** - Device-specific themes (REFACTORED)
6. **Project** - User projects
7. **Task** - Project tasks
8. **Reference** - Documentation
9. **Media** - Media files

## Schema Changes in This Migration

### New Tables
- `UserThemeGlobal`: Stores user's global theme preference

### Modified Tables
- `UserThemeCustomization`:
  - Removed `isActive` and `isGlobal` columns
  - Made device fields required
  - New unique constraint on `userId` + `deviceIdentifier`

### Theme Hierarchy
1. **Device-specific theme** (highest priority)
2. **User global theme** (fallback)
3. **System default theme** (ultimate fallback)

## Post-Migration Verification

```bash
# Verify data counts
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function verify() {
  console.log('Users:', await prisma.user.count());
  console.log('Projects:', await prisma.project.count());
  console.log('Tasks:', await prisma.task.count());
  console.log('Theme Templates:', await prisma.themeTemplate.count());
  console.log('Global Themes:', await prisma.userThemeGlobal.count());
  await prisma.$disconnect();
}
verify();
"
```

## Rollback Plan

If migration fails:

1. Restore database from backup:
```bash
node database/import-data.js data_2025-09-24
```

2. Revert schema if needed:
```bash
npx prisma migrate reset
```

## Important Notes

- All timestamps are preserved during migration
- User IDs and relationships are maintained
- Media URLs may need updating if S3 bucket name changes
- Test theme functionality thoroughly after migration
- Device fingerprints will regenerate on first access