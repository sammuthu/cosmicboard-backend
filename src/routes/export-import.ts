import { Router, Request, Response } from 'express';
import { prisma } from '../server';

const router = Router();

// GET /api/export - Export all data
router.get('/export', async (req: Request, res: Response) => {
  try {
    // Fetch all data in parallel
    const [projects, tasks, references, media] = await Promise.all([
      prisma.project.findMany({
        orderBy: { createdAt: 'desc' }
      }),
      prisma.task.findMany({
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
      prisma.reference.findMany({
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
      prisma.media.findMany({
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
    
    // Transform for backward compatibility
    const transformedProjects = projects.map(p => ({
      ...p,
      _id: p.id
    }));
    
    const transformedTasks = tasks.map(task => ({
      ...task,
      _id: task.id,
      title: task.content,
      contentHtml: (task.metadata as any)?.contentHtml || '',
      tags: (task.metadata as any)?.tags || [],
      dueDate: (task.metadata as any)?.dueDate || null,
      projectId: task.projectId,
      projectName: task.project.name
    }));
    
    const transformedReferences = references.map(ref => ({
      ...ref,
      _id: ref.id,
      projectId: ref.projectId,
      projectName: ref.project.name
    }));
    
    const transformedMedia = media.map(m => ({
      ...m,
      _id: m.id,
      projectId: m.projectId,
      projectName: m.project.name
    }));
    
    const exportData = {
      version: '2.0.0',
      exportDate: new Date().toISOString(),
      data: {
        projects: transformedProjects,
        tasks: transformedTasks,
        references: transformedReferences,
        media: transformedMedia
      },
      stats: {
        totalProjects: projects.length,
        totalTasks: tasks.length,
        totalReferences: references.length,
        totalMedia: media.length,
        activeTasks: tasks.filter(t => t.status === 'ACTIVE').length,
        completedTasks: tasks.filter(t => t.status === 'COMPLETED').length,
        deletedTasks: tasks.filter(t => t.status === 'DELETED').length
      }
    };
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="cosmicboard-export-${Date.now()}.json"`);
    
    res.json(exportData);
  } catch (error) {
    console.error('GET /api/export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// POST /api/import - Import data
router.post('/import', async (req: Request, res: Response) => {
  try {
    const importData = req.body;
    
    if (!importData || !importData.data) {
      return res.status(400).json({ error: 'Invalid import data format' });
    }
    
    const { projects = [], tasks = [], references = [], media = [] } = importData.data;
    
    // Create a mapping of old IDs to new IDs for projects
    const projectIdMap = new Map<string, string>();
    
    // Import projects first
    for (const project of projects) {
      const { _id, id, createdAt, updatedAt, ...projectData } = project;
      
      const newProject = await prisma.project.create({
        data: {
          ...projectData,
          createdAt: createdAt ? new Date(createdAt) : undefined,
          updatedAt: updatedAt ? new Date(updatedAt) : undefined
        }
      });
      
      // Map old ID to new ID
      const oldId = _id || id;
      if (oldId) {
        projectIdMap.set(oldId, newProject.id);
      }
    }
    
    // Import tasks
    for (const task of tasks) {
      const { _id, id, title, contentHtml, tags, dueDate, projectId, projectName, createdAt, updatedAt, completedAt, deletedAt, ...taskData } = task;
      
      // Get the new project ID from the mapping
      const newProjectId = typeof projectId === 'string' ? projectIdMap.get(projectId) : null;
      
      if (!newProjectId) {
        console.warn(`Skipping task ${_id || id} - project not found`);
        continue;
      }
      
      await prisma.task.create({
        data: {
          ...taskData,
          projectId: newProjectId,
          content: title || taskData.content || 'Untitled Task',
          metadata: {
            contentHtml,
            tags: tags || [],
            dueDate: dueDate ? new Date(dueDate).toISOString() : null
          },
          createdAt: createdAt ? new Date(createdAt) : undefined,
          updatedAt: updatedAt ? new Date(updatedAt) : undefined,
          completedAt: completedAt ? new Date(completedAt) : null,
          deletedAt: deletedAt ? new Date(deletedAt) : null
        }
      });
    }
    
    // Import references
    for (const reference of references) {
      const { _id, id, projectId, projectName, createdAt, updatedAt, ...refData } = reference;
      
      // Get the new project ID from the mapping
      const newProjectId = typeof projectId === 'string' ? projectIdMap.get(projectId) : null;
      
      if (!newProjectId) {
        console.warn(`Skipping reference ${_id || id} - project not found`);
        continue;
      }
      
      await prisma.reference.create({
        data: {
          ...refData,
          projectId: newProjectId,
          createdAt: createdAt ? new Date(createdAt) : undefined,
          updatedAt: updatedAt ? new Date(updatedAt) : undefined
        }
      });
    }
    
    // Import media (if exists in import data)
    for (const mediaItem of media) {
      const { _id, id, projectId, projectName, createdAt, updatedAt, ...mediaData } = mediaItem;
      
      // Get the new project ID from the mapping
      const newProjectId = typeof projectId === 'string' ? projectIdMap.get(projectId) : null;
      
      if (!newProjectId) {
        console.warn(`Skipping media ${_id || id} - project not found`);
        continue;
      }
      
      // Note: Media files themselves need to be uploaded separately
      // This only imports the metadata
      await prisma.media.create({
        data: {
          ...mediaData,
          projectId: newProjectId,
          createdAt: createdAt ? new Date(createdAt) : undefined,
          updatedAt: updatedAt ? new Date(updatedAt) : undefined
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Data imported successfully',
      stats: {
        projectsImported: projects.length,
        tasksImported: tasks.length,
        referencesImported: references.length,
        mediaImported: media.length
      }
    });
  } catch (error) {
    console.error('POST /api/import error:', error);
    res.status(500).json({ error: 'Failed to import data' });
  }
});

export default router;