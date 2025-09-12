import {
  SESClient,
  SendEmailCommand,
  SendTemplatedEmailCommand,
  VerifyEmailIdentityCommand,
  ListVerifiedEmailAddressesCommand,
} from '@aws-sdk/client-ses';

// Initialize SES client with environment-aware configuration
const sesConfig: any = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  } : undefined,
};

// For LocalStack development
if (process.env.AWS_SES_ENDPOINT) {
  sesConfig.endpoint = process.env.AWS_SES_ENDPOINT;
}

const sesClient = new SESClient(sesConfig);

export class EmailService {
  private fromEmail: string;
  private isDevelopment: boolean;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@cosmicspace.app';
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  /**
   * Send a magic link email
   */
  async sendMagicLink(
    to: string,
    magicLink: string,
    code: string,
    isSignup: boolean = false
  ) {
    const subject = isSignup 
      ? 'Welcome to CosmicSpace - Verify Your Email'
      : 'Your CosmicSpace Magic Link';

    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f7f7f7; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .code-box { background: white; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0; }
            .code { font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #764ba2; }
            .footer { text-align: center; color: #888; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌌 CosmicSpace</h1>
              <p>Your Universe of Projects</p>
            </div>
            <div class="content">
              <h2>Hello! 👋</h2>
              <p>${isSignup ? 'Welcome to CosmicSpace! Click the button below to verify your email and get started.' : 'Click the button below to sign in to your CosmicSpace account.'}</p>
              
              <div style="text-align: center;">
                <a href="${magicLink}" class="button">
                  ${isSignup ? 'Verify Email & Sign In' : 'Sign In to CosmicSpace'}
                </a>
              </div>
              
              <p>Or use this verification code in the mobile app:</p>
              
              <div class="code-box">
                <div class="code">${code}</div>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                This link and code will expire in 15 minutes for security reasons.
                If you didn't request this, you can safely ignore this email.
              </p>
            </div>
            <div class="footer">
              <p>© 2024 CosmicSpace. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textBody = `
${isSignup ? 'Welcome to CosmicSpace!' : 'Sign in to CosmicSpace'}

Click this link to ${isSignup ? 'verify your email and sign in' : 'sign in'}:
${magicLink}

Or use this verification code in the mobile app: ${code}

This link and code will expire in 15 minutes.
If you didn't request this, you can safely ignore this email.

© 2024 CosmicSpace. All rights reserved.
    `.trim();

    return this.sendEmail(to, subject, htmlBody, textBody);
  }

  /**
   * Send a general email
   */
  async sendEmail(
    to: string | string[],
    subject: string,
    htmlBody: string,
    textBody?: string
  ) {
    // In development with LocalStack, log the email instead of sending
    if (this.isDevelopment && process.env.AWS_ENDPOINT) {
      console.log('\n===========================================');
      console.log('📧 EMAIL (LocalStack Development Mode)');
      console.log('===========================================');
      console.log(`From: ${this.fromEmail}`);
      console.log(`To: ${Array.isArray(to) ? to.join(', ') : to}`);
      console.log(`Subject: ${subject}`);
      console.log('-------------------------------------------');
      console.log('Text Body:');
      console.log(textBody || 'No text version');
      console.log('===========================================\n');
      
      // Still try to send via LocalStack for testing
    }

    const toAddresses = Array.isArray(to) ? to : [to];

    const command = new SendEmailCommand({
      Source: this.fromEmail,
      Destination: {
        ToAddresses: toAddresses,
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8',
          },
          Text: textBody ? {
            Data: textBody,
            Charset: 'UTF-8',
          } : undefined,
        },
      },
    });

    try {
      const result = await sesClient.send(command);
      console.log(`Email sent successfully to ${toAddresses.join(', ')}`);
      return {
        success: true,
        messageId: result.MessageId,
      };
    } catch (error) {
      console.error('Error sending email:', error);
      
      // In development, don't fail if LocalStack email sending fails
      if (this.isDevelopment) {
        console.log('(Development mode - email logged but not sent)');
        return {
          success: true,
          messageId: 'dev-' + Date.now(),
        };
      }
      
      throw new Error(`Failed to send email: ${error}`);
    }
  }

  /**
   * Verify an email address (for SES sandbox mode)
   */
  async verifyEmailAddress(email: string) {
    const command = new VerifyEmailIdentityCommand({
      EmailAddress: email,
    });

    try {
      await sesClient.send(command);
      console.log(`Verification email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Error verifying email:', error);
      return false;
    }
  }

  /**
   * List verified email addresses
   */
  async listVerifiedEmails() {
    const command = new ListVerifiedEmailAddressesCommand({});

    try {
      const result = await sesClient.send(command);
      return result.VerifiedEmailAddresses || [];
    } catch (error) {
      console.error('Error listing verified emails:', error);
      return [];
    }
  }

  /**
   * Send notification email
   */
  async sendNotification(
    to: string,
    title: string,
    message: string,
    actionUrl?: string,
    actionText?: string
  ) {
    const subject = `CosmicSpace: ${title}`;
    
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f7f7f7; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 24px; background: #764ba2; color: white !important; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>🌌 CosmicSpace Notification</h2>
            </div>
            <div class="content">
              <h3>${title}</h3>
              <p>${message}</p>
              ${actionUrl ? `
                <div style="text-align: center;">
                  <a href="${actionUrl}" class="button">${actionText || 'View Details'}</a>
                </div>
              ` : ''}
            </div>
          </div>
        </body>
      </html>
    `;

    const textBody = `
${title}

${message}

${actionUrl ? `${actionText || 'View Details'}: ${actionUrl}` : ''}

© 2024 CosmicSpace
    `.trim();

    return this.sendEmail(to, subject, htmlBody, textBody);
  }
}

export default new EmailService();