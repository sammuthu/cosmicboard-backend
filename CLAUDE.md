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

CosmicBoard Backend - A Node.js/Express API service with PostgreSQL database using Prisma ORM, designed for task and project management with multi-priority support.

## Infrastructure Configuration

**IMPORTANT**: All nginx, DNS, and reverse proxy configurations are centralized in:
```
/Users/sammuthu/Projects/nginx-reverse-proxy/
```

Do NOT place nginx, hosts, or dnsmasq configurations in individual project folders (cosmicboard, cosmicboard-mobile, or cosmicboard-backend).

### Domain Configuration
- **Primary Domain**: cosmicspace.app
- **Legacy Domain**: cosmic.board (redirects to cosmicspace.app)
- **Backend API**: Proxied via nginx from cosmicspace.app/api to localhost:7779
- **Nginx Config**: nginx-reverse-proxy/config/sites-available/cosmicspace.app.conf

## Essential Commands

### Development
```bash
npm run dev              # Start development server with nodemon (port 7779)
npm run build           # Compile TypeScript to JavaScript in ./dist
npm start               # Start production server from ./dist
```

### Database Management
```bash
npm run docker:up       # Start PostgreSQL and Redis containers
npm run docker:reset    # Reset Docker volumes and restart containers
npm run prisma:generate # Generate Prisma client after schema changes
npm run prisma:migrate  # Apply database migrations
npm run prisma:studio   # Open Prisma Studio UI (port 5555)
npm run prisma:seed     # Seed database with initial data
```

### Testing
```bash
npm test                # Run Jest tests (currently no tests implemented)
```

## Architecture

### Core Structure
- **src/server.ts**: Express server initialization, middleware setup, Prisma client
- **src/routes/**: API route definitions organized by resource
  - `index.ts`: Main router with health check
  - `projects.ts`: Project CRUD operations
  - `tasks.ts`: Task management within projects
  - `references.ts`: Reference/documentation management
- **src/controllers/**: Business logic (to be implemented)
- **src/middleware/**: Authentication, validation (to be implemented)
- **src/services/**: Data access layer (to be implemented)

### Database Schema (PostgreSQL via Prisma)
- **Project**: Core entity with tasks, references, and media
- **Task**: Priority levels (LOW, MEDIUM, HIGH, URGENT), status tracking
- **Reference**: Documentation/snippets with categories and tags
- **Media**: Photos, screenshots, and PDF files associated with projects
  - Types: photo, screenshot, pdf
  - Includes url, thumbnailUrl, size, mimeType, metadata
- Uses JSONB for flexible metadata storage

### Media Feature Implementation Status
**Important**: The Media feature implementation is documented in `photo-screenshots-pdf-feature.README.md`. This includes:
- Complete API endpoints specification
- File upload handling with formidable and sharp
- Thumbnail generation for images
- PDF metadata extraction
- Screenshot paste functionality
- Local file storage structure in `/uploads/`
- Cascading deletes on relationships

### API Pattern
All endpoints follow RESTful conventions:
- Base URL: `http://localhost:7779/api`
- Resources: `/projects`, `/tasks`, `/references`
- Nested resources: `/projects/:projectId/tasks`
- Standard CRUD operations with Express routing

### Key Technical Decisions
- **TypeScript**: Strict mode enabled with comprehensive type checking
- **Prisma ORM**: Type-safe database access with migrations
- **PostgreSQL**: JSONB fields for flexibility, array support for tags
- **Docker Compose**: Local development environment with PostgreSQL and Redis
- **Error Handling**: Centralized error middleware with environment-aware responses

## Development Workflow

1. Ensure Docker containers are running: `npm run docker:up`
2. Apply any schema changes: `npm run prisma:generate && npm run prisma:migrate`
3. Start dev server: `npm run dev`
4. Make changes - server auto-restarts via nodemon
5. Test endpoints at `http://localhost:7779/api`

## Environment Variables
Required in `.env`:
- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Server port (default 7779)
- `NODE_ENV`: development/production
- `CORS_ORIGIN`: Comma-separated allowed origins
- JWT secrets and Redis URL for future authentication implementation

## Current Implementation Status
- ✅ Basic CRUD APIs for projects, tasks, references
- ✅ Prisma schema and migrations
- ✅ Docker development environment
- ⏳ Authentication/authorization middleware pending
- ⏳ Input validation pending
- ⏳ Test coverage pending
- ⏳ Redis caching pending