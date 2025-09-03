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

# Check if .env file exists
if [ ! -f .env ]; then
    print_error ".env file not found! Please create one based on .env.example"
    exit 1
fi

print_status "Starting CosmicBoard Backend Services..."

# Step 1: Check and start Docker containers if needed
print_status "Checking Docker containers..."
if docker compose ps | grep -q "cosmicboard_postgres.*Up"; then
    print_success "PostgreSQL container is running"
else
    print_status "Starting Docker containers..."
    npm run docker:up
    print_success "Docker containers started"
    
    # Wait for PostgreSQL to be ready
    print_status "Waiting for PostgreSQL to be ready..."
    sleep 5
fi

# Step 2: Check PostgreSQL connection
print_status "Checking database connection..."
until docker exec cosmicboard_postgres pg_isready -U cosmicuser > /dev/null 2>&1; do
    print_warning "Waiting for PostgreSQL to accept connections..."
    sleep 2
done
print_success "PostgreSQL is ready"

# Step 3: Generate Prisma client (always do this in case schema changed)
print_status "Generating Prisma client..."
npm run prisma:generate
print_success "Prisma client generated"

# Step 4: Sync database schema (migration complete, just ensure schema is in sync)
print_status "Syncing database schema..."
npx prisma db push --skip-generate
print_success "Database schema synced"

# Step 5: Check if we need to seed the database (only if explicitly requested)
if [ "$1" == "--seed" ]; then
    print_status "Seeding database..."
    npm run prisma:seed
    print_success "Database seeded"
fi

# Step 6: Start other services if requested
if [ "$1" == "--all" ]; then
    print_status "Starting frontend services..."
    
    # Start web frontend
    if [ -f ../cosmicboard/start.sh ]; then
        print_status "Starting web frontend..."
        (cd ../cosmicboard && ./start.sh --backend-only) &
    fi
    
    # Start mobile frontend (if needed)
    if [ "$2" == "--mobile" ] && [ -f ../cosmicboard-mobile/start.sh ]; then
        print_status "Starting mobile frontend..."
        (cd ../cosmicboard-mobile && ./start.sh --backend-only) &
    fi
    
    sleep 2
fi

# Step 7: Start the development server
print_status "Starting backend server on port 7778..."
print_success "Server is starting at http://localhost:7778"
print_status "API Health check: http://localhost:7778/api/health"
print_status "Prisma Studio: Run 'npm run prisma:studio' in another terminal"
echo ""
print_status "Press Ctrl+C to stop the server"
echo ""

# Start the server
npm run dev