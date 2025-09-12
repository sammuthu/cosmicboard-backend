import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { config, getCorsConfig, validateEnvironment } from './config/environment';
import { prisma } from './lib/database';

// Load environment variables
dotenv.config();

// Validate environment configuration
validateEnvironment();

const app: Application = express();
const PORT = config.port;

// Middleware
app.use(cors(getCorsConfig()));
app.use(express.json({ limit: '10mb' })); // Allow larger payloads for base64 images
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files for uploads with proper MIME types
app.use('/uploads', express.static(config.storage.uploadDir, {
  setHeaders: (res, filePath) => {
    // Determine MIME type based on file path
    if (filePath.includes('/photo/') || filePath.includes('/screenshot/')) {
      // For images, check file extension or default to JPEG for thumbnails
      if (filePath.includes('/thumbnails/') || filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
        res.setHeader('Content-Type', 'image/jpeg');
      } else if (filePath.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png');
      } else if (filePath.endsWith('.gif')) {
        res.setHeader('Content-Type', 'image/gif');
      } else if (filePath.endsWith('.webp')) {
        res.setHeader('Content-Type', 'image/webp');
      } else {
        // Default to JPEG for images without extension
        res.setHeader('Content-Type', 'image/jpeg');
      }
    } else if (filePath.includes('/pdf/') || filePath.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
    }
  }
}));

// Import routes
import apiRoutes from './routes';

// API Routes
app.use('/api', apiRoutes);

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 CosmicBoard Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${config.name}`);
  console.log(`💾 Storage: ${config.storage.type}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📋 API docs: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
  await prisma.$disconnect();
  process.exit(0);
});

export default app;
