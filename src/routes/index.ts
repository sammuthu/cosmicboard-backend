import { Router } from 'express';
import authRoutes from './auth';
import projectRoutes from './projects';
import taskRoutes from './tasks';
import referenceRoutes from './references';
// import mediaRoutes from './media'; // Disabled - Media model not in current schema
// import searchRoutes from './search'; // Temporarily disabled
// import exportImportRoutes from './export-import'; // Temporarily disabled - media issues

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/references', referenceRoutes);
// router.use('/media', mediaRoutes); // Disabled - Media model not in current schema
// router.use('/search', searchRoutes); // Temporarily disabled
// router.use('/', exportImportRoutes); // Export and import at root level - temporarily disabled

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
      auth: '/api/auth',
      projects: '/api/projects',
      tasks: '/api/tasks',
      references: '/api/references',
      health: '/api/health'
    }
  });
});

export default router;
