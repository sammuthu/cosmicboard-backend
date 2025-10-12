import { Router, Request, Response } from 'express';
import { prisma } from '../lib/database';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// GET /api/events (Get all events for all user's projects)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Get all events from projects owned by the user
    const events = await prisma.event.findMany({
      where: {
        project: {
          userId: req.user!.id
        },
        deletedAt: null
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            tasks: true
          }
        }
      },
      orderBy: { startDate: 'asc' }
    });

    res.json(events);
  } catch (error) {
    console.error('GET /api/events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// GET /api/events/:projectId/events (Get events for a specific project)
router.get('/:projectId/events', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;

    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user!.id }
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const events = await prisma.event.findMany({
      where: {
        projectId,
        deletedAt: null
      },
      include: {
        _count: {
          select: {
            tasks: true
          }
        }
      },
      orderBy: { startDate: 'asc' }
    });

    res.json(events);
  } catch (error) {
    console.error('GET /api/events/:projectId/events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// GET /api/events/:id (Get single event)
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findFirst({
      where: {
        id,
        project: {
          userId: req.user!.id
        }
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true
          }
        }
      }
    });

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    res.json(event);
  } catch (error) {
    console.error('GET /api/events/:id error:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// POST /api/events (Create event)
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const {
      projectId,
      name,
      description,
      startDate,
      endDate,
      location,
      visibility = 'PRIVATE'
    } = req.body;

    if (!projectId || !name) {
      res.status(400).json({ error: 'Project ID and event name are required' });
      return;
    }

    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user!.id }
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const event = await prisma.event.create({
      data: {
        projectId,
        name,
        description,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        location,
        visibility: visibility as any,
        createdBy: req.user!.id
      }
    });

    res.status(201).json(event);
  } catch (error: any) {
    console.error('POST /api/events error:', error);

    if (error.code === 'P2003') {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.status(500).json({ error: 'Failed to create event' });
  }
});

// PUT /api/events/:id (Update event)
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      startDate,
      endDate,
      location,
      visibility
    } = req.body;

    // Verify event belongs to user's project
    const existingEvent = await prisma.event.findFirst({
      where: {
        id,
        project: {
          userId: req.user!.id
        }
      }
    });

    if (!existingEvent) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (location !== undefined) updateData.location = location;
    if (visibility !== undefined) updateData.visibility = visibility;

    const event = await prisma.event.update({
      where: { id },
      data: updateData
    });

    res.json(event);
  } catch (error: any) {
    console.error('PUT /api/events/:id error:', error);

    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    res.status(500).json({ error: 'Failed to update event' });
  }
});

// DELETE /api/events/:id (Soft delete)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;

    // Verify event belongs to user's project
    const existingEvent = await prisma.event.findFirst({
      where: {
        id,
        project: {
          userId: req.user!.id
        }
      }
    });

    if (!existingEvent) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    if (permanent === 'true') {
      // Permanent deletion - this will set eventId to null on linked tasks (cascade)
      await prisma.event.delete({
        where: { id }
      });

      res.json({ message: 'Event permanently deleted' });
    } else {
      // Soft delete
      const event = await prisma.event.update({
        where: { id },
        data: { deletedAt: new Date() }
      });

      res.json({ message: 'Event moved to trash', event });
    }
  } catch (error: any) {
    console.error('DELETE /api/events/:id error:', error);

    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// POST /api/events/:id/restore (Restore soft deleted event)
router.post('/:id/restore', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verify event belongs to user's project
    const existingEvent = await prisma.event.findFirst({
      where: {
        id,
        project: {
          userId: req.user!.id
        }
      }
    });

    if (!existingEvent) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const event = await prisma.event.update({
      where: { id },
      data: { deletedAt: null }
    });

    res.json({ message: 'Event restored successfully', event });
  } catch (error: any) {
    console.error('POST /api/events/:id/restore error:', error);

    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    res.status(500).json({ error: 'Failed to restore event' });
  }
});

export default router;
