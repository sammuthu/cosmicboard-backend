# CosmicBoard Backend API

A scalable, cloud-first backend API for CosmicBoard built with Node.js, Express, PostgreSQL, and Prisma.

## Architecture

- **Database**: PostgreSQL (with JSONB support for flexible data)
- **ORM**: Prisma (type-safe database access)
- **Cache**: Redis (session management & caching)
- **API**: RESTful with JWT authentication
- **Deployment**: Docker for local, AWS for production

## Features

- 🔐 JWT-based authentication with refresh tokens
- 💼 Multi-tenant project management
- 📊 Task tracking with priority levels (SUPERNOVA, STELLAR, NEBULA)
- 📝 Code snippets and documentation storage
- 💳 Stripe subscription management
- 🚀 Scalable PostgreSQL with JSON support
- ⚡ Redis caching for performance
- 🔍 Full-text search capabilities

## Prerequisites

- Node.js 18+ 
- Docker & Docker Compose
- PostgreSQL 16 (via Docker)
- Redis (via Docker)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Docker Services

```bash
# Start PostgreSQL and Redis
npm run docker:up

# Or reset everything
npm run docker:reset
```

### 3. Setup Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Seed database
npm run prisma:seed
```

### 4. Start Development Server

```bash
npm run dev
```

Server will be available at http://localhost:7778

### 5. Access Database UI

```bash
# Prisma Studio
npm run prisma:studio

# pgAdmin (if using docker-compose)
# http://localhost:5050
# Email: admin@cosmicboard.com
# Password: admin123
```

## Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://cosmicuser:cosmic123!@localhost:5432/cosmicboard?schema=public"

# Server
PORT=7778
NODE_ENV=development

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Redis
REDIS_URL=redis://localhost:6379

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:7777
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

### Projects
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get project by ID
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Tasks
- `GET /api/projects/:projectId/tasks` - Get project tasks
- `GET /api/projects/:projectId/tasks/:taskId` - Get task
- `POST /api/projects/:projectId/tasks` - Create task
- `PUT /api/projects/:projectId/tasks/:taskId` - Update task
- `DELETE /api/projects/:projectId/tasks/:taskId` - Delete task

### References
- `GET /api/projects/:projectId/references` - Get references
- `POST /api/projects/:projectId/references` - Create reference
- `PUT /api/projects/:projectId/references/:id` - Update reference
- `DELETE /api/projects/:projectId/references/:id` - Delete reference

### User
- `GET /api/user/profile` - Get profile
- `PUT /api/user/profile` - Update profile
- `GET /api/user/subscription` - Get subscription status

## Database Schema

The database uses PostgreSQL with the following main models:

- **User** - Authentication and profile
- **Project** - Project management
- **Task** - Tasks with priorities and statuses
- **Reference** - Code snippets and documentation
- **Subscription** - Premium features
- **RefreshToken** - JWT refresh tokens
- **ActivityLog** - Audit trail

See `prisma/schema.prisma` for the complete schema.

## Scripts

```bash
# Development
npm run dev              # Start dev server with hot reload
npm run build           # Build for production
npm start               # Start production server

# Database
npm run prisma:generate # Generate Prisma client
npm run prisma:migrate  # Run migrations
npm run prisma:studio   # Open Prisma Studio
npm run prisma:seed     # Seed database

# Docker
npm run docker:up       # Start Docker services
npm run docker:down     # Stop Docker services
npm run docker:reset    # Reset Docker volumes

# Testing
npm test                # Run tests
```

## Deployment

### Local Development

```bash
npm run docker:up
npm run dev
```

### Production (AWS)

1. **RDS PostgreSQL**: Use AWS RDS for managed PostgreSQL
2. **ElastiCache**: Use for Redis caching
3. **ECS/Fargate**: Deploy containerized API
4. **API Gateway**: For API management
5. **CloudFront**: CDN for static assets

### Environment-specific configs:

- Development: `.env.development`
- Staging: `.env.staging`
- Production: `.env.production`

## Migration from MongoDB

To migrate existing MongoDB data:

1. Export MongoDB data as JSON
2. Run migration script: `npm run migrate:mongo`
3. Verify data in PostgreSQL

## Performance Optimizations

- PostgreSQL indexes on frequently queried fields
- Redis caching for session management
- Connection pooling with Prisma
- JSONB fields for flexible metadata
- Full-text search indexes

## Security

- JWT tokens with refresh mechanism
- Bcrypt password hashing
- Rate limiting on API endpoints
- CORS configuration
- Input validation with Joi/Zod
- SQL injection prevention via Prisma

## Monitoring

- Health check endpoint: `/health`
- Prisma query logging in development
- Error tracking with Sentry (production)
- Performance monitoring with DataDog

## Contributing

1. Create feature branch
2. Make changes
3. Run tests
4. Submit PR

## License

MIT