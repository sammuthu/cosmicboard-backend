# Photo, Screenshots, and PDF Feature - Backend Changes

## Overview
This document tracks all backend changes made to support Photos, Screenshots, and PDF features in CosmicBoard web application. These changes should be implemented in the backend project to support both web and mobile clients.

## Database Schema Changes

### New Collections/Tables

#### 1. Media Collection/Table
```typescript
interface Media {
  id: string;
  projectId: string;
  type: 'photo' | 'screenshot' | 'pdf';
  name: string;
  originalName: string;
  url: string;
  thumbnailUrl?: string;
  size: number;
  mimeType: string;
  metadata: {
    width?: number;
    height?: number;
    pages?: number; // for PDFs
    description?: string;
  };
  uploadedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Database Indexes
- `projectId` - for fast project-based queries
- `type` - for filtering by media type
- `createdAt` - for sorting by upload date

## API Endpoints

### Base URL: `/api/media`

#### 1. Upload Media
- **POST** `/api/media/upload`
- **Body**: FormData with file, projectId, type, name (optional)
- **Response**: Media object with URLs
- **Features**:
  - Auto-generates thumbnails for images
  - Extracts PDF metadata (page count)
  - Validates file types and sizes
  - Max file size: 10MB for images, 50MB for PDFs

#### 2. List Media
- **GET** `/api/media?projectId={id}&type={type}`
- **Query Params**:
  - `projectId` (required)
  - `type` (optional): 'photo' | 'screenshot' | 'pdf'
  - `page` (optional): for pagination
  - `limit` (optional): items per page (default: 20)
- **Response**: Array of Media objects with pagination info

#### 3. Get Single Media
- **GET** `/api/media/{id}`
- **Response**: Complete Media object with full URL

#### 4. Update Media
- **PUT** `/api/media/{id}`
- **Body**: { name, description }
- **Response**: Updated Media object

#### 5. Delete Media
- **DELETE** `/api/media/{id}`
- **Response**: Success message
- **Note**: Also deletes associated files from storage

#### 6. Paste Screenshot
- **POST** `/api/media/screenshot`
- **Body**: { projectId, imageData (base64), name }
- **Response**: Media object
- **Features**: Converts base64 to file, generates thumbnail

## File Storage Structure

```
uploads/
├── photos/
│   ├── {projectId}/
│   │   ├── originals/
│   │   └── thumbnails/
├── screenshots/
│   ├── {projectId}/
│   │   ├── originals/
│   │   └── thumbnails/
└── pdfs/
    └── {projectId}/
```

## Environment Variables

```env
# File upload settings
MAX_FILE_SIZE_MB=50
ALLOWED_IMAGE_TYPES=jpg,jpeg,png,gif,webp
ALLOWED_PDF_TYPES=pdf
THUMBNAIL_WIDTH=200
THUMBNAIL_HEIGHT=200

# Storage settings (choose one)
STORAGE_TYPE=local # or 's3', 'cloudinary'
UPLOAD_DIR=./uploads

# If using S3
AWS_BUCKET_NAME=
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# If using Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## Migration Requirements

### For MongoDB (Mongoose)
```javascript
// Add to existing Project model
media: [{
  type: Schema.Types.ObjectId,
  ref: 'Media'
}]
```

### For PostgreSQL (Prisma)
```prisma
model Media {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  type        MediaType
  name        String
  originalName String
  url         String
  thumbnailUrl String?
  size        Int
  mimeType    String
  metadata    Json
  uploadedBy  String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([projectId])
  @@index([type])
  @@index([createdAt])
}

enum MediaType {
  photo
  screenshot
  pdf
}
```

## Security Considerations

1. **File Validation**:
   - Check MIME types
   - Verify file extensions
   - Scan for malicious content
   - Limit file sizes

2. **Access Control**:
   - Verify user owns project before upload
   - Check permissions for view/delete
   - Use signed URLs for private files

3. **Rate Limiting**:
   - Limit uploads per user per hour
   - Implement file count limits per project

## Error Codes

- `400` - Invalid file type or size
- `401` - Unauthorized
- `403` - Forbidden (no access to project)
- `404` - Media or project not found
- `413` - File too large
- `429` - Too many uploads
- `500` - Server error during upload/processing

## Implementation Notes

1. **Thumbnail Generation**:
   - Use Sharp (Node.js) or similar library
   - Generate on upload, not on request
   - Store separately from originals

2. **PDF Processing**:
   - Use pdf-lib or pdf.js for metadata extraction
   - Consider generating preview images for PDFs

3. **Performance**:
   - Implement CDN for serving files
   - Use streaming for large files
   - Cache thumbnails aggressively

4. **Mobile Optimization**:
   - Provide multiple image sizes
   - Support progressive loading
   - Implement lazy loading for lists

## Testing Checklist

- [ ] Upload various image formats
- [ ] Upload PDFs of different sizes
- [ ] Test screenshot paste functionality
- [ ] Verify thumbnail generation
- [ ] Test pagination with large datasets
- [ ] Verify file deletion removes physical files
- [ ] Test access control and permissions
- [ ] Verify rate limiting works
- [ ] Test error handling for invalid files

## Version History

- **v1.0.0** (2025-01-05): Initial implementation with Photos, Screenshots, and PDFs support

---
Last Updated: 2025-01-05