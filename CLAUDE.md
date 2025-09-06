# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CosmicBoard Backend - A Node.js/Express API service with PostgreSQL database using Prisma ORM, designed for task and project management with multi-priority support.

## Essential Commands

### Development
```bash
npm run dev              # Start development server with nodemon (port 7778)
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
- Base URL: `http://localhost:7778/api`
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
5. Test endpoints at `http://localhost:7778/api`

## Environment Variables
Required in `.env`:
- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Server port (default 7778)
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