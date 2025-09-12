import nodemailer from 'nodemailer';
import { SendMailOptions } from 'nodemailer';

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  static initializeTransporter() {
    if (this.transporter) return;

    const isEmailEnabled = process.env.ENABLE_EMAIL_SENDING === 'true';
    
    if (!isEmailEnabled) {
      console.log('📧 Email sending is disabled in development mode');
      return;
    }

    // Create transporter with SMTP configuration
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verify transporter configuration
    this.transporter!.verify((error) => {
      if (error) {
        console.error('❌ Email transporter verification failed:', error.message);
      } else {
        console.log('✅ Email service ready to send messages');
      }
    });
  }

  static async sendMagicLinkEmail(
    to: string,
    magicLink: string,
    code: string
  ): Promise<boolean> {
    // Always log the magic link in development
    console.log('\n===========================================');
    console.log('🔐 MAGIC LINK (Development Mode)');
    console.log('===========================================');
    console.log(`Email: ${to}`);
    console.log(`Magic Link: ${magicLink}`);
    console.log(`Code: ${code}`);
    console.log('===========================================\n');
    
    // Initialize transporter if not already done
    if (!this.transporter) {
      this.initializeTransporter();
    }

    // If no transporter, we've already logged, just return
    if (!this.transporter) {
      return true; // Return true to continue the flow
    }

    try {
      const mailOptions: SendMailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'CosmicSpace'}" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
        to,
        subject: 'Your CosmicSpace Magic Link',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
              .content { background: #f7f7f7; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .code { font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #764ba2; text-align: center; padding: 20px; background: white; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🚀 CosmicSpace</h1>
                <p>Your Magic Link is Ready!</p>
              </div>
              <div class="content">
                <p>Hi there!</p>
                <p>Click the button below to sign in to your CosmicSpace account:</p>
                <div style="text-align: center;">
                  <a href="${magicLink}" class="button">Sign In to CosmicSpace</a>
                </div>
                <p>Or use this code:</p>
                <div class="code">${code}</div>
                <p>This link and code will expire in 15 minutes for your security.</p>
                <p>If you didn't request this, you can safely ignore this email.</p>
              </div>
              <div class="footer">
                <p>© 2025 CosmicSpace. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          Your CosmicSpace Magic Link
          
          Click here to sign in: ${magicLink}
          
          Or use this code: ${code}
          
          This link will expire in 15 minutes.
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully to ${to}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return false;
    }
  }

  static async sendWelcomeEmail(to: string, name?: string): Promise<boolean> {
    if (!this.transporter) {
      console.log(`📧 Welcome email would be sent to ${to}`);
      return true;
    }

    try {
      const mailOptions: SendMailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'CosmicSpace'}" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
        to,
        subject: 'Welcome to CosmicSpace! 🚀',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
              .content { background: #f7f7f7; padding: 30px; border-radius: 0 0 10px 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to CosmicSpace!</h1>
              </div>
              <div class="content">
                <p>Hi ${name || 'there'}!</p>
                <p>Welcome to CosmicSpace - your cosmic task management platform!</p>
                <p>Get started by creating your first project and organizing your tasks.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      return false;
    }
  }
}

// Initialize email service on module load
EmailService.initializeTransporter();