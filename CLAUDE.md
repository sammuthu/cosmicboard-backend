# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ CRITICAL DATABASE SAFETY RULES

**NEVER use `prisma migrate reset` or any destructive database commands without explicit user consent!**

### Database Management Guidelines:
1. **Always backup data before migrations**: Use `npx tsx scripts/backup-data.ts`
2. **Use incremental migrations**: Never reset the database, use `prisma migrate dev` to create new migrations
3. **Restore data if needed**: Use `npx tsx scripts/restore-data.ts` to restore from backups
4. **Backup location**: All backups are stored in `/db-backup/` directory (git-versioned)

### Before ANY database schema changes:
1. Run backup: `npx tsx scripts/backup-data.ts`
2. Create migration: `npx prisma migrate dev --create-only`
3. Review migration file before applying
4. Apply migration: `npx prisma migrate dev`
5. If issues occur, restore: `npx tsx scripts/restore-data.ts`

## Project Overview

CosmicBoard Backend - A Node.js/Express API service with PostgreSQL database using Prisma ORM, designed for collaborative task and project management with multi-priority support, real-time features, and comprehensive AWS integration.

## Infrastructure Configuration

**IMPORTANT**: All nginx, DNS, and reverse proxy configurations are centralized in:
```
/Users/sammuthu/Projects/nginx-reverse-proxy/
```

Do NOT place nginx, hosts, or dnsmasq configurations in individual project folders.

### Domain Configuration
- **Primary Domain**: cosmicspace.app
- **Legacy Domain**: cosmic.board (redirects to cosmicspace.app)
- **Backend API**: Proxied via nginx from cosmicspace.app/api to localhost:7779
- **Nginx Config**: nginx-reverse-proxy/config/sites-available/cosmicspace.app.conf

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
```

### Testing
```bash
npm test                # Run Jest tests (framework ready, tests pending)
```

## Architecture

### Core Services
- **src/server.ts**: Express initialization, middleware, Prisma client
- **src/config/environment.ts**: Environment-aware configuration
- **src/services/aws/**: AWS SDK v3 services (S3, SES, Secrets Manager)
- **src/services/auth.service.ts**: JWT authentication with magic links
- **src/middleware/auth.middleware.ts**: Token validation and session management

### Authentication System
- **Magic Link Flow**: Email-based with 15-minute expiry
- **6-Digit Codes**: For mobile app authentication
- **JWT Tokens**: Access (15min) and refresh (7 days) tokens
- **Session Management**: Secure token rotation
- **Multi-Provider Support**: Email, Phone, Google, GitHub, Apple, Passkey

### AWS Integration
**LocalStack Development**:
- S3 buckets: `cosmicspace-media`, `cosmicspace-backups`
- SES email service with templates
- Secrets Manager for configuration
- Auto-switches between local and production

**Production Architecture**:
- ECS Fargate containers
- RDS PostgreSQL with read replicas
- CloudFront CDN
- Application Load Balancer

### Database Schema (Prisma)
- **User Management**: Profiles, sessions, connections
- **Projects**: Ownership, members, roles (OWNER, ADMIN, EDITOR, VIEWER)
- **Tasks**: Priority levels (LOW, MEDIUM, HIGH, URGENT)
- **Media**: Photos, screenshots, PDFs with thumbnails
- **References**: Documentation with categories and tags
- **Activities**: Comprehensive audit trail
- **Notifications**: Real-time user notifications

### Media Handling
- **Upload**: Formidable/Multer with size limits
- **Processing**: Sharp for thumbnails
- **Storage**: Local (`/uploads/`) or S3
- **PDF Support**: Metadata extraction with pdf-parse
- Implementation details in `photo-screenshots-pdf-feature.README.md`

### API Pattern
- Base URL: `http://localhost:7779/api`
- RESTful conventions with nested resources
- Standard CRUD operations
- JWT authentication required for protected routes

## Development Workflow

### LocalStack Setup (Recommended)
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

## Environment Variables

### Required
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/cosmicboard
PORT=7779
NODE_ENV=development
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
```

### AWS/LocalStack
```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test (for LocalStack)
AWS_SECRET_ACCESS_KEY=test (for LocalStack)
AWS_ENDPOINT=http://localhost:4566 (LocalStack)
S3_BUCKET=cosmicspace-media
SES_FROM_EMAIL=noreply@cosmicspace.app
```

### Feature Flags
```bash
ENABLE_AUTH=true
ENABLE_RATE_LIMIT=true
ENABLE_FILE_UPLOAD=true
MAX_FILE_SIZE=10485760  # 10MB
```

## Current Implementation Status
- ✅ Core CRUD APIs for all entities
- ✅ Magic link authentication system
- ✅ AWS integration with LocalStack
- ✅ Media upload and processing
- ✅ User management and roles
- ⏳ Jest testing framework (configured, no tests)
- ⏳ No linting configuration (.eslintrc)
- ⏳ Redis caching implementation pending
- Add to memory "Never reset the database but alter the table as we add new columns, apply all existing data to the user email nmuthu@gmail.com unless the data is already associated with the userId"