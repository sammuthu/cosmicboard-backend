import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    sessionId: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    try {
      const payload = AuthService.verifyAccessToken(token);
      
      // Verify session exists and is valid
      const session = await prisma.session.findFirst({
        where: {
          id: payload.sessionId,
          userId: payload.userId,
          token,
          expiresAt: { gt: new Date() },
        },
      });

      if (!session) {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }

      // Update session last active
      await prisma.session.update({
        where: { id: session.id },
        data: { lastActive: new Date() },
      });

      req.user = {
        id: payload.userId,
        email: payload.email,
        sessionId: payload.sessionId,
      };

      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const payload = AuthService.verifyAccessToken(token);
      
      // Verify session exists and is valid
      const session = await prisma.session.findFirst({
        where: {
          id: payload.sessionId,
          userId: payload.userId,
          token,
          expiresAt: { gt: new Date() },
        },
      });

      if (session) {
        // Update session last active
        await prisma.session.update({
          where: { id: session.id },
          data: { lastActive: new Date() },
        });

        req.user = {
          id: payload.userId,
          email: payload.email,
          sessionId: payload.sessionId,
        };
      }
    } catch (error) {
      // Invalid token, but it's optional so we continue
    }

    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    next();
  }
};