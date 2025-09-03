import { Router } from 'express';
import projectRoutes from './projects';
import taskRoutes from './tasks';
import referenceRoutes from './references';

const router = Router();

// Mount routes
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/references', referenceRoutes);

// Health check
router.get('/health', (_req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API info
router.get('/', (_req, res) => {
  res.json({ 
    message: 'CosmicBoard Backend API',
    version: '1.0.0',
    endpoints: {
      projects: '/api/projects',
      tasks: '/api/tasks',
      references: '/api/references',
      health: '/api/health'
    }
  });
});

export default router;