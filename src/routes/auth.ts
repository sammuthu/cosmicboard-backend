import { Router } from 'express';
import { AuthService } from '../services/auth.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Send magic link
router.post('/magic-link', async (req, res) => {
  try {
    const { email, isSignup } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await AuthService.sendMagicLink(email, isSignup);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({ message: result.message });
  } catch (error) {
    console.error('Error sending magic link:', error);
    res.status(500).json({ error: 'Failed to send magic link' });
  }
});

// Verify magic link
router.post('/verify-link', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token is required' });
    }

    const result = await AuthService.verifyMagicLink(token);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({
      user: {
        id: result.user!.id,
        email: result.user!.email,
        name: result.user!.name,
        username: result.user!.username,
        avatar: result.user!.avatar,
      },
      tokens: result.tokens,
    });
  } catch (error) {
    console.error('Error verifying magic link:', error);
    res.status(500).json({ error: 'Failed to verify magic link' });
  }
});

// Verify magic code (for mobile)
router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || typeof email !== 'string' || !code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const result = await AuthService.verifyMagicCode(email, code);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({
      user: {
        id: result.user!.id,
        email: result.user!.email,
        name: result.user!.name,
        username: result.user!.username,
        avatar: result.user!.avatar,
      },
      tokens: result.tokens,
    });
  } catch (error) {
    console.error('Error verifying magic code:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

// Refresh tokens
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const result = await AuthService.refreshTokens(refreshToken);

    if (!result.success) {
      return res.status(401).json({ error: result.message });
    }

    res.json({ tokens: result.tokens });
  } catch (error) {
    console.error('Error refreshing tokens:', error);
    res.status(500).json({ error: 'Failed to refresh tokens' });
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await AuthService.getUser(req.user!.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update user profile
router.patch('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, username, bio, avatar } = req.body;

    const user = await AuthService.updateUser(req.user!.id, {
      name,
      username,
      bio,
      avatar,
    });

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Logout
router.post('/logout', authenticate, async (req: AuthRequest, res) => {
  try {
    // Get the actual refresh token from the authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    await AuthService.logout(req.user!.id, token || '');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

export default router;