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
1. Run backup: `cd database && node export-data.js` (creates timestamped backup in `database/backups/`)
2. Create migration: `npx prisma migrate dev --create-only`
3. Review migration file before applying
4. Apply migration: `npx prisma migrate dev`
5. If issues occur, restore: `cd database && node import-data.js data_YYYY-MM-DD`

**CRITICAL**: The most recent and complete backups are in `/database/backups/`, NOT `/db-backup/`!

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
./start.sh              # Complete startup script (PostgreSQL + LocalStack + Backend)
./start.sh --migrate   # Run with database migrations
./start.sh --seed      # Run with database seeding
./start.sh --quick     # Skip checks for faster startup
npm run localstack:start # Start LocalStack AWS simulation only
npm run docker:up       # Start PostgreSQL and Redis
npm run docker:down     # Stop containers
npm run docker:reset    # Reset volumes and restart
```

### Database
```bash
npm run prisma:generate # Generate Prisma client
npm run prisma:migrate  # Apply migrations
npm run prisma:studio   # Open Prisma Studio (port 5555)
npm run prisma:seed     # Seed initial data (themes)
npx tsx scripts/backup-data.ts   # Backup database to JSON
npx tsx scripts/restore-data.ts  # Restore from backup
npx tsx scripts/seed-themes.ts   # Seed theme templates
```

### Testing & Quality
```bash
npm test                # Run Jest tests (framework ready, no tests implemented)
npx tsx scripts/test-*.ts # Run individual test scripts
./scripts/test-all.sh   # Run all test scripts
# Note: No linting configuration present (.eslintrc missing)
```

## Architecture

### Core Services
- **src/server.ts**: Express server initialization (port 7779), middleware setup, static file serving
- **src/config/environment.ts**: Environment-aware configuration, LocalStack auto-detection
- **src/middleware/auth.middleware.ts**: Token validation using crypto.randomBytes (not JWT)
- **src/routes/**: RESTful API endpoints organized by resource
- **src/services/**: Business logic layer

### Authentication System
- **Magic Link Flow**: Email-based with 15-minute expiry
- **6-Digit Codes**: Mobile app authentication support
- **Token Management**:
  - Access tokens: 15 minutes (stored in-memory)
  - Refresh tokens: 7 days (stored in database)
  - Uses crypto.randomBytes, NOT JWT
- **Development Mode**: Auto-seeds known development tokens for `nmuthu@gmail.com` when using LocalStack

### AWS Integration & LocalStack
- **Development**: LocalStack auto-configuration for S3, SES, Secrets Manager
- **Production**: Full AWS SDK v3 integration
- **S3 Buckets**:
  - `cosmicspace-media`: User uploaded files
  - `cosmicspace-backups`: Database backups
- **SES Verified Emails**: noreply@cosmicspace.app, nmuthu@gmail.com, sammuthu@me.com

### Database Schema (Prisma)
- **Priority System**: Tasks use SUPERNOVA > STELLAR > NEBULA priorities
- **Multi-tenant**: User-based data isolation
- **Media Support**: Photos, screenshots, PDFs with thumbnail generation using Sharp
- **Theme System**: Templates and user customizations (per-device or global)
- **Soft Deletes**: Via status fields (DELETED, ARCHIVED)
- **Key Models**: User, Project, Task, Reference, Media, ThemeTemplate, UserThemeCustomization

### API Patterns
- Base path: `/api/*`
- Authentication: Required via `authenticate` middleware, optional via `authenticateOptional`
- RESTful conventions with nested resources
- Standard error responses with appropriate status codes
- Static uploads served from `/uploads/*` with proper MIME types

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
DATABASE_URL=postgresql://admin:localdev123@localhost:5432/cosmicspace
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

### Quick Start with LocalStack (Recommended)
```bash
./start.sh              # Starts everything (PostgreSQL, LocalStack, Backend)
# OR manually:
npm run docker:reset    # Clean start
npm run localstack:start # Start AWS services
npm run dev:localstack  # Run with LocalStack config
```

### Standard Development
```bash
npm run docker:up       # Start PostgreSQL/Redis
npm run prisma:migrate  # Apply migrations
npm run dev             # Start development server
```

### Database Migration with Data Preservation
```bash
npx tsx scripts/backup-data.ts      # Backup current data
npx prisma migrate dev --create-only # Create migration file
# Review migration file
npx prisma migrate dev               # Apply migration
# If issues:
npx tsx scripts/restore-data.ts     # Restore from backup
```

## Current Implementation Status
- ✅ Complete CRUD APIs for all entities
- ✅ Magic link authentication with 6-digit codes
- ✅ AWS integration with LocalStack fallback
- ✅ Media upload and processing (photos, screenshots, PDFs)
- ✅ Theme customization system with templates
- ✅ Database backup/restore scripts
- ✅ Development token auto-seeding
- ⏳ Jest testing (configured, no tests)
- ⏳ No linting configuration
- ⏳ Redis caching (configured, not implemented)

## API Endpoints

### Authentication (`/api/auth`)
- `POST /login` - Send magic link
- `POST /verify` - Verify magic link/code
- `POST /refresh` - Refresh access token
- `POST /logout` - Logout user

### Projects (`/api/projects`)
- Full CRUD operations
- Nested routes for tasks and references

### Media (`/api/media`)
- `POST /upload` - Upload media with multipart/form-data
- `GET /:id` - Get media metadata
- `DELETE /:id` - Delete media

### Themes (`/api/themes`)
- `GET /templates` - List all theme templates
- `POST /customize` - Create/update user customization
- `DELETE /customize/:id` - Delete customization

## Docker Containers

- **cosmicspace-postgres**: PostgreSQL 15 database (port 5432)
- **cosmicspace-localstack**: AWS LocalStack simulation (port 4566)
- **cosmicspace-redis**: Redis cache (port 6379, optional)

## Scripts Directory

Key utility scripts in `/scripts`:
- **backup-data.ts**: Backup database to JSON
- **restore-data.ts**: Restore from JSON backup
- **seed-themes.ts**: Seed theme templates
- **migrate-media-to-s3.ts**: Migrate local files to S3
- **test-*.ts**: Various test scripts for auth, email, S3
- **setup-email.sh**: Configure email settings

## File IDs and Project Isolation

The codebase uses CUID for file IDs and implements strict project isolation:
- Each media file is scoped to a project via `projectId`
- File paths include the file ID for unique storage (e.g., `/uploads/photo/{fileId}/originals/`)
- Always ensure file operations respect project boundaries to prevent cross-project access
- Recent fixes resolved file ID conflicts and ensured proper project isolation

## Testing Pattern

Test scripts in `/scripts` follow a consistent pattern:
- `test-*.ts` scripts are executable via `npx tsx scripts/test-{feature}.ts`
- `./scripts/test-all.sh` runs all test scripts sequentially
- No Jest tests currently implemented despite test framework being configured
- Test scripts are integration tests that verify actual AWS/database connectivity

## Soft Delete Implementation

The schema includes `deletedAt` fields for soft deletes:
- **Project**: Has `deletedAt DateTime?` field (marked as TODO for migration)
- **Reference**: Has `deletedAt DateTime?` field (marked as TODO for migration)
- **Media**: Has `deletedAt DateTime?` field (marked as TODO for migration)
- **Tasks**: Use `status` enum (ACTIVE, COMPLETED, DELETED, ARCHIVED) instead of `deletedAt`
- When implementing soft deletes, filter queries with `where: { deletedAt: null }`