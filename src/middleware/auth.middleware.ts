import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '../services/auth.service';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    sessionId?: string;
  };
}

const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Check for token in Authorization header
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.split(' ')[1]; // Bearer token

    // If no token in header, check query params (for PDF viewer compatibility)
    if (!token && req.query.token) {
      token = req.query.token as string;
    }

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // First, try to validate as access token
    const tokenData = AuthService.validateAccessToken(token);
    if (tokenData) {
      // Valid access token
      req.user = {
        id: tokenData.userId,
        email: tokenData.email,
      };
      return next();
    }

    // If not a valid access token, check if it's a refresh token (for backward compatibility)
    const refreshTokenRecord = await prisma.refreshToken.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
      },
      include: { User: true },
    });

    if (!refreshTokenRecord) {
      // In development mode with LocalStack, auto-seed the development token
      const isDevelopment = process.env.NODE_ENV !== 'production';
      const isLocalStack = process.env.AWS_ENDPOINT && process.env.AWS_ENDPOINT.includes('localhost');

      // Check if this is a known development token that needs to be seeded
      if (isDevelopment && isLocalStack) {
        // These are the known development tokens used by the frontend
        const devTokens = [
          'acf42bf1db704dd18e3c64e20f1e73da2f19f8c23cf3bdb7e23c9c2a3c5f1e2d',
          '16b7917a6b0ab3f14c02e9f5d3e8a7c2b9f4e6d8a1c5b3e7f2d4a6c8e9b1d3f5'
        ];

        if (devTokens.includes(token)) {
          console.log('🔧 Development token detected, auto-seeding for nmuthu@gmail.com...');

          // Setup development authentication
          const result = await AuthService.setupDevelopmentAuth('nmuthu@gmail.com');

          if (result.success && result.user && result.tokens) {
            // Store the known development token as the refresh token
            // First check if it exists
            const existingToken = await prisma.refreshToken.findUnique({
              where: { token },
            });

            if (existingToken) {
              await prisma.refreshToken.update({
                where: { token },
                data: {
                  userId: result.user.id,
                  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days for dev
                },
              });
            } else {
              await prisma.refreshToken.create({
                data: {
                  id: crypto.randomBytes(16).toString('hex'),
                  userId: result.user.id,
                  token,
                  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days for dev
                },
              });
            }

            console.log('✅ Development token seeded successfully');

            // Add user info to request
            req.user = {
              id: result.user.id,
              email: result.user.email,
            };

            return next();
          }
        }
      }

      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Add user info to request
    req.user = {
      id: refreshTokenRecord.User.id,
      email: refreshTokenRecord.User.email,
      sessionId: refreshTokenRecord.id,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

const authenticateOptional = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer token

    if (!token) {
      return next(); // Continue without authentication
    }

    // First, try to validate as access token
    const tokenData = AuthService.validateAccessToken(token);
    if (tokenData) {
      // Valid access token
      req.user = {
        id: tokenData.userId,
        email: tokenData.email,
      };
      return next();
    }

    // If not a valid access token, check if it's a refresh token (for backward compatibility)
    const refreshTokenRecord = await prisma.refreshToken.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
      },
      include: { User: true },
    });

    if (!refreshTokenRecord) {
      return next(); // Continue without authentication
    }

    // Add user info to request
    req.user = {
      id: refreshTokenRecord.User.id,
      email: refreshTokenRecord.User.email,
      sessionId: refreshTokenRecord.id,
    };

    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    next(); // Continue without authentication on error
  }
};

export { authenticate, authenticateOptional };
export type { AuthRequest };