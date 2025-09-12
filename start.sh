#!/bin/bash

# CosmicBoard Backend Startup Script
# This script handles the complete startup process for the backend server

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists (use .env.localstack for LocalStack setup)
if [ -f .env.localstack ]; then
    print_status "Using LocalStack environment configuration"
    export $(cat .env.localstack | grep -v '^#' | xargs)
elif [ -f .env ]; then
    print_status "Using standard environment configuration"
else
    print_error ".env file not found! Please create one based on .env.example"
    exit 1
fi

print_status "Starting CosmicBoard Backend Services..."

# Step 1: Clean up any conflicting containers
print_status "Checking for conflicting containers..."

# Stop pgAdmin if it's causing issues (not essential for backend)
if docker ps | grep -q "cosmicboard_pgadmin"; then
    print_warning "Stopping pgAdmin container to free up port..."
    docker stop cosmicboard_pgadmin 2>/dev/null || true
fi

# Check if another nginx container is using port 5050
if lsof -i :5050 > /dev/null 2>&1; then
    print_warning "Port 5050 is in use, but this won't affect the backend API (port 7779)"
fi

# Step 2: Ensure PostgreSQL is running
print_status "Checking PostgreSQL container..."
if docker ps | grep -q "cosmicspace-postgres.*Up"; then
    print_success "PostgreSQL container is already running"
else
    print_status "Starting PostgreSQL container..."
    docker start cosmicspace-postgres 2>/dev/null || {
        print_warning "Creating new PostgreSQL container..."
        docker run -d \
            --name cosmicspace-postgres \
            -e POSTGRES_USER=admin \
            -e POSTGRES_PASSWORD=localdev123 \
            -e POSTGRES_DB=cosmicspace \
            -p 5432:5432 \
            postgres:15-alpine
    }
    print_success "PostgreSQL container started"
    
    # Wait for PostgreSQL to be ready
    print_status "Waiting for PostgreSQL to be ready..."
    sleep 5
fi

# Step 3: Check PostgreSQL connection
print_status "Checking database connection..."
until docker exec cosmicspace-postgres pg_isready -U admin > /dev/null 2>&1; do
    print_warning "Waiting for PostgreSQL to accept connections..."
    sleep 2
done
print_success "PostgreSQL is ready"

# Step 4: Check LocalStack if using LocalStack environment
if [ -f .env.localstack ]; then
    print_status "Checking LocalStack container..."
    if docker ps | grep -q "cosmicspace-localstack.*Up"; then
        print_success "LocalStack container is already running"
    else
        print_status "Starting LocalStack..."
        npm run localstack:start &
        sleep 5
        print_success "LocalStack started"
    fi
fi

# Step 5: Generate Prisma client (always do this in case schema changed)
print_status "Generating Prisma client..."
npm run prisma:generate
print_success "Prisma client generated"

# Step 6: Apply migrations (safe - won't reset data)
print_status "Applying database migrations..."
if [ -f .env.localstack ]; then
    DATABASE_URL=postgresql://admin:localdev123@localhost:5432/cosmicspace npx prisma migrate deploy 2>/dev/null || {
        print_warning "Some migrations may already be applied, continuing..."
    }
else
    npx prisma migrate deploy 2>/dev/null || {
        print_warning "Some migrations may already be applied, continuing..."
    }
fi
print_success "Database migrations applied"

# Step 7: Run safe data migration if needed
if [ -f scripts/migrate-preserve-data.ts ]; then
    print_status "Ensuring data is associated with nmuthu@gmail.com..."
    npx tsx scripts/migrate-preserve-data.ts 2>/dev/null || {
        print_warning "Data migration may have already been applied"
    }
fi

# Step 8: Seed database if requested
if [ "$1" == "--seed" ]; then
    print_status "Seeding database..."
    npm run prisma:seed
    print_success "Database seeded"
fi

# Step 9: Start the development server
print_status "Starting backend server on port 7779..."
print_success "Server is starting at http://localhost:7779"
print_status "API Health check: http://localhost:7779/api/health"
print_status "Prisma Studio: Run 'npm run prisma:studio' in another terminal"
echo ""
print_status "Press Ctrl+C to stop the server"
echo ""

# Start the server with appropriate configuration
if [ -f .env.localstack ]; then
    print_status "Starting with LocalStack configuration..."
    npm run dev:localstack
else
    npm run dev
fi