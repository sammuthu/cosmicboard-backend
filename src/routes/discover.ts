/**
 * Discover Feed Routes
 *
 * Implements efficient, scalable public content feed with:
 * - Cursor-based pagination for infinite scroll
 * - Content type filtering
 * - Optimized queries with proper indexing
 * - Foundation for future personalization
 */

import { Router, Response } from 'express';
import { prisma } from '../lib/database';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { ContentType } from '@prisma/client';

const router = Router();

/**
 * GET /api/discover/feed
 *
 * Fetch public content feed with cursor-based pagination
 *
 * Query params:
 * - cursor: ISO timestamp for pagination (optional, defaults to now)
 * - limit: Number of items to fetch (default: 20, max: 50)
 * - type: Filter by content type (optional: PROJECT, TASK, NOTE, PHOTO, SCREENSHOT, PDF, EVENT)
 *
 * Returns paginated feed with content metadata
 */
router.get('/feed', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const {
      cursor,
      limit = '20',
      type
    } = req.query;

    // Parse and validate limit
    const pageSize = Math.min(parseInt(limit as string) || 20, 50);

    // Parse cursor (ISO timestamp)
    const cursorDate = cursor ? new Date(cursor as string) : undefined;

    // Build where clause
    const where: any = {
      visibility: 'PUBLIC',
      // Exclude content from current user (show others' content)
      ownerId: { not: req.user!.id }
    };

    // Add cursor for pagination
    if (cursorDate && !isNaN(cursorDate.getTime())) {
      where.createdAt = { lt: cursorDate };
    }

    // Add content type filter
    if (type && typeof type === 'string') {
      where.contentType = type.toUpperCase() as ContentType;
    }

    console.log('🔍 Discover feed query:', { where, pageSize, cursor });

    // Fetch content visibility records with optimized query
    const contentItems = await prisma.contentVisibility.findMany({
      where,
      orderBy: {
        createdAt: 'desc'  // Most recent first
      },
      take: pageSize + 1,  // Fetch one extra to check if there's more
      select: {
        id: true,
        contentType: true,
        contentId: true,
        ownerId: true,
        visibility: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            username: true,
            bio: true
          }
        }
      }
    });

    console.log(`📦 Found ${contentItems.length} content items`);

    // Check if there are more items
    const hasMore = contentItems.length > pageSize;
    const items = hasMore ? contentItems.slice(0, pageSize) : contentItems;

    // Fetch actual content details for each item
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        let contentDetails: any = null;

        try {
          switch (item.contentType) {
            case 'PROJECT':
              contentDetails = await prisma.project.findUnique({
                where: { id: item.contentId },
                select: {
                  id: true,
                  name: true,
                  description: true,
                  priority: true,
                  createdAt: true,
                  updatedAt: true,
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
              break;

            case 'TASK':
              contentDetails = await prisma.task.findUnique({
                where: { id: item.contentId },
                select: {
                  id: true,
                  title: true,
                  content: true,
                  priority: true,
                  status: true,
                  tags: true,
                  dueDate: true,
                  completedAt: true,
                  createdAt: true,
                  updatedAt: true,
                  project: {
                    select: {
                      id: true,
                      name: true
                    }
                  },
                  event: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              });
              break;

            case 'NOTE':
              contentDetails = await prisma.reference.findUnique({
                where: { id: item.contentId },
                select: {
                  id: true,
                  title: true,
                  content: true,
                  category: true,
                  tags: true,
                  language: true,
                  createdAt: true,
                  updatedAt: true,
                  project: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              });
              break;

            case 'EVENT':
              contentDetails = await prisma.event.findUnique({
                where: { id: item.contentId },
                select: {
                  id: true,
                  name: true,
                  description: true,
                  startDate: true,
                  endDate: true,
                  location: true,
                  createdAt: true,
                  updatedAt: true,
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
                }
              });
              break;

            case 'PHOTO':
            case 'SCREENSHOT':
            case 'PDF':
              contentDetails = await prisma.media.findUnique({
                where: { id: item.contentId },
                select: {
                  id: true,
                  name: true,
                  type: true,
                  url: true,
                  thumbnailUrl: true,
                  size: true,
                  mimeType: true,
                  createdAt: true,
                  updatedAt: true,
                  project: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              });
              break;
          }
        } catch (error) {
          console.error(`Error fetching ${item.contentType} content:`, error);
          // Return null content if fetch fails
        }

        // Return enriched item with content details
        return {
          id: item.id,
          contentType: item.contentType,
          contentId: item.contentId,
          visibility: item.visibility,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          owner: {
            id: item.owner.id,
            name: item.owner.name,
            email: item.owner.email,
            avatar: item.owner.avatar,
            username: item.owner.username || item.owner.email.split('@')[0],
            bio: item.owner.bio
          },
          content: contentDetails,
          engagement: {
            // Placeholder for future engagement features
            likes: 0,
            comments: 0,
            bookmarks: 0,
            views: 0
          }
        };
      })
    );

    // Filter out items where content was deleted or not found
    const validItems = enrichedItems.filter(item => item.content !== null);

    // Generate next cursor from last item
    const nextCursor = hasMore && validItems.length > 0
      ? validItems[validItems.length - 1].createdAt.toISOString()
      : null;

    console.log(`✅ Returning ${validItems.length} items, hasMore: ${hasMore}`);

    res.json({
      items: validItems,
      nextCursor,
      hasMore,
      meta: {
        count: validItems.length,
        requestedLimit: pageSize
      }
    });

  } catch (error) {
    console.error('GET /api/discover/feed error:', error);
    res.status(500).json({ error: 'Failed to fetch discover feed' });
  }
});

/**
 * GET /api/discover/stats
 *
 * Get discover feed statistics
 * - Total public content count
 * - Content type distribution
 * - Active contributors count
 */
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await prisma.$transaction([
      // Total public content count
      prisma.contentVisibility.count({
        where: { visibility: 'PUBLIC' }
      }),

      // Count by content type
      prisma.contentVisibility.groupBy({
        by: ['contentType'],
        where: { visibility: 'PUBLIC' },
        _count: true,
        orderBy: { contentType: 'asc' }
      }),

      // Active contributors (users with public content)
      prisma.contentVisibility.groupBy({
        by: ['ownerId'],
        where: { visibility: 'PUBLIC' },
        _count: true,
        orderBy: { ownerId: 'asc' }
      })
    ]);

    const [totalCount, typeDistribution, contributors] = stats;

    res.json({
      totalPublicContent: totalCount,
      contentTypes: typeDistribution.reduce((acc: any, item) => {
        acc[item.contentType] = item._count;
        return acc;
      }, {}),
      activeContributors: contributors.length
    });

  } catch (error) {
    console.error('GET /api/discover/stats error:', error);
    res.status(500).json({ error: 'Failed to fetch discover stats' });
  }
});

export default router;
