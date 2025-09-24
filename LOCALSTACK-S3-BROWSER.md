# LocalStack S3 Browser Setup with Cyberduck

## Installation Complete ✅

Cyberduck has been installed and configured for your LocalStack S3 setup.

## Connection Details

When Cyberduck opens, use these settings:

### Quick Connect:
1. **Server**: `localhost`
2. **Port**: `4566`
3. **Username**: `test`
4. **Password**: `test`
5. **Path**: Leave empty to see all buckets

### Or use the profile that was just installed:
- The LocalStack profile has been added to Cyberduck
- Look for "LocalStack S3" in the connection dropdown

## Your S3 Buckets

Once connected, you'll see:
- `cosmicspace-media/` - Main media storage bucket
  - `photo/` - Uploaded photos with thumbnails
  - `screenshot/` - Screenshots with thumbnails
  - `pdf/` - PDF documents

## Features in Cyberduck

- **Browse**: Navigate through folders visually
- **Download**: Drag & drop files to your desktop
- **Upload**: Drag files into Cyberduck to upload to S3
- **Preview**: Double-click files to preview them
- **Delete**: Right-click files to delete
- **Info**: Get file details, URLs, and metadata

## Alternative: Command Line Access

If you prefer terminal commands:
```bash
# List all files
docker exec localstack awslocal s3 ls s3://cosmicspace-media/ --recursive

# Download a file
docker exec localstack awslocal s3 cp s3://cosmicspace-media/[path] ./local-file

# Upload a file
docker exec localstack awslocal s3 cp ./local-file s3://cosmicspace-media/[path]
```

## Troubleshooting

If connection fails:
1. Ensure LocalStack is running: `docker ps | grep localstack`
2. Start LocalStack if needed: `npm run localstack:start`
3. Check port 4566 is accessible: `curl http://localhost:4566/_localstack/health`

## Note

Files are stored inside the Docker container and will be lost if you run `docker-compose down -v`. To persist files, add a volume mount to your docker-compose configuration.