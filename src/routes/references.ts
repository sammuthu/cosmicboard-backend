import { Router, Request, Response } from 'express';
import { prisma } from '../server';
import { Priority, Category } from '@prisma/client';

const router = Router();

// GET /api/references
router.get('/', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }
    
    const references = await prisma.reference.findMany({
      where: { projectId: projectId as string },
      orderBy: { createdAt: 'desc' }
    });
    
    // Transform for backward compatibility
    const transformedReferences = references.map(ref => ({
      ...ref,
      _id: ref.id
    }));
    
    res.json(transformedReferences);
  } catch (error) {
    console.error('Error fetching references:', error);
    res.status(500).json({ error: 'Failed to fetch references' });
  }
});

// POST /api/references
router.post('/', async (req: Request, res: Response) => {
  try {
    const { projectId, title, content, url, category, priority, tags, metadata } = req.body;
    
    if (!projectId || !title || !content) {
      return res.status(400).json({ error: 'Project ID, title, and content are required' });
    }
    
    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Map category string to enum value
    const categoryMap: { [key: string]: Category } = {
      'documentation': 'DOCUMENTATION',
      'snippet': 'SNIPPET',
      'configuration': 'CONFIGURATION',
      'tools': 'TOOLS',
      'api': 'API',
      'tutorial': 'TUTORIAL',
      'reference': 'REFERENCE',
      'prompt': 'SNIPPET', // Map prompt to SNIPPET
      'link': 'REFERENCE', // Map link to REFERENCE
      'other': 'DOCUMENTATION' // Default fallback
    };
    
    const reference = await prisma.reference.create({
      data: {
        projectId,
        title,
        content,
        url,
        category: categoryMap[category?.toLowerCase()] || 'DOCUMENTATION',
        priority: (priority || 'MEDIUM') as Priority,
        tags: tags || [],
        metadata: metadata || {}
      }
    });
    
    // Transform for backward compatibility
    const transformedReference = {
      ...reference,
      _id: reference.id
    };
    
    res.status(201).json(transformedReference);
  } catch (error) {
    console.error('Error creating reference:', error);
    res.status(500).json({ error: 'Failed to create reference' });
  }
});

// GET /api/references/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const reference = await prisma.reference.findUnique({
      where: { id }
    });
    
    if (!reference) {
      return res.status(404).json({ error: 'Reference not found' });
    }
    
    res.json({ ...reference, _id: reference.id });
  } catch (error) {
    console.error('GET /api/references/:id error:', error);
    res.status(500).json({ error: 'Failed to fetch reference' });
  }
});

// PUT /api/references/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, url, category, priority, tags } = req.body;
    
    const updateData: any = {};
    
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (url !== undefined) updateData.url = url;
    if (priority !== undefined) updateData.priority = priority;
    if (tags !== undefined) updateData.tags = tags;
    
    if (category !== undefined) {
      const categoryMap: { [key: string]: Category } = {
        'documentation': 'DOCUMENTATION',
        'snippet': 'SNIPPET',
        'configuration': 'CONFIGURATION',
        'tools': 'TOOLS',
        'api': 'API',
        'tutorial': 'TUTORIAL',
        'reference': 'REFERENCE',
        'other': 'DOCUMENTATION'
      };
      updateData.category = categoryMap[category?.toLowerCase()] || 'DOCUMENTATION';
    }
    
    const reference = await prisma.reference.update({
      where: { id },
      data: updateData
    });
    
    res.json({ ...reference, _id: reference.id });
  } catch (error: any) {
    console.error('PUT /api/references/:id error:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Reference not found' });
    }
    
    res.status(500).json({ error: 'Failed to update reference' });
  }
});

// DELETE /api/references/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.reference.delete({
      where: { id }
    });
    
    res.json({ message: 'Reference deleted successfully' });
  } catch (error: any) {
    console.error('DELETE /api/references/:id error:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Reference not found' });
    }
    
    res.status(500).json({ error: 'Failed to delete reference' });
  }
});

export default router;