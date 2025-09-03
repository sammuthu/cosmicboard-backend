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

export default router;