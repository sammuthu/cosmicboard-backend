/**
 * Content Visibility Service
 *
 * This service manages the ContentVisibility tracking table which provides
 * a centralized view of all content visibility across different content types.
 *
 * It automatically creates, updates, and deletes ContentVisibility records
 * when content is created, updated, or deleted.
 */

import { prisma } from '../lib/database';
import { ContentType, Visibility } from '@prisma/client';

/**
 * Create or update a ContentVisibility record
 */
export async function upsertContentVisibility(
  contentType: ContentType,
  contentId: string,
  visibility: Visibility,
  ownerId: string
): Promise<void> {
  try {
    await prisma.contentVisibility.upsert({
      where: {
        contentType_contentId: {
          contentType,
          contentId
        }
      },
      create: {
        contentType,
        contentId,
        visibility,
        ownerId
      },
      update: {
        visibility,
        updatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error upserting ContentVisibility:', error);
    throw error;
  }
}

/**
 * Delete a ContentVisibility record
 */
export async function deleteContentVisibility(
  contentType: ContentType,
  contentId: string
): Promise<void> {
  try {
    await prisma.contentVisibility.deleteMany({
      where: {
        contentType,
        contentId
      }
    });
  } catch (error) {
    console.error('Error deleting ContentVisibility:', error);
    throw error;
  }
}

/**
 * Get ContentVisibility record
 */
export async function getContentVisibility(
  contentType: ContentType,
  contentId: string
) {
  try {
    return await prisma.contentVisibility.findUnique({
      where: {
        contentType_contentId: {
          contentType,
          contentId
        }
      }
    });
  } catch (error) {
    console.error('Error getting ContentVisibility:', error);
    throw error;
  }
}

/**
 * Get all ContentVisibility records for a user
 */
export async function getUserContentVisibility(
  userId: string,
  contentType?: ContentType
) {
  try {
    const where: any = { ownerId: userId };
    if (contentType) {
      where.contentType = contentType;
    }

    return await prisma.contentVisibility.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    console.error('Error getting user ContentVisibility:', error);
    throw error;
  }
}

/**
 * Sync visibility from content table to ContentVisibility table
 * This is useful for migration or cleanup operations
 */
export async function syncContentVisibility(
  contentType: ContentType,
  contentId: string
): Promise<void> {
  try {
    let visibility: Visibility | null = null;
    let ownerId: string | null = null;

    // Fetch visibility from the appropriate content table
    switch (contentType) {
      case 'PROJECT':
        const project = await prisma.project.findUnique({
          where: { id: contentId },
          select: { visibility: true, userId: true }
        });
        if (project) {
          visibility = project.visibility;
          ownerId = project.userId;
        }
        break;

      case 'TASK':
        const task = await prisma.task.findUnique({
          where: { id: contentId },
          select: { visibility: true, creatorId: true }
        });
        if (task) {
          visibility = task.visibility;
          ownerId = task.creatorId;
        }
        break;

      case 'NOTE':
        const reference = await prisma.reference.findUnique({
          where: { id: contentId },
          select: { visibility: true, userId: true }
        });
        if (reference) {
          visibility = reference.visibility;
          ownerId = reference.userId;
        }
        break;

      case 'PHOTO':
      case 'SCREENSHOT':
      case 'PDF':
        const media = await prisma.media.findUnique({
          where: { id: contentId },
          select: { visibility: true, userId: true }
        });
        if (media) {
          visibility = media.visibility;
          ownerId = media.userId;
        }
        break;

      case 'EVENT':
        const event = await prisma.event.findUnique({
          where: { id: contentId },
          select: { visibility: true, createdBy: true }
        });
        if (event) {
          visibility = event.visibility;
          ownerId = event.createdBy;
        }
        break;

      default:
        throw new Error(`Unknown content type: ${contentType}`);
    }

    if (visibility && ownerId) {
      await upsertContentVisibility(contentType, contentId, visibility, ownerId);
    }
  } catch (error) {
    console.error('Error syncing ContentVisibility:', error);
    throw error;
  }
}

/**
 * Helper function to map media type to ContentType
 */
export function mapMediaTypeToContentType(mediaType: string): ContentType {
  switch (mediaType.toUpperCase()) {
    case 'PHOTO':
      return ContentType.PHOTO;
    case 'SCREENSHOT':
      return ContentType.SCREENSHOT;
    case 'PDF':
    case 'DOCUMENT':
      return ContentType.PDF;
    default:
      return ContentType.PDF; // Default fallback
  }
}

/**
 * Bulk sync all content visibility records
 * This is useful for migration purposes
 */
export async function bulkSyncContentVisibility(): Promise<{
  projects: number;
  tasks: number;
  references: number;
  media: number;
  events: number;
  total: number;
}> {
  try {
    let synced = { projects: 0, tasks: 0, references: 0, media: 0, events: 0, total: 0 };

    // Sync Projects
    const projects = await prisma.project.findMany({
      select: { id: true, visibility: true, userId: true }
    });
    for (const project of projects) {
      await upsertContentVisibility('PROJECT', project.id, project.visibility, project.userId);
      synced.projects++;
    }

    // Sync Tasks
    const tasks = await prisma.task.findMany({
      select: { id: true, visibility: true, creatorId: true }
    });
    for (const task of tasks) {
      await upsertContentVisibility('TASK', task.id, task.visibility, task.creatorId);
      synced.tasks++;
    }

    // Sync References (Notes)
    const references = await prisma.reference.findMany({
      select: { id: true, visibility: true, userId: true }
    });
    for (const reference of references) {
      await upsertContentVisibility('NOTE', reference.id, reference.visibility, reference.userId);
      synced.references++;
    }

    // Sync Media
    const mediaItems = await prisma.media.findMany({
      select: { id: true, type: true, visibility: true, userId: true }
    });
    for (const media of mediaItems) {
      const contentType = mapMediaTypeToContentType(media.type);
      await upsertContentVisibility(contentType, media.id, media.visibility, media.userId);
      synced.media++;
    }

    // Sync Events
    const events = await prisma.event.findMany({
      select: { id: true, visibility: true, createdBy: true },
      where: { deletedAt: null }
    });
    for (const event of events) {
      await upsertContentVisibility('EVENT', event.id, event.visibility, event.createdBy);
      synced.events++;
    }

    synced.total = synced.projects + synced.tasks + synced.references + synced.media + synced.events;
    return synced;
  } catch (error) {
    console.error('Error bulk syncing ContentVisibility:', error);
    throw error;
  }
}
