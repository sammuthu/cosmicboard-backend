#!/bin/bash

# Simple startup script for CosmicBoard Backend
# Focuses on essentials: PostgreSQL + Backend Server

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting CosmicBoard Backend (Simple Mode)${NC}"
echo ""

# 1. Ensure PostgreSQL is running
echo -e "${BLUE}Checking PostgreSQL...${NC}"
if docker ps | grep -q "cosmicspace-postgres"; then
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"
else
    echo -e "${YELLOW}Starting PostgreSQL...${NC}"
    docker start cosmicspace-postgres 2>/dev/null || {
        docker run -d \
            --name cosmicspace-postgres \
            -e POSTGRES_USER=admin \
            -e POSTGRES_PASSWORD=localdev123 \
            -e POSTGRES_DB=cosmicspace \
            -p 5432:5432 \
            postgres:15-alpine
    }
    echo "Waiting for PostgreSQL to be ready..."
    sleep 5
fi

# 2. Check database connection
until docker exec cosmicspace-postgres pg_isready -U admin > /dev/null 2>&1; do
    echo "Waiting for PostgreSQL..."
    sleep 2
done
echo -e "${GREEN}✓ PostgreSQL is ready${NC}"

# 3. Generate Prisma client
echo -e "${BLUE}Generating Prisma client...${NC}"
npm run prisma:generate > /dev/null 2>&1
echo -e "${GREEN}✓ Prisma client generated${NC}"

# 4. Apply migrations (safe - preserves data)
echo -e "${BLUE}Applying database migrations...${NC}"
DATABASE_URL=postgresql://admin:localdev123@localhost:5432/cosmicspace \
    npx prisma migrate deploy 2>/dev/null || echo -e "${YELLOW}Migrations already applied${NC}"

# 5. Run data migration to associate with nmuthu@gmail.com
if [ -f scripts/migrate-preserve-data.ts ]; then
    echo -e "${BLUE}Ensuring data is associated with nmuthu@gmail.com...${NC}"
    DATABASE_URL=postgresql://admin:localdev123@localhost:5432/cosmicspace \
        npx tsx scripts/migrate-preserve-data.ts 2>/dev/null || true
fi

# 6. Start the backend server
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Backend server starting on port 7779${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "  API Health: ${BLUE}http://localhost:7779/api/health${NC}"
echo -e "  API Docs:   ${BLUE}http://localhost:7779/api${NC}"
echo -e "  Prisma:     Run ${YELLOW}npm run prisma:studio${NC} in another terminal"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""

# Start server with environment variables
DATABASE_URL=postgresql://admin:localdev123@localhost:5432/cosmicspace \
PORT=7779 \
NODE_ENV=development \
npm run dev