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
      orderBy: { createdAt: 'desc' }
    });
    
    // Transform for backward compatibility
    const transformedTasks = tasks.map(task => ({
      ...task,
      _id: task.id,
      title: task.content, // Using content field as title
      contentHtml: (task.metadata as any)?.contentHtml || '',
      tags: (task.metadata as any)?.tags || [],
      dueDate: (task.metadata as any)?.dueDate || null
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
      }
    });
    
    // Transform for backward compatibility
    const transformedTask = {
      ...task,
      _id: task.id,
      title: task.content,
      contentHtml: (task.metadata as any)?.contentHtml || '',
      tags: (task.metadata as any)?.tags || [],
      dueDate: (task.metadata as any)?.dueDate || null
    };
    
    res.status(201).json(transformedTask);
  } catch (error) {
    console.error('POST /api/tasks error:', error);
    res.status(500).json({ error: 'Failed to create task' });
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
      where: { id }
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
      dueDate: (task.metadata as any)?.dueDate || null
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
      data: updateData
    });
    
    const transformedTask = {
      ...task,
      _id: task.id,
      title: task.content,
      contentHtml: metadata.contentHtml || '',
      tags: metadata.tags || [],
      dueDate: metadata.dueDate || null
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
      }
    });
    
    res.json({ ...task, _id: task.id });
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
      }
    });
    
    res.json({ ...task, _id: task.id });
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
      }
    });
    
    res.json({ ...task, _id: task.id });
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