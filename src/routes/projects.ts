import { Router, Request, Response } from 'express';
import { prisma } from '../server';

const router = Router();

// GET /api/projects
router.get('/', async (_req: Request, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            tasks: true,
            references: true
          }
        },
        tasks: {
          select: {
            status: true
          }
        },
        references: {
          select: {
            category: true
          }
        }
      }
    });
    
    // Transform the data to match the expected format
    const projectsWithCounts = projects.map(project => {
      const active = project.tasks.filter(t => t.status === 'ACTIVE').length;
      const completed = project.tasks.filter(t => t.status === 'COMPLETED').length;
      const deleted = project.tasks.filter(t => t.status === 'DELETED').length;
      
      const totalReferences = project._count.references;
      const snippets = project.references.filter(r => r.category === 'SNIPPET').length;
      const documentation = project.references.filter(r => r.category === 'DOCUMENTATION').length;
      
      // Remove the included relations from the response
      const { tasks, references, _count, ...projectData } = project;
      
      return {
        ...projectData,
        _id: project.id, // For backward compatibility
        counts: { 
          tasks: { active, completed, deleted },
          references: { total: totalReferences, snippets, documentation }
        }
      };
    });
    
    res.json(projectsWithCounts);
  } catch (error) {
    console.error('GET /api/projects error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// POST /api/projects
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      res.status(400).json({ error: 'Project name is required' });
      return;
    }
    
    const project = await prisma.project.create({
      data: { 
        name, 
        description,
        metadata: {} // Initialize with empty JSON object
      }
    });
    
    res.status(201).json({ ...project, _id: project.id });
  } catch (error: any) {
    console.error('POST /api/projects error:', error);
    
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Project name already exists' });
      return;
    }
    
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// GET /api/projects/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const project = await prisma.project.findUnique({
      where: { id }
    });
    
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    
    res.json({ ...project, _id: project.id });
  } catch (error) {
    console.error('GET /api/projects/:id error:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// PUT /api/projects/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    const project = await prisma.project.update({
      where: { id },
      data: { name, description }
    });
    
    res.json({ ...project, _id: project.id });
  } catch (error: any) {
    console.error('PUT /api/projects/:id error:', error);
    
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.project.delete({
      where: { id }
    });
    
    res.json({ message: 'Project deleted successfully' });
  } catch (error: any) {
    console.error('DELETE /api/projects/:id error:', error);
    
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// GET /api/projects/:projectId/tasks
router.get('/:projectId/tasks', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    
    const tasks = await prisma.task.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(tasks);
  } catch (error) {
    console.error('GET /api/projects/:projectId/tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// POST /api/projects/:projectId/tasks
router.post('/:projectId/tasks', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { title, content, priority = 'MEDIUM', status = 'ACTIVE' } = req.body;
    
    const task = await prisma.task.create({
      data: {
        projectId,
        content: content || title, // Use content or fallback to title
        priority,
        status
      }
    });
    
    res.status(201).json(task);
  } catch (error: any) {
    console.error('POST /api/projects/:projectId/tasks error:', error);
    
    if (error.code === 'P2003') {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PUT /api/projects/:projectId/tasks/:taskId
router.put('/:projectId/tasks/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { content, priority, status } = req.body;
    
    const updateData: any = {};
    if (content !== undefined) updateData.content = content;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'COMPLETED') {
        updateData.completedAt = new Date();
      } else if (status === 'ACTIVE') {
        updateData.completedAt = null;
      }
    }
    
    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData
    });
    
    res.json(task);
  } catch (error: any) {
    console.error('PUT /api/projects/:projectId/tasks/:taskId error:', error);
    
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/projects/:projectId/tasks/:taskId
router.delete('/:projectId/tasks/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    
    await prisma.task.delete({
      where: { id: taskId }
    });
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error: any) {
    console.error('DELETE /api/projects/:projectId/tasks/:taskId error:', error);
    
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// GET /api/projects/:projectId/references
router.get('/:projectId/references', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    
    const references = await prisma.reference.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(references);
  } catch (error) {
    console.error('GET /api/projects/:projectId/references error:', error);
    res.status(500).json({ error: 'Failed to fetch references' });
  }
});

// POST /api/projects/:projectId/references
router.post('/:projectId/references', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { 
      title, 
      content = '', 
      category = 'DOCUMENTATION', 
      priority = 'MEDIUM',
      tags = [],
      url 
    } = req.body;
    
    // Convert category to uppercase
    const categoryUpper = category.toUpperCase() as any;
    
    const reference = await prisma.reference.create({
      data: {
        projectId,
        title,
        content,
        category: categoryUpper,
        priority,
        tags,
        url
      }
    });
    
    res.status(201).json(reference);
  } catch (error: any) {
    console.error('POST /api/projects/:projectId/references error:', error);
    
    if (error.code === 'P2003') {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    
    res.status(500).json({ error: 'Failed to create reference' });
  }
});

// PUT /api/projects/:projectId/references/:referenceId
router.put('/:projectId/references/:referenceId', async (req: Request, res: Response) => {
  try {
    const { referenceId } = req.params;
    const { title, content, category, priority, tags, url } = req.body;
    
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (category !== undefined) updateData.category = category.toUpperCase();
    if (priority !== undefined) updateData.priority = priority;
    if (tags !== undefined) updateData.tags = tags;
    if (url !== undefined) updateData.url = url;
    
    const reference = await prisma.reference.update({
      where: { id: referenceId },
      data: updateData
    });
    
    res.json(reference);
  } catch (error: any) {
    console.error('PUT /api/projects/:projectId/references/:referenceId error:', error);
    
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Reference not found' });
      return;
    }
    
    res.status(500).json({ error: 'Failed to update reference' });
  }
});

// DELETE /api/projects/:projectId/references/:referenceId
router.delete('/:projectId/references/:referenceId', async (req: Request, res: Response) => {
  try {
    const { referenceId } = req.params;
    
    await prisma.reference.delete({
      where: { id: referenceId }
    });
    
    res.json({ message: 'Reference deleted successfully' });
  } catch (error: any) {
    console.error('DELETE /api/projects/:projectId/references/:referenceId error:', error);
    
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Reference not found' });
      return;
    }
    
    res.status(500).json({ error: 'Failed to delete reference' });
  }
});

export default router;