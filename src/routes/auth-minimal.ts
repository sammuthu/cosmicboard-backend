import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const router = Router();
const prisma = new PrismaClient();

// Email transporter setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Minimal magic link implementation just to get the web frontend working
router.post('/magic-link', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email },
    });

    // Create user if doesn't exist
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: email.split('@')[0],
          isActive: true,
        },
      });
    }

    // Generate magic link token and code
    const token = crypto.randomBytes(32).toString('hex');
    const code = crypto.randomInt(100000, 999999).toString();

    // Store magic link
    await prisma.magicLink.create({
      data: {
        userId: user.id,
        email,
        token,
        code,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      },
    });

    // Send email if SMTP is configured
    const magicLinkUrl = `http://localhost:7777/auth?token=${token}`;
    
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || `"CosmicSpace" <${process.env.SMTP_USER}>`,
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
        console.log(`✅ Email sent successfully to ${email}`);
      } catch (error) {
        console.error('❌ Failed to send email:', error);
      }
    }

    // Also log for development
    console.log('\n===========================================');
    console.log('🔐 MAGIC LINK GENERATED');
    console.log('===========================================');
    console.log(`Email: ${email}`);
    console.log(`Magic Link: ${magicLinkUrl}`);
    console.log(`Code: ${code}`);
    console.log('===========================================\n');

    res.json({ message: 'Magic link sent to your email' });
  } catch (error) {
    console.error('Error sending magic link:', error);
    res.status(500).json({ error: 'Failed to send magic link' });
  }
});

// Minimal verification endpoint
router.post('/verify-link', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!magicLink || magicLink.expiresAt < new Date() || magicLink.usedAt) {
      return res.status(400).json({ error: 'Invalid or expired magic link' });
    }

    // Mark as used
    await prisma.magicLink.update({
      where: { id: magicLink.id },
      data: { usedAt: new Date() },
    });

    // Update user last login
    await prisma.user.update({
      where: { id: magicLink.user.id },
      data: { lastLogin: new Date() },
    });

    // Generate simple access token
    const accessToken = crypto.randomBytes(32).toString('hex');

    // Store in refresh tokens table for simplicity
    await prisma.refreshToken.create({
      data: {
        id: crypto.randomUUID(),
        token: accessToken,
        userId: magicLink.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    res.json({
      user: {
        id: magicLink.user.id,
        email: magicLink.user.email,
        name: magicLink.user.name,
        username: magicLink.user.username,
        avatar: magicLink.user.avatar,
      },
      tokens: {
        accessToken,
        refreshToken: accessToken, // Same for simplicity
        expiresIn: 15 * 60,
      },
    });
  } catch (error) {
    console.error('Error verifying magic link:', error);
    res.status(500).json({ error: 'Failed to verify magic link' });
  }
});

export default router;