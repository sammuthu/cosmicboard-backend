import { PrismaClient, User, AuthProvider } from '@prisma/client';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

interface TokenPayload {
  userId: string;
  email: string;
  sessionId: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthService {
  private static jwtSecret = process.env.JWT_SECRET || 'cosmic-secret-key-change-in-production';
  private static refreshSecret = process.env.JWT_REFRESH_SECRET || 'cosmic-refresh-secret-change-in-production';
  private static accessTokenExpiry = '15m';
  private static refreshTokenExpiry = '7d';
  private static magicLinkExpiry = 15 * 60 * 1000; // 15 minutes

  private static transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  static generateTokens(payload: TokenPayload): AuthTokens {
    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.accessTokenExpiry,
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(payload, this.refreshSecret, {
      expiresIn: this.refreshTokenExpiry,
    } as jwt.SignOptions);

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  static verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, this.jwtSecret) as TokenPayload;
  }

  static verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, this.refreshSecret) as TokenPayload;
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
      const magicLinkUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify?token=${token}`;
      
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"CosmicSpace" <noreply@cosmicspace.app>',
        to: email,
        subject: 'Your CosmicSpace Magic Link',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome to CosmicSpace! 🚀</h2>
            <p>Click the link below to sign in to your account:</p>
            <a href="${magicLinkUrl}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
              Sign In to CosmicSpace
            </a>
            <p>Or use this code in the app: <strong style="font-size: 24px; letter-spacing: 2px;">${code}</strong></p>
            <p style="color: #666; font-size: 14px;">This link will expire in 15 minutes. If you didn't request this, please ignore this email.</p>
          </div>
        `,
      });

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

      // Generate JWT tokens
      const tokens = this.generateTokens({
        userId: magicLink.user.id,
        email: magicLink.user.email,
        sessionId: session.id,
      });

      // Update session with JWT tokens
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

      // Generate JWT tokens
      const tokens = this.generateTokens({
        userId: magicLink.user.id,
        email: magicLink.user.email,
        sessionId: session.id,
      });

      // Update session with JWT tokens
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
      const payload = this.verifyRefreshToken(refreshToken);

      const session = await prisma.session.findFirst({
        where: {
          id: payload.sessionId,
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
      const tokens = this.generateTokens({
        userId: session.user.id,
        email: session.user.email,
        sessionId: session.id,
      });

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

  static async updateUser(userId: string, data: { name?: string; username?: string; bio?: string; avatar?: string }): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data,
    });
  }
}