import { PrismaClient, User, AuthProvider } from '@prisma/client';
import crypto from 'crypto';
import emailService from './aws/ses.service';

const prisma = new PrismaClient();

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthService {
  private static magicLinkExpiry = 15 * 60 * 1000; // 15 minutes

  static generateTokens(userId: string, email: string, sessionId: string): AuthTokens {
    // Simple token generation without JWT for now
    const accessToken = crypto.randomBytes(32).toString('hex');
    const refreshToken = crypto.randomBytes(32).toString('hex');
    
    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
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
          message: 'User already exists with this email',
        };
      }

      // If login and user doesn't exist, create new user
      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            isActive: true,
          },
        });

        // Create email auth method
        await prisma.authMethod.create({
          data: {
            userId: user.id,
            provider: AuthProvider.EMAIL,
          },
        });
      }

      // Generate magic link token
      const token = crypto.randomBytes(32).toString('hex');
      const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code

      // Save magic link
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
      
      // For development, log the magic link
      console.log('\n===========================================');
      console.log('🔐 MAGIC LINK GENERATED');
      console.log('===========================================');
      console.log(`Email: ${email}`);
      console.log(`Magic Link: ${magicLinkUrl}`);
      console.log(`Code: ${code}`);
      console.log('===========================================\n');
      
      // Send email using AWS SES
      try {
        await emailService.sendMagicLink(email, magicLinkUrl, code, isSignup);
        console.log(`Magic link email sent to ${email}`);
      } catch (emailError) {
        console.error('Failed to send magic link email:', emailError);
        // Continue even if email fails in development
      }

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
      const magicLink = await prisma.magicLink.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!magicLink || !magicLink.user) {
        return {
          success: false,
          message: 'Invalid or expired magic link',
        };
      }

      if (magicLink.expiresAt < new Date()) {
        return {
          success: false,
          message: 'Magic link has expired',
        };
      }

      if (magicLink.usedAt) {
        return {
          success: false,
          message: 'Magic link has already been used',
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

      // Create session
      const session = await prisma.session.create({
        data: {
          userId: magicLink.user.id,
          token: crypto.randomBytes(32).toString('hex'),
          refreshToken: crypto.randomBytes(32).toString('hex'),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      // Generate tokens
      const tokens = this.generateTokens(
        magicLink.user.id,
        magicLink.user.email,
        session.id
      );

      // Update session with tokens
      await prisma.session.update({
        where: { id: session.id },
        data: {
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      });

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
      const magicLink = await prisma.magicLink.findFirst({
        where: {
          email,
          code,
          expiresAt: { gt: new Date() },
          usedAt: null,
        },
        include: { user: true },
      });

      if (!magicLink || !magicLink.user) {
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

      // Create session
      const session = await prisma.session.create({
        data: {
          userId: magicLink.user.id,
          token: crypto.randomBytes(32).toString('hex'),
          refreshToken: crypto.randomBytes(32).toString('hex'),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      // Generate tokens
      const tokens = this.generateTokens(
        magicLink.user.id,
        magicLink.user.email,
        session.id
      );

      // Update session with tokens
      await prisma.session.update({
        where: { id: session.id },
        data: {
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      });

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
      const session = await prisma.session.findFirst({
        where: {
          refreshToken,
          expiresAt: { gt: new Date() },
        },
        include: { user: true },
      });

      if (!session) {
        return {
          success: false,
          message: 'Invalid or expired refresh token',
        };
      }

      // Generate new tokens
      const tokens = this.generateTokens(
        session.user.id,
        session.user.email,
        session.id
      );

      // Update session with new tokens
      await prisma.session.update({
        where: { id: session.id },
        data: {
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          lastActive: new Date(),
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

  static async logout(sessionId: string): Promise<{ success: boolean }> {
    try {
      await prisma.session.delete({
        where: { id: sessionId },
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
    const session = await prisma.session.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    return session?.user || null;
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