import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { Priority, Status } from '@prisma/client';

const router = Router();

// GET /api/tasks
router.get('/', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }
    
    const tasks = await prisma.task.findMany({
      where: { projectId: projectId as string },
      include: {
        project: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Transform for backward compatibility
    const transformedTasks = tasks.map(task => ({
      ...task,
      _id: task.id,
      title: task.content, // Using content field as title
      contentHtml: (task.metadata as any)?.contentHtml || '',
      tags: (task.metadata as any)?.tags || [],
      dueDate: (task.metadata as any)?.dueDate || null,
      projectId: task.project // Include the populated project object
    }));
    
    res.json(transformedTasks);
  } catch (error) {
    console.error('GET /api/tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// POST /api/tasks
router.post('/', async (req: Request, res: Response) => {
  try {
    const { projectId, title, contentHtml, dueDate, priority, tags } = req.body;
    
    if (!projectId || !title) {
      return res.status(400).json({ error: 'Project ID and title are required' });
    }
    
    const task = await prisma.task.create({
      data: {
        projectId,
        content: title, // Store title as content
        priority: (priority || 'MEDIUM') as Priority,
        status: 'ACTIVE' as Status,
        metadata: {
          contentHtml,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          tags: tags || []
        }
      },
      include: {
        project: true
      }
    });
    
    // Transform for backward compatibility
    const transformedTask = {
      ...task,
      _id: task.id,
      title: task.content,
      contentHtml: (task.metadata as any)?.contentHtml || '',
      tags: (task.metadata as any)?.tags || [],
      dueDate: (task.metadata as any)?.dueDate || null,
      projectId: task.project // Include the populated project object
    };
    
    res.status(201).json(transformedTask);
  } catch (error) {
    console.error('POST /api/tasks error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// GET /api/current-priority
router.get('/current-priority', async (req: Request, res: Response) => {
  try {
    // Priority order: URGENT > HIGH > MEDIUM > LOW
    const priorityOrder = {
      URGENT: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1
    };
    
    // Find all active tasks
    const tasks = await prisma.task.findMany({
      where: { status: 'ACTIVE' },
      include: {
        project: true
      }
    });
    
    if (tasks.length === 0) {
      return res.json(null);
    }
    
    // Sort tasks by priority, then by dueDate, then by createdAt
    tasks.sort((a, b) => {
      // First, sort by priority
      const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder] || 2;
      const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder] || 2;
      if (priorityA !== priorityB) {
        return priorityB - priorityA; // Higher priority first
      }
      
      // Then sort by dueDate
      const dueDateA = (a.metadata as any)?.dueDate;
      const dueDateB = (b.metadata as any)?.dueDate;
      
      if (dueDateA && dueDateB) {
        return new Date(dueDateA).getTime() - new Date(dueDateB).getTime();
      }
      if (dueDateA && !dueDateB) return -1;
      if (!dueDateA && dueDateB) return 1;
      
      // Finally, sort by createdAt
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    
    // Transform the top priority task
    const topTask = tasks[0];
    const transformedTask = {
      ...topTask,
      _id: topTask.id,
      title: topTask.content,
      contentHtml: (topTask.metadata as any)?.contentHtml || '',
      tags: (topTask.metadata as any)?.tags || [],
      dueDate: (topTask.metadata as any)?.dueDate || null,
      projectId: topTask.project // Include the populated project object
    };
    
    res.json(transformedTask);
  } catch (error) {
    console.error('GET /api/current-priority error:', error);
    res.status(500).json({ error: 'Failed to fetch current priority' });
  }
});

// GET /api/tasks/search
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, projectId } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const tasks = await prisma.task.findMany({
      where: {
        AND: [
          projectId ? { projectId: projectId as string } : {},
          {
            OR: [
              { content: { contains: q as string, mode: 'insensitive' } }
              // Note: JSONB search requires raw SQL for complex queries
              // For now, just search in content field
            ]
          }
        ]
      },
      include: {
        project: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(tasks);
  } catch (error) {
    console.error('GET /api/tasks/search error:', error);
    res.status(500).json({ error: 'Failed to search tasks' });
  }
});

// GET /api/tasks/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: true
      }
    });
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const transformedTask = {
      ...task,
      _id: task.id,
      title: task.content,
      contentHtml: (task.metadata as any)?.contentHtml || '',
      tags: (task.metadata as any)?.tags || [],
      dueDate: (task.metadata as any)?.dueDate || null,
      projectId: task.project // Include the populated project object
    };
    
    res.json(transformedTask);
  } catch (error) {
    console.error('GET /api/tasks/:id error:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// PUT /api/tasks/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, contentHtml, priority, tags, dueDate } = req.body;
    
    const updateData: any = {};
    
    if (title !== undefined) updateData.content = title;
    if (priority !== undefined) updateData.priority = priority;
    
    // Update metadata
    const existingTask = await prisma.task.findUnique({ where: { id } });
    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const metadata = existingTask.metadata as any || {};
    if (contentHtml !== undefined) metadata.contentHtml = contentHtml;
    if (tags !== undefined) metadata.tags = tags;
    if (dueDate !== undefined) metadata.dueDate = dueDate ? new Date(dueDate).toISOString() : null;
    
    updateData.metadata = metadata;
    
    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        project: true
      }
    });
    
    const transformedTask = {
      ...task,
      _id: task.id,
      title: task.content,
      contentHtml: metadata.contentHtml || '',
      tags: metadata.tags || [],
      dueDate: metadata.dueDate || null,
      projectId: task.project // Include the populated project object
    };
    
    res.json(transformedTask);
  } catch (error) {
    console.error('PUT /api/tasks/:id error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// POST /api/tasks/:id/complete
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const task = await prisma.task.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      },
      include: {
        project: true
      }
    });
    
    res.json({ ...task, _id: task.id, projectId: task.project });
  } catch (error: any) {
    console.error('POST /api/tasks/:id/complete error:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.status(500).json({ error: 'Failed to complete task' });
  }
});

// DELETE /api/tasks/:id/delete
router.delete('/:id/delete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const task = await prisma.task.update({
      where: { id },
      data: {
        status: 'DELETED',
        deletedAt: new Date()
      },
      include: {
        project: true
      }
    });
    
    res.json({ ...task, _id: task.id, projectId: task.project });
  } catch (error: any) {
    console.error('DELETE /api/tasks/:id/delete error:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// POST /api/tasks/:id/restore
router.post('/:id/restore', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const task = await prisma.task.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        deletedAt: null
      },
      include: {
        project: true
      }
    });
    
    res.json({ ...task, _id: task.id, projectId: task.project });
  } catch (error: any) {
    console.error('POST /api/tasks/:id/restore error:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.status(500).json({ error: 'Failed to restore task' });
  }
});

// DELETE /api/tasks/:id/purge
router.delete('/:id/purge', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.task.delete({
      where: { id }
    });
    
    res.json({ message: 'Task permanently deleted' });
  } catch (error: any) {
    console.error('DELETE /api/tasks/:id/purge error:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.status(500).json({ error: 'Failed to purge task' });
  }
});

export default router;