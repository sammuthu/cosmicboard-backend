/**
 * Export/Import Routes - STUB VERSION (Media model not in schema)
 * TODO: Add Media model to Prisma schema to enable full functionality
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/database';

const router = Router();

// POST /api/export - Export all data (without media for now)
router.post('/export', async (req: Request, res: Response) => {
  try {
    // Export data without media since Media model doesn't exist
    const [projects, tasks, references] = await Promise.all([
      prisma.project.findMany({
        orderBy: { createdAt: 'desc' }
      }),
      prisma.task.findMany({
        orderBy: { createdAt: 'desc' }
      }),
      prisma.reference.findMany({
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const exportData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      data: {
        projects,
        tasks,
        references
        // media: [] // TODO: Add when Media model is available
      },
      counts: {
        projects: projects.length,
        tasks: tasks.length,
        references: references.length,
        media: 0
      }
    };

    res.json(exportData);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// POST /api/import - Import data (without media for now)  
router.post('/import', async (req: Request, res: Response) => {
  try {
    const { data } = req.body;
    
    if (!data) {
      return res.status(400).json({ error: 'Import data is required' });
    }

    // Clear existing data (optional, based on import strategy)
    // For now, just add to existing data
    
    const results = {
      projects: 0,
      tasks: 0,
      references: 0,
      media: 0
    };

    // Import projects
    if (data.projects && Array.isArray(data.projects)) {
      for (const project of data.projects) {
        await prisma.project.create({
          data: {
            name: project.name,
            description: project.description,
            userId: project.userId || 'temp-user-id',
            archived: project.archived || false,
            metadata: project.metadata || {}
          }
        });
        results.projects++;
      }
    }

    // Import tasks
    if (data.tasks && Array.isArray(data.tasks)) {
      for (const task of data.tasks) {
        await prisma.task.create({
          data: {
            projectId: task.projectId,
            title: task.title,
            content: task.content,
            priority: task.priority || 'NEBULA',
            status: task.status || 'ACTIVE',
            creatorId: task.creatorId || 'temp-user-id',
            assigneeId: task.assigneeId,
            tags: task.tags || [],
            dueDate: task.dueDate ? new Date(task.dueDate) : null,
            completedAt: task.completedAt ? new Date(task.completedAt) : null,
            metadata: task.metadata || {}
          }
        });
        results.tasks++;
      }
    }

    // Import references
    if (data.references && Array.isArray(data.references)) {
      for (const reference of data.references) {
        await prisma.reference.create({
          data: {
            projectId: reference.projectId,
            userId: reference.userId || 'temp-user-id',
            title: reference.title,
            content: reference.content,
            category: reference.category || 'DOCUMENTATION',
            tags: reference.tags || [],
            language: reference.language,
            metadata: reference.metadata || {}
          }
        });
        results.references++;
      }
    }

    // TODO: Import media when Media model is available

    res.json({
      message: 'Import completed successfully',
      results,
      note: 'Media import not available (Media model not in schema)'
    });

  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Failed to import data' });
  }
});

export default router;