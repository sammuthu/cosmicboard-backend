import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.simple';
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

    // Get user by token
    const user = await AuthService.getUserByToken(token);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get session
    const session = await prisma.session.findFirst({
      where: {
        userId: user.id,
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
      id: user.id,
      email: user.email,
      sessionId: session.id,
    };

    next();
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

    // Get user by token
    const user = await AuthService.getUserByToken(token);
    
    if (user) {
      // Get session
      const session = await prisma.session.findFirst({
        where: {
          userId: user.id,
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
          id: user.id,
          email: user.email,
          sessionId: session.id,
        };
      }
    }

    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    next();
  }
};