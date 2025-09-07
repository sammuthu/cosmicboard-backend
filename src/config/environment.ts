/**
 * Environment Configuration for CosmicBoard Backend
 * Centralized configuration for different deployment environments
 */

export type Environment = 'development' | 'staging' | 'production'

interface EnvironmentConfig {
  name: Environment
  port: number
  cors: {
    origins: string[]
    credentials: boolean
  }
  database: {
    url: string
    logging: boolean
  }
  storage: {
    type: 'local' | 's3' | 'cloudinary'
    uploadDir: string
    maxFileSize: number
    allowedImageTypes: string[]
    allowedPdfTypes: string[]
    thumbnailSize: { width: number; height: number }
  }
  aws?: {
    accessKeyId?: string
    secretAccessKey?: string
    region?: string
    bucketName?: string
  }
  features: {
    authentication: boolean
    rateLimiting: boolean
    fileUpload: boolean
  }
}

// Get current environment from ENV variable
const getEnvironment = (): Environment => {
  return (process.env.NODE_ENV as Environment) || 'development'
}

// Environment configurations
const configs: Record<Environment, EnvironmentConfig> = {
  development: {
    name: 'development',
    port: parseInt(process.env.PORT || '7779'),
    cors: {
      origins: [
        'http://localhost:3000',
        'http://localhost:7777',
        'http://localhost:8081',
        'http://localhost:8082',
        'http://cosmic.board',
        'https://cosmic.board',
        'http://cosmic.board:8888',
        'https://cosmic.board:8888',
        'http://m.cosmic.board',
        'https://m.cosmic.board',
        'http://cosmicspace.app',
        'https://cosmicspace.app',
        'http://www.cosmicspace.app',
        'https://www.cosmicspace.app',
        'http://api.cosmicspace.app',
        'https://api.cosmicspace.app',
        'http://192.168.0.18:7777',
        'http://192.168.0.18:8888'
      ],
      credentials: true
    },
    database: {
      url: process.env.DATABASE_URL || 'postgresql://cosmicuser:cosmic123!@localhost:5432/cosmicboard',
      logging: true
    },
    storage: {
      type: 'local',
      uploadDir: process.env.UPLOAD_DIR || './uploads',
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE_MB || '50') * 1024 * 1024, // Convert MB to bytes
      allowedImageTypes: (process.env.ALLOWED_IMAGE_TYPES || 'jpg,jpeg,png,gif,webp').split(','),
      allowedPdfTypes: (process.env.ALLOWED_PDF_TYPES || 'pdf').split(','),
      thumbnailSize: {
        width: parseInt(process.env.THUMBNAIL_WIDTH || '200'),
        height: parseInt(process.env.THUMBNAIL_HEIGHT || '200')
      }
    },
    features: {
      authentication: false,
      rateLimiting: false,
      fileUpload: true
    }
  },

  staging: {
    name: 'staging',
    port: parseInt(process.env.PORT || '7779'),
    cors: {
      origins: [
        'https://staging.cosmicboard.com',
        'https://staging.cosmicboard.vercel.app',
        'capacitor://localhost', // iOS
        'http://localhost' // Android
      ],
      credentials: true
    },
    database: {
      url: process.env.DATABASE_URL!,
      logging: false
    },
    storage: {
      type: 's3',
      uploadDir: '/tmp/uploads',
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedImageTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      allowedPdfTypes: ['pdf'],
      thumbnailSize: { width: 200, height: 200 }
    },
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
      bucketName: process.env.AWS_S3_BUCKET
    },
    features: {
      authentication: true,
      rateLimiting: true,
      fileUpload: true
    }
  },

  production: {
    name: 'production',
    port: parseInt(process.env.PORT || '7779'),
    cors: {
      origins: [
        'https://cosmicboard.com',
        'https://www.cosmicboard.com',
        'https://cosmicboard.vercel.app',
        'capacitor://localhost', // iOS
        'http://localhost' // Android
      ],
      credentials: true
    },
    database: {
      url: process.env.DATABASE_URL!,
      logging: false
    },
    storage: {
      type: 's3',
      uploadDir: '/tmp/uploads',
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedImageTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      allowedPdfTypes: ['pdf'],
      thumbnailSize: { width: 200, height: 200 }
    },
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
      bucketName: process.env.AWS_S3_BUCKET
    },
    features: {
      authentication: true,
      rateLimiting: true,
      fileUpload: true
    }
  }
}

// Get current configuration
export const getConfig = (): EnvironmentConfig => {
  const env = getEnvironment()
  return configs[env]
}

// CORS configuration helper
export const getCorsConfig = () => {
  const config = getConfig()
  return {
    origin: (origin: string | undefined, callback: Function) => {
      // Allow requests with no origin (mobile apps, Postman, etc)
      if (!origin) {
        return callback(null, true)
      }
      
      // Check if origin is allowed
      if (config.cors.origins.includes(origin)) {
        callback(null, true)
      } else {
        // Log blocked origin for debugging
        console.warn(`CORS blocked origin: ${origin}`)
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400 // 24 hours
  }
}

// Export current environment and config
export const currentEnv = getEnvironment()
export const config = getConfig()
export const isDevelopment = currentEnv === 'development'
export const isStaging = currentEnv === 'staging'
export const isProduction = currentEnv === 'production'

// Validate required environment variables
export const validateEnvironment = () => {
  const errors: string[] = []

  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required')
  }

  if ((isStaging || isProduction) && config.storage.type === 's3') {
    if (!config.aws?.accessKeyId) errors.push('AWS_ACCESS_KEY_ID is required for S3 storage')
    if (!config.aws?.secretAccessKey) errors.push('AWS_SECRET_ACCESS_KEY is required for S3 storage')
    if (!config.aws?.bucketName) errors.push('AWS_S3_BUCKET is required for S3 storage')
  }

  if (errors.length > 0) {
    console.error('Environment validation errors:')
    errors.forEach(error => console.error(`  - ${error}`))
    throw new Error('Environment validation failed')
  }

  console.log(`✅ Environment: ${config.name}`)
  console.log(`✅ Port: ${config.port}`)
  console.log(`✅ Storage: ${config.storage.type}`)
  console.log(`✅ CORS Origins: ${config.cors.origins.length} configured`)
}