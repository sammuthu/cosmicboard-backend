#!/bin/bash

echo "🚀 Starting LocalStack and PostgreSQL for CosmicSpace development..."

# Start Docker if not running
if ! docker info > /dev/null 2>&1; then
    echo "Docker is not running. Starting Docker Desktop..."
    open -a Docker
    echo "Waiting for Docker to start..."
    while ! docker info > /dev/null 2>&1; do
        sleep 2
    done
    echo "Docker is running!"
fi

# Stop any existing containers
echo "Stopping existing containers..."
docker-compose -f docker-compose.localstack.yml down

# Start LocalStack and PostgreSQL
echo "Starting LocalStack and PostgreSQL..."
docker-compose -f docker-compose.localstack.yml up -d

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 5

# Check LocalStack health
until curl -s http://localhost:4566/_localstack/health | grep -q '"services":'; do
    echo "Waiting for LocalStack to be ready..."
    sleep 2
done

echo "✅ LocalStack is ready!"

# Run initialization script
echo "Initializing AWS resources..."
docker exec cosmicspace-localstack sh -c "cd /docker-entrypoint-initaws.d && sh 01-setup-aws-resources.sh"

# Check PostgreSQL
until docker exec cosmicspace-postgres pg_isready -U admin -d cosmicspace > /dev/null 2>&1; do
    echo "Waiting for PostgreSQL to be ready..."
    sleep 2
done

echo "✅ PostgreSQL is ready!"

# Run Prisma migrations
echo "Running database migrations..."
cd /Users/sammuthu/Projects/cosmicboard-backend
npx prisma migrate deploy

echo ""
echo "==================================="
echo "✨ LocalStack Development Environment Ready!"
echo "==================================="
echo ""
echo "Services running:"
echo "  - LocalStack: http://localhost:4566"
echo "  - PostgreSQL: localhost:5432"
echo ""
echo "S3 Buckets created:"
echo "  - cosmicspace-media"
echo "  - cosmicspace-backups"
echo ""
echo "Verified emails:"
echo "  - noreply@cosmicspace.app"
echo "  - nmuthu@gmail.com"
echo "  - sammuthu@me.com"
echo ""
echo "To test S3:"
echo "  awslocal s3 ls"
echo ""
echo "To test SES:"
echo "  awslocal ses list-verified-email-addresses"
echo ""
echo "To stop services:"
echo "  docker-compose -f docker-compose.localstack.yml down"
echo ""
echo "Start your backend with:"
echo "  npm run dev:localstack"
echo "==================================="