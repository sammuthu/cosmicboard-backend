import { PrismaClient, User } from '@prisma/client';
import crypto from 'crypto';
import { EmailService } from './email.service';

const prisma = new PrismaClient();

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// In-memory storage for access tokens (in production, use Redis or JWT)
const accessTokenStore = new Map<string, { userId: string; email: string; expiresAt: Date }>();

export class AuthService {
  private static magicLinkExpiry = 15 * 60 * 1000; // 15 minutes

  static generateTokens(userId: string, email: string): AuthTokens {
    // Simple token generation without JWT for now
    const accessToken = crypto.randomBytes(32).toString('hex');
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const expiresIn = 15 * 60; // 15 minutes in seconds
    
    // Store access token in memory
    accessTokenStore.set(accessToken, {
      userId,
      email,
      expiresAt: new Date(Date.now() + expiresIn * 1000)
    });
    
    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  static validateAccessToken(token: string): { userId: string; email: string } | null {
    const tokenData = accessTokenStore.get(token);
    if (!tokenData) return null;
    
    if (tokenData.expiresAt < new Date()) {
      accessTokenStore.delete(token);
      return null;
    }
    
    return { userId: tokenData.userId, email: tokenData.email };
  }

  static async sendMagicLink(email: string, isSignup: boolean = false): Promise<{ success: boolean; message: string }> {
    try {
      // Check if user exists
      let user = await prisma.user.findUnique({
        where: { email },
      });

      // If signup and user exists, return error
      if (isSignup && user) {
        return {
          success: false,
          message: 'User already exists. Please use login instead.',
        };
      }

      // If login and user doesn't exist, create new user
      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name: email.split('@')[0], // Extract name from email
            isActive: true,
          },
        });

        // Create email auth method
        await prisma.authMethod.create({
          data: {
            userId: user.id,
            provider: 'EMAIL',
            email: email,
          },
        });
      }

      // Generate magic link token
      const token = crypto.randomBytes(32).toString('hex');
      const code = crypto.randomInt(100000, 999999).toString(); // 6-digit code

      // Store magic link
      await prisma.magicLink.create({
        data: {
          userId: user.id,
          email,
          token,
          code,
          expiresAt: new Date(Date.now() + this.magicLinkExpiry),
        },
      });

      // Send email
      const magicLinkUrl = `${process.env.FRONTEND_URL || 'http://localhost:7777'}/auth?token=${token}`;
      
      // Send the magic link email
      await EmailService.sendMagicLinkEmail(email, magicLinkUrl, code);

      return {
        success: true,
        message: 'Magic link sent to your email',
      };
    } catch (error) {
      console.error('Error sending magic link:', error);
      return {
        success: false,
        message: 'Failed to send magic link',
      };
    }
  }

  static async verifyMagicLink(token: string): Promise<{ success: boolean; user?: User; tokens?: AuthTokens; message?: string }> {
    try {
      console.log('🔍 Verifying magic link with token:', token);
      
      // Find and verify magic link
      const magicLink = await prisma.magicLink.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!magicLink) {
        console.log('❌ Magic link not found for token:', token);
        return {
          success: false,
          message: 'Invalid or expired magic link',
        };
      }

      if (magicLink.expiresAt < new Date()) {
        console.log('❌ Magic link expired:', magicLink.expiresAt);
        return {
          success: false,
          message: 'Invalid or expired magic link',
        };
      }

      if (magicLink.usedAt) {
        console.log('❌ Magic link already used:', magicLink.usedAt);
        return {
          success: false,
          message: 'Invalid or expired magic link',
        };
      }

      // Mark magic link as used
      await prisma.magicLink.update({
        where: { id: magicLink.id },
        data: { usedAt: new Date() },
      });

      // Update user last login
      await prisma.user.update({
        where: { id: magicLink.user.id },
        data: { lastLogin: new Date() },
      });

      // Generate tokens
      const tokens = this.generateTokens(
        magicLink.user.id,
        magicLink.user.email
      );

      console.log('✅ Generated tokens for user:', magicLink.user.email);
      console.log('   Access token:', tokens.accessToken);
      console.log('   Expires in:', tokens.expiresIn, 'seconds');

      // Store refresh token
      await prisma.refreshToken.create({
        data: {
          id: crypto.randomUUID(),
          token: tokens.refreshToken,
          userId: magicLink.user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      console.log('✅ Magic link verified successfully for:', magicLink.user.email);

      return {
        success: true,
        user: magicLink.user,
        tokens,
      };
    } catch (error) {
      console.error('Error verifying magic link:', error);
      return {
        success: false,
        message: 'Failed to verify magic link',
      };
    }
  }

  static async verifyMagicCode(email: string, code: string): Promise<{ success: boolean; user?: User; tokens?: AuthTokens; message?: string }> {
    try {
      // Find and verify magic link by email and code
      const magicLink = await prisma.magicLink.findFirst({
        where: {
          email,
          code,
          expiresAt: { gt: new Date() },
          usedAt: null,
        },
        include: { user: true },
      });

      if (!magicLink) {
        return {
          success: false,
          message: 'Invalid or expired code',
        };
      }

      // Mark magic link as used
      await prisma.magicLink.update({
        where: { id: magicLink.id },
        data: { usedAt: new Date() },
      });

      // Update user last login
      await prisma.user.update({
        where: { id: magicLink.user.id },
        data: { lastLogin: new Date() },
      });

      // Generate tokens
      const tokens = this.generateTokens(
        magicLink.user.id,
        magicLink.user.email
      );

      console.log('✅ Generated tokens for user:', magicLink.user.email);
      console.log('   Access token:', tokens.accessToken);
      console.log('   Expires in:', tokens.expiresIn, 'seconds');

      // Store refresh token
      await prisma.refreshToken.create({
        data: {
          id: crypto.randomUUID(),
          token: tokens.refreshToken,
          userId: magicLink.user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      console.log('✅ Magic link verified successfully for:', magicLink.user.email);

      return {
        success: true,
        user: magicLink.user,
        tokens,
      };
    } catch (error) {
      console.error('Error verifying magic code:', error);
      return {
        success: false,
        message: 'Failed to verify code',
      };
    }
  }

  static async refreshTokens(refreshToken: string): Promise<{ success: boolean; tokens?: AuthTokens; message?: string }> {
    try {
      const tokenRecord = await prisma.refreshToken.findFirst({
        where: {
          token: refreshToken,
          expiresAt: { gt: new Date() },
        },
        include: { User: true },
      });

      if (!tokenRecord) {
        return {
          success: false,
          message: 'Invalid or expired refresh token',
        };
      }

      // Generate new tokens
      const tokens = this.generateTokens(
        tokenRecord.User.id,
        tokenRecord.User.email
      );

      // Update refresh token
      await prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: {
          token: tokens.refreshToken,
        },
      });

      return {
        success: true,
        tokens,
      };
    } catch (error) {
      console.error('Error refreshing tokens:', error);
      return {
        success: false,
        message: 'Failed to refresh tokens',
      };
    }
  }

  static async logout(userId: string, refreshToken: string): Promise<{ success: boolean }> {
    try {
      await prisma.refreshToken.deleteMany({
        where: { 
          userId,
          token: refreshToken,
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Error logging out:', error);
      return { success: false };
    }
  }

  static async getUser(userId: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id: userId },
    });
  }

  static async getUserByToken(token: string): Promise<User | null> {
    // For this simple implementation, we'll store user sessions in memory or use a simple approach
    // In production, you'd want to use proper JWT validation or database session lookup
    // For now, let's return null and handle this at the middleware level
    return null;
  }

  static async updateUser(userId: string, data: { name?: string; username?: string; bio?: string; avatar?: string }): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        username: data.username,
        bio: data.bio,
        avatar: data.avatar,
      },
    });
  }
}