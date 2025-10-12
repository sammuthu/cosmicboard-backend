/**
 * Content Visibility Routes
 *
 * These routes provide endpoints for managing and syncing content visibility.
 * The sync endpoint is useful for migration purposes.
 */

import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { bulkSyncContentVisibility, getUserContentVisibility } from '../services/content-visibility.service';
import { ContentType } from '@prisma/client';

const router = Router();

/**
 * POST /api/content-visibility/sync
 * Sync all content visibility records from content tables to ContentVisibility table
 * This is useful for migration purposes
 */
router.post('/sync', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    console.log('Starting bulk sync of ContentVisibility...');
    const result = await bulkSyncContentVisibility();
    console.log('Bulk sync completed:', result);

    res.json({
      message: 'Content visibility sync completed successfully',
      synced: result
    });
  } catch (error) {
    console.error('POST /api/content-visibility/sync error:', error);
    res.status(500).json({ error: 'Failed to sync content visibility' });
  }
});

/**
 * GET /api/content-visibility
 * Get all ContentVisibility records for the authenticated user
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { contentType } = req.query;

    const records = await getUserContentVisibility(
      req.user!.id,
      contentType as ContentType | undefined
    );

    res.json(records);
  } catch (error) {
    console.error('GET /api/content-visibility error:', error);
    res.status(500).json({ error: 'Failed to fetch content visibility' });
  }
});

export default router;
