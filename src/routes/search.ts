import { Router, Request, Response } from 'express';
import { prisma } from '../server';

const router = Router();

// GET /api/search - Global search across projects, tasks, and references
router.get('/', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const searchQuery = q.toLowerCase();
    
    // Search in parallel for better performance
    const [projects, tasks, references] = await Promise.all([
      // Search projects
      prisma.project.findMany({
        where: {
          OR: [
            { name: { contains: searchQuery, mode: 'insensitive' } },
            { description: { contains: searchQuery, mode: 'insensitive' } }
          ]
        },
        orderBy: { createdAt: 'desc' }
      }),
      
      // Search tasks
      prisma.task.findMany({
        where: {
          OR: [
            { content: { contains: searchQuery, mode: 'insensitive' } }
            // Could add JSONB search for metadata.contentHtml if needed
          ]
        },
        include: {
          project: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      
      // Search references
      prisma.reference.findMany({
        where: {
          OR: [
            { title: { contains: searchQuery, mode: 'insensitive' } },
            { content: { contains: searchQuery, mode: 'insensitive' } },
            { url: { contains: searchQuery, mode: 'insensitive' } }
          ]
        },
        include: {
          project: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);
    
    // Transform tasks for backward compatibility
    const transformedTasks = tasks.map(task => ({
      ...task,
      _id: task.id,
      title: task.content,
      contentHtml: (task.metadata as any)?.contentHtml || '',
      tags: (task.metadata as any)?.tags || [],
      dueDate: (task.metadata as any)?.dueDate || null,
      projectId: task.project
    }));
    
    // Transform references for backward compatibility
    const transformedReferences = references.map(ref => ({
      ...ref,
      _id: ref.id,
      projectId: ref.projectId,
      projectName: ref.project.name
    }));
    
    // Transform projects for backward compatibility
    const transformedProjects = projects.map(project => ({
      ...project,
      _id: project.id
    }));
    
    res.json({
      projects: transformedProjects,
      tasks: transformedTasks,
      references: transformedReferences,
      totalResults: projects.length + tasks.length + references.length
    });
  } catch (error) {
    console.error('GET /api/search error:', error);
    res.status(500).json({ error: 'Failed to perform search' });
  }
});

export default router;