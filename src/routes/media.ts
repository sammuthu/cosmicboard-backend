/**
 * Media Routes - STUB VERSION (Media model not in schema)
 * TODO: Add Media model to Prisma schema to enable full functionality
 */

import { Router, Request, Response } from 'express';

const router = Router();

// Stub endpoints that return appropriate errors
router.get('/', (req: Request, res: Response) => {
  res.status(501).json({ 
    error: 'Media functionality not implemented', 
    message: 'Media model not in current schema' 
  });
});

router.post('/upload', (req: Request, res: Response) => {
  res.status(501).json({ 
    error: 'Media upload not implemented', 
    message: 'Media model not in current schema' 
  });
});

router.get('/:id', (req: Request, res: Response) => {
  res.status(501).json({ 
    error: 'Media functionality not implemented', 
    message: 'Media model not in current schema' 
  });
});

router.put('/:id', (req: Request, res: Response) => {
  res.status(501).json({ 
    error: 'Media functionality not implemented', 
    message: 'Media model not in current schema' 
  });
});

router.delete('/:id', (req: Request, res: Response) => {
  res.status(501).json({ 
    error: 'Media functionality not implemented', 
    message: 'Media model not in current schema' 
  });
});

export default router;