import { Router, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import multer from 'multer';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

const router = Router();

// Configure S3 client for profile pictures
const s3Client = new S3Client({
  endpoint: process.env.AWS_ENDPOINT || 'http://localhost:4566',
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test'
  },
  forcePathStyle: true
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'cosmicspace-media';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit (HEIC files can be larger)
  fileFilter: (req, file, cb) => {
    // Accept common image formats including HEIC
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/heic',
      'image/heif'
    ];

    if (allowedMimes.includes(file.mimetype) || file.originalname.toLowerCase().endsWith('.heic')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP, HEIC)'));
    }
  }
});

// Send magic link
router.post('/magic-link', async (req, res) => {
  try {
    const { email, isSignup } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await AuthService.sendMagicLink(email, isSignup);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({ message: result.message });
  } catch (error) {
    console.error('Error sending magic link:', error);
    res.status(500).json({ error: 'Failed to send magic link' });
  }
});

// Verify magic link
router.post('/verify-link', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token is required' });
    }

    const result = await AuthService.verifyMagicLink(token);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({
      user: {
        id: result.user!.id,
        email: result.user!.email,
        name: result.user!.name,
        username: result.user!.username,
        avatar: result.user!.avatar,
      },
      tokens: result.tokens,
    });
  } catch (error) {
    console.error('Error verifying magic link:', error);
    res.status(500).json({ error: 'Failed to verify magic link' });
  }
});

// Verify magic code (for mobile)
router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || typeof email !== 'string' || !code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const result = await AuthService.verifyMagicCode(email, code);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({
      user: {
        id: result.user!.id,
        email: result.user!.email,
        name: result.user!.name,
        username: result.user!.username,
        avatar: result.user!.avatar,
      },
      tokens: result.tokens,
    });
  } catch (error) {
    console.error('Error verifying magic code:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

// Refresh tokens
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const result = await AuthService.refreshTokens(refreshToken);

    if (!result.success) {
      return res.status(401).json({ error: result.message });
    }

    res.json({ tokens: result.tokens });
  } catch (error) {
    console.error('Error refreshing tokens:', error);
    res.status(500).json({ error: 'Failed to refresh tokens' });
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await AuthService.getUser(req.user!.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update user profile
router.patch('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, username, bio, avatar } = req.body;

    const user = await AuthService.updateUser(req.user!.id, {
      name,
      username,
      bio,
      avatar,
    });

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Upload profile picture
router.post('/profile-picture', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user!.id;
    const fileName = `profile-pictures/${userId}-${randomUUID()}.jpg`;

    // Convert image to JPEG (handles HEIC, PNG, WebP, etc.)
    // Sharp automatically detects and converts HEIC format
    let imageBuffer: Buffer;
    try {
      imageBuffer = await sharp(req.file.buffer)
        .rotate() // Auto-rotate based on EXIF orientation
        .jpeg({ quality: 90 }) // Convert to JPEG with high quality
        .toBuffer();
    } catch (conversionError) {
      console.error('Error converting image:', conversionError);
      return res.status(400).json({ error: 'Failed to process image. Please try a different file.' });
    }

    // Upload to S3
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: imageBuffer,
      ContentType: 'image/jpeg',
      Metadata: {
        userId,
        uploadedAt: new Date().toISOString(),
        originalFormat: req.file.mimetype
      }
    }));

    // Construct the avatar URL
    const avatarUrl = process.env.AWS_ENDPOINT
      ? `${process.env.AWS_ENDPOINT}/${BUCKET_NAME}/${fileName}`
      : `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    // Update user's avatar in database
    const user = await AuthService.updateUser(userId, { avatar: avatarUrl });

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
});

// Logout
router.post('/logout', authenticate, async (req: AuthRequest, res) => {
  try {
    // Get the actual refresh token from the authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    await AuthService.logout(req.user!.id, token || '');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

// Development authentication setup (only in development)
router.post('/setup-dev-auth', async (req, res) => {
  try {
    // Only allow this endpoint in development mode
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Development endpoint not available in production' });
    }

    // Check if we're using LocalStack (indicates development mode)
    const isLocalStack = process.env.AWS_ENDPOINT && process.env.AWS_ENDPOINT.includes('localhost');
    if (!isLocalStack) {
      return res.status(403).json({ error: 'Development endpoint only available with LocalStack' });
    }

    const { email = 'nmuthu@gmail.com' } = req.body;

    console.log('🔧 Setting up development authentication for:', email);

    // Use the AuthService to create or find the development user and generate tokens
    const result = await AuthService.setupDevelopmentAuth(email);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    console.log('✅ Development authentication setup completed for:', email);

    res.json({
      message: 'Development authentication setup completed',
      user: {
        id: result.user!.id,
        email: result.user!.email,
        name: result.user!.name,
        username: result.user!.username,
        avatar: result.user!.avatar,
      },
      tokens: result.tokens,
    });
  } catch (error) {
    console.error('Error setting up development auth:', error);
    res.status(500).json({ error: 'Failed to setup development authentication' });
  }
});

export default router;