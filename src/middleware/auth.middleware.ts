import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '../services/auth.service';

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