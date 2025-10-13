import { Router, Request, Response } from 'express';
import { prisma } from '../lib/database';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { upsertContentVisibility } from '../services/content-visibility.service';

const router = Router();

// GET /api/projects
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Check for 'deleted' query param to show deleted projects
    const showDeleted = req.query.deleted === 'true';

    const projects = await prisma.project.findMany({
      where: {
        userId: req.user!.id,
        deletedAt: showDeleted ? { not: null } : null
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            tasks: true,
            references: true,
            media: true
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
        },
        media: {
          select: {
            type: true
          }
        }
      }
    });
    
    // Transform the data to match the expected format
    const projectsWithCounts = projects.map(project => {
      // Radar (Tasks) counts - for now, treating all ACTIVE as created (not started)
      // Later we can add a field to track task progress
      const created = project.tasks.filter(t => t.status === 'ACTIVE').length;
      const inProgress = 0; // TODO: Add progress tracking to tasks
      const completed = project.tasks.filter(t => t.status === 'COMPLETED').length;
      const deleted = project.tasks.filter(t => t.status === 'DELETED').length;

      // Neural Notes - All references (SNIPPET, DOCUMENTATION, LINK, NOTE)
      const neuralNotes = project.references.length;

      // Moments - Photo media
      const moments = project.media.filter(m => m.type === 'PHOTO').length;

      // Snaps - Screenshot media
      const snaps = project.media.filter(m => m.type === 'SCREENSHOT').length;

      // Scrolls - PDF and Document media
      const scrolls = project.media.filter(m =>
        m.type === 'PDF' || m.type === 'DOCUMENT'
      ).length;

      // Remove the included relations from the response
      const { tasks, references, media, _count, ...projectData } = project;

      return {
        ...projectData,
        _id: project.id, // For backward compatibility
        counts: {
          radar: {
            created,     // Not started tasks
            inProgress,  // Started but not completed
            completed    // Completed tasks
          },
          neuralNotes,   // Notes and snippets
          moments,       // Photos
          snaps,         // Screenshots
          scrolls,       // PDFs and documents
          // Keep old format for backward compatibility
          tasks: { active: created, completed, deleted },
          references: {
            total: project._count.references,
            snippets: project.references.filter(r => r.category === 'SNIPPET').length,
            documentation: project.media.filter(m => m.type === 'PDF').length
          }
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
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, priority = 'NEBULA', visibility = 'PRIVATE' } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Project name is required' });
      return;
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        priority: priority as any, // Convert to enum (SUPERNOVA, STELLAR, NEBULA)
        visibility: visibility as any, // Convert to enum (PUBLIC, CONTACTS, PRIVATE)
        userId: req.user!.id,
        metadata: {} // Initialize with empty JSON object
      }
    });

    // Sync visibility to ContentVisibility table
    await upsertContentVisibility('PROJECT', project.id, project.visibility, project.userId);
    console.log(`✅ Created project ${project.id} with visibility ${project.visibility}`);

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
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // First try to find the project
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            tasks: true,
            references: true,
            media: true,
            events: true
          }
        }
      }
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Check access permissions
    const isOwner = project.userId === req.user!.id;
    const isPublic = project.visibility === 'PUBLIC';

    // TODO: Add CONTACTS visibility check when user relationships are implemented
    // const isContact = project.visibility === 'CONTACTS' && await checkIfContact(req.user!.id, project.userId)

    if (!isOwner && !isPublic) {
      res.status(403).json({ error: 'You do not have permission to view this project' });
      return;
    }

    res.json({ ...project, _id: project.id, isOwner });
  } catch (error) {
    console.error('GET /api/projects/:id error:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// PUT /api/projects/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, priority, visibility } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority; // SUPERNOVA, STELLAR, NEBULA
    if (visibility !== undefined) updateData.visibility = visibility; // PUBLIC, CONTACTS, PRIVATE

    const project = await prisma.project.update({
      where: { id, userId: req.user!.id },
      data: updateData
    });

    // Sync visibility to ContentVisibility table if visibility was updated
    if (visibility !== undefined) {
      await upsertContentVisibility('PROJECT', project.id, project.visibility, project.userId);
      console.log(`✅ Synced project ${project.id} visibility to ${project.visibility}`);
    }

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

// PATCH /api/projects/:id/priority
router.patch('/:id/priority', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { priority } = req.body;

    if (!priority || !['SUPERNOVA', 'STELLAR', 'NEBULA'].includes(priority)) {
      res.status(400).json({ error: 'Invalid priority. Must be SUPERNOVA, STELLAR, or NEBULA' });
      return;
    }

    const project = await prisma.project.update({
      where: { id, userId: req.user!.id },
      data: { priority: priority as any }
    });

    res.json({ ...project, _id: project.id });
  } catch (error: any) {
    console.error('PATCH /api/projects/:id/priority error:', error);

    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.status(500).json({ error: 'Failed to update project priority' });
  }
});

// DELETE /api/projects/:id (Soft delete)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;

    if (permanent === 'true') {
      // Permanent deletion
      await prisma.project.delete({
        where: { id, userId: req.user!.id }
      });

      res.json({ message: 'Project permanently deleted' });
    } else {
      // Soft delete - update deletedAt timestamp
      const project = await prisma.project.update({
        where: { id, userId: req.user!.id },
        data: { deletedAt: new Date() }
      });

      res.json({ message: 'Project moved to trash', project });
    }
  } catch (error: any) {
    console.error('DELETE /api/projects/:id error:', error);

    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// POST /api/projects/:id/restore (Restore soft deleted project)
router.post('/:id/restore', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Restore soft deleted project
    const project = await prisma.project.update({
      where: { id, userId: req.user!.id },
      data: { deletedAt: null }
    });

    res.json({ message: 'Project restored successfully', project });
  } catch (error: any) {
    console.error('POST /api/projects/:id/restore error:', error);

    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.status(500).json({ error: 'Failed to restore project' });
  }
});

// GET /api/projects/:projectId/tasks
router.get('/:projectId/tasks', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;

    // First verify the project exists and check permissions
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Check access permissions
    const isOwner = project.userId === req.user!.id;
    const isPublic = project.visibility === 'PUBLIC';

    if (!isOwner && !isPublic) {
      res.status(403).json({ error: 'You do not have permission to view this project' });
      return;
    }

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

// GET /api/projects/:projectId/tasks/:taskId
router.get('/:projectId/tasks/:taskId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, taskId } = req.params;

    // First verify the project belongs to the user
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user!.id }
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const task = await prisma.task.findFirst({
      where: { id: taskId, projectId }
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json(task);
  } catch (error) {
    console.error('GET /api/projects/:projectId/tasks/:taskId error:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// POST /api/projects/:projectId/tasks
router.post('/:projectId/tasks', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { title, content, priority = 'NEBULA', status = 'ACTIVE', tags = [], dueDate } = req.body;

    const task = await prisma.task.create({
      data: {
        projectId,
        title: title || content || 'Untitled Task',
        content: content || title || 'No description',
        priority: priority as any, // Convert to enum (SUPERNOVA, STELLAR, NEBULA)
        status: status as any,
        tags: tags || [],
        dueDate: dueDate ? new Date(dueDate) : null,
        creatorId: req.user!.id
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
    const { title, content, priority, status, tags, dueDate } = req.body;

    console.log('Updating task:', taskId, 'with body:', { title, content, priority, status, tags, dueDate });

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (priority !== undefined) updateData.priority = priority;
    if (tags !== undefined) updateData.tags = tags;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
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
    const showDeleted = req.query.deleted === 'true';

    const references = await prisma.reference.findMany({
      where: {
        projectId
        // TODO: Add deletedAt filter when field is added
        // deletedAt: showDeleted ? { not: null } : null
      },
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
        userId: 'temp-user-id', // TODO: Get from authenticated user
        title,
        content,
        category: categoryUpper,
        tags,
        language: url ? 'link' : undefined
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

// DELETE /api/projects/:projectId/references/:referenceId (Soft delete)
router.delete('/:projectId/references/:referenceId', async (req: Request, res: Response) => {
  try {
    const { referenceId } = req.params;
    const { permanent } = req.query;

    if (permanent === 'true') {
      // Permanent deletion
      await prisma.reference.delete({
        where: { id: referenceId }
      });

      res.json({ message: 'Reference permanently deleted' });
    } else {
      // Soft delete - for now just delete normally until deletedAt field is added
      // TODO: Use soft delete when deletedAt field is added
      await prisma.reference.delete({
        where: { id: referenceId }
      });

      res.json({ message: 'Reference moved to trash' });
    }
  } catch (error: any) {
    console.error('DELETE /api/projects/:projectId/references/:referenceId error:', error);

    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Reference not found' });
      return;
    }

    res.status(500).json({ error: 'Failed to delete reference' });
  }
});

// POST /api/projects/:projectId/references/:referenceId/restore
router.post('/:projectId/references/:referenceId/restore', async (req: Request, res: Response) => {
  try {
    // TODO: Implement restore when deletedAt field is added
    res.json({ message: 'Restore functionality will be available soon' });
  } catch (error: any) {
    console.error('POST /api/projects/:projectId/references/:referenceId/restore error:', error);

    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Reference not found' });
      return;
    }

    res.status(500).json({ error: 'Failed to restore reference' });
  }
});

export default router;