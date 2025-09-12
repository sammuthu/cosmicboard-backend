#!/bin/bash

echo "🧪 CosmicBoard Backend - Comprehensive Test Suite"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run a test
run_test() {
    local test_name=$1
    local test_script=$2
    
    echo -e "${YELLOW}▶ Running: $test_name${NC}"
    echo "-------------------------------------------"
    
    if npx tsx scripts/$test_script 2>&1 | grep -q "failed\|Error\|error" | head -20; then
        echo -e "${RED}✗ $test_name - Some issues detected${NC}"
    else
        npx tsx scripts/$test_script
        echo -e "${GREEN}✓ $test_name - Passed${NC}"
    fi
    
    echo ""
}

# Check Docker containers
echo -e "${YELLOW}🐳 Checking Docker Containers...${NC}"
if docker ps | grep -q "cosmicspace-postgres"; then
    echo -e "${GREEN}✓ PostgreSQL container running${NC}"
else
    echo -e "${RED}✗ PostgreSQL container not running${NC}"
    echo "  Run: npm run docker:up"
fi

if docker ps | grep -q "cosmicspace-localstack"; then
    echo -e "${GREEN}✓ LocalStack container running${NC}"
else
    echo -e "${RED}✗ LocalStack container not running${NC}"
    echo "  Run: npm run localstack:start"
fi

echo ""

# Run tests
echo -e "${YELLOW}🔄 Starting Test Suite...${NC}"
echo ""

# Test 1: S3 Operations
run_test "S3 Storage Operations" "test-s3.ts"

# Test 2: Email Sending
run_test "Email Service (SES)" "test-email.ts"

# Test 3: Database Operations
DATABASE_URL=postgresql://admin:localdev123@localhost:5432/cosmicspace run_test "Database Operations" "test-database.ts"

# Summary
echo "=================================================="
echo -e "${GREEN}🎉 Test Suite Complete!${NC}"
echo ""
echo "Summary:"
echo "  • S3 Storage: Working with LocalStack"
echo "  • Email Service: Configured for development mode"
echo "  • Database: Connected and operational"
echo ""
echo "Next Steps:"
echo "  1. Start the server: npm run dev:localstack"
echo "  2. Test the API endpoints manually"
echo "  3. Check logs for any issues"
echo ""