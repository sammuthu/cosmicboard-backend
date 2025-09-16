# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ CRITICAL DATABASE SAFETY RULES

**NEVER use `prisma migrate reset` or any destructive database commands without explicit user consent!**

### Database Management Guidelines:
1. **Always backup data before migrations**: Use `npx tsx scripts/backup-data.ts`
2. **Use incremental migrations**: Never reset the database, use `prisma migrate dev` to create new migrations
3. **Restore data if needed**: Use `npx tsx scripts/restore-data.ts` to restore from backups
4. **Backup location**: All backups are stored in `/db-backup/` directory (git-versioned)
5. **Default user**: Apply all existing data to `nmuthu@gmail.com` unless already associated with a userId

### Before ANY database schema changes:
1. Run backup: `npx tsx scripts/backup-data.ts`
2. Create migration: `npx prisma migrate dev --create-only`
3. Review migration file before applying
4. Apply migration: `npx prisma migrate dev`
5. If issues occur, restore: `npx tsx scripts/restore-data.ts`

## Project Overview

CosmicBoard Backend - Express.js API with PostgreSQL/Prisma, featuring magic link authentication, AWS integration via LocalStack, and comprehensive media handling for collaborative task management.

## Essential Commands

### Development
```bash
npm run dev              # Start with nodemon (port 7779)
npm run dev:localstack   # Start with LocalStack AWS environment
npm run build           # Compile TypeScript to ./dist
npm start               # Start production server
```

### Infrastructure
```bash
npm run localstack:start # Start LocalStack AWS simulation
npm run docker:up       # Start PostgreSQL and Redis
npm run docker:down     # Stop containers
npm run docker:reset    # Reset volumes and restart
```

### Database
```bash
npm run prisma:generate # Generate Prisma client
npm run prisma:migrate  # Apply migrations
npm run prisma:studio   # Open Prisma Studio (port 5555)
npm run prisma:seed     # Seed initial data
npx tsx scripts/backup-data.ts   # Backup database to JSON
npx tsx scripts/restore-data.ts  # Restore from backup
```

### Testing & Quality
```bash
npm test                # Run Jest tests (framework ready, no tests implemented)
# Note: No linting configuration present (.eslintrc missing)
```

## Architecture

### Core Services
- **src/server.ts**: Express server initialization, middleware setup
- **src/app.ts**: Route configuration and error handling
- **src/config/environment.ts**: Environment-aware configuration
- **src/services/**: Business logic for auth, AWS, email
- **src/middleware/auth.middleware.ts**: Token validation

### Authentication System
- **Magic Link Flow**: Email-based with 15-minute expiry
- **6-Digit Codes**: Mobile app authentication support
- **Token Management**: Access (15min) and refresh (7 days) tokens using crypto.randomBytes (not JWT)
- **Session Storage**: In-memory for development, database for production

### AWS Integration & LocalStack
**Development**: LocalStack auto-configuration for S3, SES, Secrets Manager
**Production**: Full AWS SDK v3 integration
**Buckets**: `cosmicspace-media` (files), `cosmicspace-backups` (data)

### Database Schema (Prisma)
- **Priority System**: Tasks use SUPERNOVA > STELLAR > NEBULA priorities
- **Multi-tenant**: User-based data isolation
- **Media Support**: Photos, screenshots, PDFs with thumbnail generation
- **Theme System**: Templates and user customizations
- **Soft Deletes**: `deletedAt` fields for recovery

### API Patterns
- Base: `/api/*`
- Authentication required via `authMiddleware`
- RESTful conventions with nested resources
- Standard error responses with appropriate status codes

## Infrastructure Configuration

**IMPORTANT**: Nginx and reverse proxy configurations are centralized in:
```
/Users/sammuthu/Projects/nginx-reverse-proxy/
```

- **Primary Domain**: cosmicspace.app
- **Legacy Domain**: cosmic.board (redirects)
- **Backend**: cosmicspace.app/api → localhost:7779

## Environment Variables

### Required
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/cosmicboard
PORT=7779
NODE_ENV=development
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
```

### LocalStack/AWS
```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_ENDPOINT=http://localhost:4566
S3_BUCKET=cosmicspace-media
```

### Email Configuration
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@cosmicspace.app
```

## Development Workflow

### Quick Start with LocalStack
```bash
npm run docker:reset        # Clean start
npm run localstack:start    # Start AWS services
npm run dev:localstack      # Run with LocalStack config
```

### Standard Development
```bash
npm run docker:up           # Start PostgreSQL/Redis
npm run prisma:migrate      # Apply migrations
npm run dev                 # Start development server
```

## Current Implementation Status
- ✅ Complete CRUD APIs for all entities
- ✅ Magic link authentication
- ✅ AWS integration with LocalStack fallback
- ✅ Media upload and processing
- ✅ Theme customization system
- ✅ Backup/restore scripts
- ⏳ Jest testing (configured, no tests)
- ⏳ No linting configuration
- ⏳ Redis caching (configured, not implemented)