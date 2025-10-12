# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CosmicBoard Backend - Express.js API for a collaborative task management platform with social features. Built with TypeScript, PostgreSQL/Prisma, AWS S3 (via LocalStack for dev), and magic link authentication.

**Key Technologies:** Node.js 18+, Express 5, TypeScript, Prisma, PostgreSQL 15, LocalStack, AWS SDK v3, Sharp (image processing)

## ⚠️ CRITICAL DATABASE SAFETY RULES

**NEVER use `prisma migrate reset` or any destructive database commands without explicit user consent!**

### ⚠️ CRITICAL: Docker Container Recreation Rules

**ALWAYS include the volume mount when recreating PostgreSQL or LocalStack containers!**

When recreating containers, use these EXACT commands to preserve data:

#### PostgreSQL (Port 5454):
```bash
docker run -d \
  --name cosmicspace-postgres \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=localdev123 \
  -e POSTGRES_DB=cosmicspace \
  -e PGDATA=/data/postgres \
  -v cosmicboard-backend_postgres_data:/data/postgres \
  -p 5454:5432 \
  postgres:15-alpine
```

#### LocalStack (Port 4566):
```bash
docker run -d \
  --name cosmicspace-localstack \
  -e SERVICES=s3,ses,secretsmanager \
  -e DEBUG=1 \
  -e DATA_DIR=/tmp/localstack/data \
  -e PERSISTENCE=1 \
  -e AWS_DEFAULT_REGION=us-east-1 \
  -e HOSTNAME_EXTERNAL=localhost \
  -v cosmicboard-backend_localstack_data:/var/lib/localstack \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -p 4566:4566 \
  -p 4510-4559:4510-4559 \
  localstack/localstack:latest
```

**Key Points:**
- Port numbers are just network mappings - changing them does NOT affect data
- Data is stored in Docker volumes, NOT in containers
- ALWAYS use `-v volumename:/path` to attach volumes
- Without volume attachment, you create a fresh empty database/S3
- Volumes persist until explicitly deleted with `docker volume rm`

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
- **Magic Link Flow**: Email-based with 15-minute expiry tokens sent via SES
- **6-Digit Codes**: Mobile app authentication support (speakeasy-based TOTP)
- **Token Management**:
  - Access tokens: 15 minutes (stored in-memory in AuthService)
  - Refresh tokens: 7 days (stored in database RefreshToken table)
  - Uses crypto.randomBytes for token generation, NOT JWT
- **Development Mode**: Auto-seeds known development tokens for `nmuthu@gmail.com` when using LocalStack (see src/middleware/auth.middleware.ts:60-106)
- **Middleware**: `authenticate` (required) and `authenticateOptional` (optional auth) in src/middleware/auth.middleware.ts

### AWS Integration & LocalStack
- **Development**: LocalStack auto-configuration for S3, SES, Secrets Manager
- **Production**: Full AWS SDK v3 integration
- **S3 Buckets**:
  - `cosmicspace-media`: User uploaded files
  - `cosmicspace-backups`: Database backups
- **SES Verified Emails**: noreply@cosmicspace.app, nmuthu@gmail.com, sammuthu@me.com

### Database Schema (Prisma)
- **Priority System**: Tasks use SUPERNOVA > STELLAR > NEBULA priorities (Priority enum)
- **Multi-tenant**: User-based data isolation with strict ownership checks
- **Media Support**: Photos, screenshots, PDFs, documents with thumbnail generation using Sharp
- **Theme System**: Templates (ThemeTemplate) and user customizations (per-device or global via UserThemeCustomization/UserThemeGlobal)
- **Soft Deletes**: Mixed approach - Tasks use `status` enum (ACTIVE, COMPLETED, DELETED, ARCHIVED), others use `deletedAt` timestamp
- **Social Features (Phase S1)**: Events, ContentVisibility, ContentEngagement, ContentComment, ContentAmplify, UserConnection
- **Visibility System**: All content has visibility (PUBLIC, CONTACTS, PRIVATE) tracked in ContentVisibility table
- **Key Models**: User, Project, Task, Reference, Media, Event, ThemeTemplate, UserThemeCustomization, ContentVisibility, UserConnection
- **File IDs**: Uses CUID for unique identification with project-scoped isolation

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
DATABASE_URL=postgresql://admin:localdev123@localhost:5454/cosmicspace
PORT=7779
NODE_ENV=development
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
```

**Note**: PostgreSQL runs on port **5454** (not default 5432) to avoid conflicts with other projects.

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

### Phase S1: Social Platform Foundation (Completed ✅)
See PHASE-S1-PROGRESS.md for detailed report.

**Completed Features:**
- ✅ Complete CRUD APIs for all entities (Projects, Tasks, References, Media, Events)
- ✅ Magic link authentication with 6-digit codes (speakeasy)
- ✅ AWS integration with LocalStack for development
- ✅ Media upload and processing (photos, screenshots, PDFs, documents)
- ✅ Theme customization system (device-specific and global)
- ✅ Database backup/restore scripts (scripts/backup-data.ts, scripts/restore-data.ts)
- ✅ Development token auto-seeding (auth.middleware.ts)
- ✅ Social platform database schema (ContentVisibility, ContentEngagement, etc.)
- ✅ Events system with soft delete/restore
- ✅ Visibility controls (PUBLIC, CONTACTS, PRIVATE) on all content
- ✅ Content visibility service and sync endpoints

**In Progress/TODO:**
- ⏳ Jest testing (framework configured, no tests written)
- ⏳ No ESLint configuration
- ⏳ Redis caching (containers configured, not implemented in code)
- 📋 Phase S2: Navigation redesign and public content feed (next)

## API Endpoints

### Authentication (`/api/auth`)
- `POST /login` - Send magic link (creates MagicLink record)
- `POST /verify` - Verify magic link token or 6-digit code
- `POST /refresh` - Refresh access token
- `POST /logout` - Logout user (deletes refresh token)

### Projects (`/api/projects`)
- Full CRUD with visibility support (src/routes/projects.ts)
- `GET /api/projects` - List user projects with asset counts
- `POST /api/projects` - Create project (supports `visibility` param)
- `PUT /api/projects/:id` - Update project (supports `visibility`)
- Returns counts for tasks, references (by category), media (by type)

### Tasks (`/api/tasks`)
- CRUD operations with event support (src/routes/tasks.ts)
- `POST /api/tasks` - Create task (supports `visibility`, `eventId`, `priority`, `status`)
- `PUT /api/tasks/:id` - Update task
- `GET /api/tasks/:id/detail` - Get single task with full details

### References/Neural Notes (`/api/references`)
- CRUD for code snippets, docs, links, notes (src/routes/references.ts)
- Supports `category` (SNIPPET, DOCUMENTATION, LINK, NOTE) and `visibility`

### Media (`/api/media`)
- `POST /upload` - Upload media with multipart/form-data (supports `visibility`)
- `GET /:id` - Get media metadata
- `PUT /:id` - Update media (supports `visibility`)
- `DELETE /:id` - Soft delete media
- Thumbnail generation for images, first page extraction for PDFs

### Events (`/api/events`)
- Full CRUD for project events (src/routes/events.ts)
- `GET /api/events` - Get all events for user's projects
- `GET /api/events/:projectId/events` - List events for specific project
- `POST /api/events` - Create event with date range, location
- Soft delete with restore capability

### Content Visibility (`/api/content-visibility`)
- `POST /api/content-visibility/sync` - Bulk sync all content visibility
- `GET /api/content-visibility` - Get user's content visibility records

### Themes (`/api/themes`)
- `GET /templates` - List all theme templates
- `POST /customize` - Create/update device-specific customization
- `POST /global` - Set global theme for user
- `DELETE /customize/:id` - Delete device customization

## Docker Containers

- **cosmicspace-postgres**: PostgreSQL 15 database (port **5454** - custom to avoid conflicts)
- **cosmicspace-localstack**: AWS LocalStack simulation (port 4566)
- **cosmicspace-redis**: Redis cache (port 6379, optional)

### Data Persistence Volumes
- **cosmicboard-backend_postgres_data**: PostgreSQL data (survives container restarts)
- **cosmicboard-backend_localstack_data**: LocalStack S3 data (survives container restarts)

## Scripts Directory

Key utility scripts in `/scripts`:
- **backup-data.ts**: Backup database to JSON
- **restore-data.ts**: Restore from JSON backup
- **seed-themes.ts**: Seed theme templates
- **migrate-media-to-s3.ts**: Migrate local files to S3
- **test-*.ts**: Various test scripts for auth, email, S3
- **setup-email.sh**: Configure email settings

## Key Architecture Patterns

### File IDs and Project Isolation
- Uses CUID for all primary keys (cuid() function in Prisma)
- Each media file is scoped to a project via `projectId`
- File paths include the file ID for unique storage (e.g., `/uploads/photo/{fileId}/originals/`)
- Always ensure file operations respect project boundaries to prevent cross-project access
- Storage service in src/services/storage.ts handles both local and S3 storage

### Environment-Aware Configuration
- src/config/environment.ts provides centralized config for dev/staging/production
- LocalStack auto-detection: Checks for AWS_ENDPOINT containing 'localhost'
- CORS origins configured per environment (15+ allowed origins in development)
- Storage type switches between 'local' and 's3' based on environment
- Config validation runs at startup (validateEnvironment function)

### Service Layer Pattern
- Business logic separated into src/services/
- **auth.service.ts**: Token management with in-memory access token storage
- **storage.ts**: Abstracted storage layer (local filesystem or S3)
- **imageProcessor.ts**: Sharp-based image processing and thumbnailing
- **email.service.ts**: SES integration for transactional emails
- **content-visibility.service.ts**: Centralized visibility management

### Error Handling
- Express error middleware in src/server.ts:52-58
- Standard response format: `{ error: string }` or `{ message: string }`
- Stack traces only in development mode
- 404 handler for undefined routes

## Testing Pattern

Test scripts in `/scripts` follow a consistent pattern:
- `test-*.ts` scripts are executable via `npx tsx scripts/test-{feature}.ts`
- `./scripts/test-all.sh` runs all test scripts sequentially
- No Jest tests currently implemented despite test framework being configured
- Test scripts are integration tests that verify actual AWS/database connectivity

## Soft Delete Implementation

The schema uses a **mixed approach** for soft deletes:
- **Tasks**: Use `status` enum with values ACTIVE, COMPLETED, DELETED, ARCHIVED (no `deletedAt` field)
- **Project, Reference, Media, Event**: Have `deletedAt DateTime?` field for soft delete
- When implementing soft deletes:
  - For Tasks: Update `status` field to DELETED or ARCHIVED
  - For others: Set `deletedAt` to current timestamp
  - Always filter queries with `where: { deletedAt: null }` or `where: { status: 'ACTIVE' }`
- Events support restore via `POST /api/events/:id/restore` endpoint

## Troubleshooting & Debugging

### Common Issues

**Port 7779 already in use:**
- The start.sh script automatically kills existing processes on port 7779
- Manual: `lsof -ti:7779 | xargs kill -9`

**PostgreSQL container won't start:**
- Check if volume is corrupted: `docker volume ls`
- Remove and recreate: `docker rm -f cosmicspace-postgres`
- Then run `./start.sh` to recreate with volume mount

**LocalStack S3 data lost after container restart:**
- Verify volume is attached: `docker inspect cosmicspace-localstack | grep -A 5 Mounts`
- Must include: `cosmicboard-backend_localstack_data:/var/lib/localstack`
- If missing, remove container and run `./start.sh`

**Migration fails with "already exists" error:**
- Check migration status: `npx prisma migrate status`
- Apply pending: `npx prisma migrate deploy`
- Never use `prisma migrate reset` without backup!

**Development token not working:**
- Verify LocalStack is running: `docker ps | grep localstack`
- Check .env.localstack is loaded: `echo $AWS_ENDPOINT`
- Known dev tokens are auto-seeded for nmuthu@gmail.com (see auth.middleware.ts:59-106)

**Media files not loading:**
- Verify path structure: `/uploads/{mediaType}/{fileId}/originals/` or `/thumbnails/`
- Check S3 bucket in LocalStack: `aws --endpoint-url=http://localhost:4566 s3 ls s3://cosmicspace-media/`
- Verify MIME type headers in src/server.ts:22-43

### Logs and Monitoring

**Backend logs:**
- Start server shows: Environment, Port, Storage type, Health check URL
- Watch for: Prisma query logs (dev only), CORS warnings, AWS endpoint

**Container logs:**
```bash
docker logs cosmicspace-postgres     # PostgreSQL logs
docker logs cosmicspace-localstack   # LocalStack service logs
```

**Database inspection:**
```bash
npm run prisma:studio  # Visual database browser (port 5555)
docker exec -it cosmicspace-postgres psql -U admin -d cosmicspace  # Direct SQL
```