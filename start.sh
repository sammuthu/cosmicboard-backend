#!/bin/bash

# CosmicBoard Backend Startup Script
# This script handles the complete startup process for the backend server

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

# Kill any existing backend processes on port 7779
kill_existing_backend() {
    local pid=$(lsof -ti:7779 2>/dev/null || true)
    if [ ! -z "$pid" ]; then
        print_status "Killing existing backend process on port 7779 (PID: $pid)..."
        kill -9 $pid 2>/dev/null || true
        sleep 1
    fi
}

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  🚀 CosmicBoard Backend Startup Script              ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Kill existing backend process
kill_existing_backend

# Always use LocalStack setup for consistency
if [ ! -f .env.localstack ]; then
    print_error ".env.localstack file not found! Please ensure LocalStack is configured."
    exit 1
fi

print_status "Using LocalStack environment configuration"
set -a  # Enable automatic export of variables
source .env.localstack
set +a  # Disable automatic export

# Quick mode - skip checks if requested
if [ "$1" != "--quick" ]; then
    print_status "Starting CosmicBoard Backend Services..."
    
    # Stop pgAdmin if it's causing issues (not essential for backend)
    if docker ps | grep -q "cosmicboard_pgadmin"; then
        docker stop cosmicboard_pgadmin 2>/dev/null || true
    fi
fi

# Step 2: Ensure PostgreSQL is running
print_status "Checking PostgreSQL container..."
if docker ps | grep -q "cosmicspace-postgres.*Up"; then
    print_success "PostgreSQL container is already running"
else
    # Check if container exists but is stopped
    if docker ps -a | grep -q "cosmicspace-postgres"; then
        print_status "PostgreSQL container exists but is stopped, starting it..."
        if docker start cosmicspace-postgres 2>&1 | grep -q "Error"; then
            print_error "Failed to start existing container. Removing and recreating..."
            docker rm -f cosmicspace-postgres > /dev/null 2>&1
            docker run -d \
                --name cosmicspace-postgres \
                -e POSTGRES_USER=admin \
                -e POSTGRES_PASSWORD=localdev123 \
                -e POSTGRES_DB=cosmicspace \
                -e PGDATA=/data/postgres \
                -v cosmicboard-backend_postgres_data:/data/postgres \
                -p 5454:5432 \
                postgres:15-alpine
            print_success "PostgreSQL container recreated and started"
        else
            print_success "PostgreSQL container started"
        fi
    else
        print_status "Creating new PostgreSQL container..."
        docker run -d \
            --name cosmicspace-postgres \
            -e POSTGRES_USER=admin \
            -e POSTGRES_PASSWORD=localdev123 \
            -e POSTGRES_DB=cosmicspace \
            -e PGDATA=/data/postgres \
            -v cosmicboard-backend_postgres_data:/data/postgres \
            -p 5454:5432 \
            postgres:15-alpine
        print_success "PostgreSQL container created and started"
    fi

    # Wait for PostgreSQL to be ready
    print_status "Waiting for PostgreSQL to be ready..."
    sleep 5
fi

# Step 3: Check PostgreSQL connection
print_status "Checking database connection..."
RETRY_COUNT=0
MAX_RETRIES=15
until docker exec cosmicspace-postgres pg_isready -U admin > /dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        print_error "PostgreSQL failed to start after $MAX_RETRIES attempts"
        print_error "Checking container logs:"
        docker logs --tail 20 cosmicspace-postgres
        print_error "You may need to run: docker rm -f cosmicspace-postgres && ./start.sh"
        exit 1
    fi
    print_warning "Waiting for PostgreSQL to accept connections... (attempt $RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done
print_success "PostgreSQL is ready"

# Step 4: Start LocalStack only if not already running
print_status "Checking LocalStack container..."
if docker ps | grep -q "cosmicspace-localstack.*Up"; then
    print_success "LocalStack container is already running"
else
    # Check if container exists but is stopped
    if docker ps -a | grep -q "cosmicspace-localstack"; then
        print_status "LocalStack container exists but is stopped, starting it..."
        docker start cosmicspace-localstack
        print_success "LocalStack container started"
    else
        print_status "Creating LocalStack container with persistent storage..."
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
        print_success "LocalStack container created and started"

        # Wait for LocalStack to be ready
        print_status "Waiting for LocalStack to be ready..."
        sleep 5

        # Initialize AWS resources
        print_status "Initializing AWS resources (S3 buckets, SES)..."
        docker exec cosmicspace-localstack sh -c '
            awslocal s3 mb s3://cosmicspace-media 2>/dev/null || true
            awslocal s3 mb s3://cosmicspace-backups 2>/dev/null || true
            awslocal ses verify-email-identity --email-address noreply@cosmicspace.app 2>/dev/null || true
            awslocal ses verify-email-identity --email-address nmuthu@gmail.com 2>/dev/null || true
            awslocal ses verify-email-identity --email-address sammuthu@me.com 2>/dev/null || true
        ' > /dev/null 2>&1
        print_success "AWS resources initialized"
    fi

    # Wait a bit for LocalStack to initialize
    sleep 2
fi

# Step 5: Generate Prisma client (always do this in case schema changed)
print_status "Generating Prisma client..."
npm run prisma:generate > /dev/null 2>&1
print_success "Prisma client generated"

# Step 6: Apply migrations only if --migrate flag is passed
if [ "$1" == "--migrate" ] || [ "$2" == "--migrate" ]; then
    print_status "Applying database migrations..."
    DATABASE_URL=postgresql://admin:localdev123@localhost:5454/cosmicspace npx prisma migrate deploy 2>/dev/null || {
        print_warning "Some migrations may already be applied, continuing..."
    }
    print_success "Database migrations applied"
fi

# Skip data migration script - database is stable

# Step 8: Seed database if requested
if [ "$1" == "--seed" ]; then
    print_status "Seeding database..."
    npm run prisma:seed
    print_success "Database seeded"
fi

# Step 9: Start the development server
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  ✅ All services ready - Starting backend server    ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
print_success "Backend URL: http://localhost:7779"
print_success "Health check: http://localhost:7779/api/health"
print_status "Prisma Studio: Run 'npm run prisma:studio' in another terminal"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Backend Logs:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Start the server with appropriate configuration
if [ -f .env.localstack ]; then
    npm run dev:localstack
else
    npm run dev
fi