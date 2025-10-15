/**
 * Authentication Configuration
 *
 * Centralized auth config that works seamlessly in development and production.
 *
 * Development Mode:
 * - Auto-login with pre-seeded accounts
 * - No email sending (bypass magic link)
 * - Instant account switching
 * - Persistent tokens across restarts
 *
 * Production Mode:
 * - Secure JWT tokens (15min access, 7-day refresh)
 * - Magic link via AWS SES
 * - Automatic token refresh
 * - HttpOnly cookies
 *
 * Security Note: Development tokens are ONLY available when:
 * 1. NODE_ENV !== 'production'
 * 2. AWS_ENDPOINT contains 'localhost' (LocalStack detection)
 */

export type AuthMode = 'development' | 'production';

export interface DevAccount {
  id: string;
  email: string;
  name: string;
  username?: string;
  token: string; // Long-lived dev token (never expires)
}

export interface AuthConfig {
  mode: AuthMode;

  // Token settings
  accessTokenExpiry: string; // e.g., '15m', '1h'
  refreshTokenExpiry: string; // e.g., '7d', '30d'

  // Dev mode settings
  devAccounts: DevAccount[];
  devTokenExpiry: string; // '365d' for dev convenience

  // Production settings
  emailProvider: 'ses' | 'smtp' | 'console'; // console = log to terminal (dev only)
  emailFrom: string;

  // Security
  jwtSecret: string;
  allowDevMode: boolean;
}

// Detect if we're in development mode
const isDevelopment = (): boolean => {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  // Check for LocalStack (reliable development indicator)
  const awsEndpoint = process.env.AWS_ENDPOINT || '';
  const isLocalStack = awsEndpoint.includes('localhost') || awsEndpoint.includes('127.0.0.1');

  return isLocalStack;
};

// Development accounts (pre-seeded in database)
// These tokens are generated once and stored in the database
// They're safe to commit because they only work with LocalStack
const DEV_ACCOUNTS: DevAccount[] = [
  {
    id: '6b0a6f4f-002f-40cb-babe-95908a565f45',
    email: 'nmuthu@gmail.com',
    name: 'Nmuthu',
    username: 'nmuthu',
    token: '03c053eada3696970cb3c7df426b27a7081c11bc8ba721e5902b74b19e66b0b7',
  },
  {
    id: 'c7e7967b-a27d-4932-82af-71dd4cadcb80',
    email: 'sammuthu@me.com',
    name: 'Sam Muthu',
    username: 'sammuthu',
    token: 'ec0beada0489d36dc5d87f018fb2513c9a29fb418e3c7ee4894845a00ab6f220',
  },
];

// Get JWT secret (required for production)
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;

  if (!isDevelopment() && !secret) {
    throw new Error('JWT_SECRET is required in production');
  }

  // Use a fixed secret in development for convenience
  return secret || 'dev-jwt-secret-do-not-use-in-production';
};

// Build configuration
export const authConfig: AuthConfig = {
  mode: isDevelopment() ? 'development' : 'production',

  // Token expiry settings
  accessTokenExpiry: isDevelopment() ? '365d' : '15m',  // Long-lived in dev
  refreshTokenExpiry: isDevelopment() ? '365d' : '7d',  // Long-lived in dev

  // Development accounts
  devAccounts: DEV_ACCOUNTS,
  devTokenExpiry: '365d', // 1 year for dev convenience

  // Email settings
  emailProvider: isDevelopment() ? 'console' : 'ses',
  emailFrom: process.env.EMAIL_FROM || 'noreply@cosmicboard.com',

  // Security
  jwtSecret: getJwtSecret(),
  allowDevMode: isDevelopment(),
};

// Helper functions
export const isDevMode = () => authConfig.mode === 'development';

export const getDevAccount = (email: string): DevAccount | undefined => {
  return authConfig.devAccounts.find(acc => acc.email === email);
};

export const getAllDevAccounts = (): DevAccount[] => {
  return isDevMode() ? authConfig.devAccounts : [];
};

export const validateDevToken = (token: string): DevAccount | undefined => {
  if (!isDevMode()) return undefined;
  return authConfig.devAccounts.find(acc => acc.token === token);
};

// Log configuration on startup
if (isDevMode()) {
  console.log('🔧 Auth Mode: DEVELOPMENT');
  console.log('📋 Dev Accounts:', authConfig.devAccounts.map(a => `${a.name} (${a.email})`).join(', '));
  console.log('⏰ Token Expiry: 365 days (development mode)');
  console.log('📧 Email: Console logging (no emails sent)');
} else {
  console.log('🔒 Auth Mode: PRODUCTION');
  console.log('⏰ Access Token: 15 minutes');
  console.log('⏰ Refresh Token: 7 days');
  console.log('📧 Email: AWS SES');
}
