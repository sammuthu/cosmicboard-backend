#!/bin/bash

echo "Setting up LocalStack AWS resources..."

# Configure AWS CLI for LocalStack
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_ENDPOINT_URL=http://localhost:4566

# Create S3 buckets
echo "Creating S3 buckets..."
awslocal s3 mb s3://cosmicspace-media
awslocal s3 mb s3://cosmicspace-backups

# Set bucket CORS configuration for media bucket
echo "Setting CORS configuration..."
awslocal s3api put-bucket-cors --bucket cosmicspace-media --cors-configuration '{
  "CORSRules": [
    {
      "AllowedOrigins": ["http://localhost:3000", "http://localhost:7777", "http://localhost:8081"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}'

# Set up SES verified email addresses
echo "Setting up SES verified emails..."
awslocal ses verify-email-identity --email-address noreply@cosmicspace.app
awslocal ses verify-email-identity --email-address nmuthu@gmail.com
awslocal ses verify-email-identity --email-address sammuthu@me.com

# Create a secret in Secrets Manager (for JWT secret)
echo "Creating secrets..."
awslocal secretsmanager create-secret \
  --name cosmicspace/jwt-secret \
  --secret-string "local-development-jwt-secret-change-in-production" \
  2>/dev/null || echo "Secret already exists"

echo "LocalStack AWS resources setup complete!"

# List resources
echo ""
echo "Resources created:"
echo "=================="
echo "S3 Buckets:"
awslocal s3 ls

echo ""
echo "Verified Email Addresses:"
awslocal ses list-verified-email-addresses

echo ""
echo "Secrets:"
awslocal secretsmanager list-secrets --query "SecretList[*].Name" --output table
