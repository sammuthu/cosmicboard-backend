# Discover Feed Architecture - Scalable Design

## Overview

Design a highly efficient, scalable public content feed system inspired by Twitter, Instagram, and LinkedIn, optimized for billions of users while maintaining sub-100ms query times.

## Key Requirements

1. **Performance**: Sub-100ms query response time
2. **Scalability**: Handle billions of users and content items
3. **Pagination**: Efficient cursor-based pagination
4. **Personalization**: User interest tracking for future recommendations
5. **Real-time**: Recent content prioritized
6. **Efficient Queries**: Proper indexing and query optimization

## Architecture Design

### 1. Feed Generation Strategy

**Hybrid Approach: Pull + Push (with eventual push optimization)**

#### Phase 1: Pull-based (Current - Simple & Effective)
- Query ContentVisibility table for PUBLIC content
- Filter by content type
- Order by creation date (recent first)
- Use cursor-based pagination
- Cache results for 1-5 minutes

**Advantages:**
- Simple to implement
- Works perfectly for small-medium scale (millions of users)
- No stale data
- Easy to debug

**Performance Targets:**
- Up to 10M users: ~50ms query time
- Up to 100M users: ~100ms with proper indexing
- Up to 1B users: Needs push optimization

#### Phase 2: Push-based (Future - For Billions)
- Pre-compute feeds for active users
- Write to user-specific feed tables
- Background jobs update feeds on new content
- Pull model falls back for inactive users

### 2. Database Schema Optimization

#### Optimized ContentVisibility Table

```sql
CREATE TABLE "ContentVisibility" (
  id TEXT PRIMARY KEY,
  "contentType" "ContentType" NOT NULL,
  "contentId" TEXT NOT NULL,
  visibility "Visibility" NOT NULL DEFAULT 'PRIVATE',
  "ownerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL,

  -- Denormalized fields for efficient querying
  "ownerName" TEXT,              -- Cache user name
  "ownerAvatar" TEXT,            -- Cache user avatar
  "contentTitle" TEXT,           -- Cache content title
  "contentPreview" TEXT,         -- Cache content preview/description
  "engagementCount" INTEGER DEFAULT 0,  -- Total likes + comments + bookmarks
  "viewCount" INTEGER DEFAULT 0,
  "lastEngagedAt" TIMESTAMP,     -- Last like/comment time

  UNIQUE("contentType", "contentId")
);

-- Critical indexes for feed queries
CREATE INDEX "idx_visibility_public_feed" ON "ContentVisibility"
  (visibility, "createdAt" DESC)
  WHERE visibility = 'PUBLIC';

CREATE INDEX "idx_visibility_public_trending" ON "ContentVisibility"
  (visibility, "engagementCount" DESC, "createdAt" DESC)
  WHERE visibility = 'PUBLIC';

CREATE INDEX "idx_visibility_owner_public" ON "ContentVisibility"
  ("ownerId", visibility, "createdAt" DESC);
```

#### User Interest Tracking (Foundation)

```sql
CREATE TABLE "UserInterest" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "interestType" TEXT NOT NULL,  -- 'tag', 'category', 'user', 'contentType'
  "interestValue" TEXT NOT NULL,  -- Tag name, user ID, etc.
  score FLOAT NOT NULL DEFAULT 1.0,
  "lastInteractionAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL,

  FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
  UNIQUE("userId", "interestType", "interestValue")
);

CREATE INDEX "idx_user_interest_lookup" ON "UserInterest"
  ("userId", score DESC);
```

### 3. Feed Query Strategy

#### Query Pattern: Cursor-Based Pagination

```typescript
// Efficient cursor-based query
const feed = await prisma.contentVisibility.findMany({
  where: {
    visibility: 'PUBLIC',
    createdAt: cursor ? { lt: cursor } : undefined, // Cursor pagination
  },
  orderBy: [
    { createdAt: 'desc' }  // Most recent first
  ],
  take: 20,  // Page size
  select: {
    id: true,
    contentType: true,
    contentId: true,
    ownerId: true,
    createdAt: true,
    // Denormalized fields for performance
    ownerName: true,
    ownerAvatar: true,
    contentTitle: true,
    contentPreview: true,
    engagementCount: true,
    viewCount: true
  }
});
```

**Why Cursor-Based?**
- Consistent results during pagination
- No offset/limit issues with large datasets
- Works with any ordering
- Scales to billions of records

### 4. Caching Strategy

#### Redis Cache Layers

```typescript
// Layer 1: Full page cache (1-5 minutes)
const cacheKey = `feed:public:${cursor}:${limit}:v1`;

// Layer 2: User-specific cache (10-30 minutes)
const userCacheKey = `feed:user:${userId}:${cursor}:${limit}:v1`;

// Layer 3: Trending cache (5-15 minutes)
const trendingKey = `feed:trending:${cursor}:${limit}:v1`;
```

#### Cache Invalidation
- Time-based expiry (short TTL)
- Event-based invalidation on new public content
- Stale-while-revalidate pattern

### 5. Content Aggregation

Instead of N+1 queries, fetch denormalized data:

```typescript
// ❌ Bad: N+1 queries
for (const item of feed) {
  const user = await prisma.user.findUnique({ where: { id: item.ownerId } });
  const project = await prisma.project.findUnique({ where: { id: item.contentId } });
}

// ✅ Good: Denormalized + single batch query if needed
// ContentVisibility already has ownerName, ownerAvatar, contentTitle, contentPreview
// Only fetch full details on demand (click/expand)
```

### 6. Ranking Algorithm (Progressive Enhancement)

#### Phase 1: Simple Time-based (Current)
```
score = recency
```

#### Phase 2: Engagement-weighted
```
score = recency_weight * time_decay + engagement_weight * (likes + comments * 3 + bookmarks * 2)
```

#### Phase 3: Personalized (Future)
```
score = recency * time_decay + engagement_score + personalization_score

where:
  personalization_score = sum(interest_match_scores * interest_weights)
```

### 7. API Endpoint Design

```typescript
GET /api/discover/feed?cursor={timestamp}&limit={20}&type={all|project|task|note}

Response:
{
  items: [
    {
      id: "cv_123",
      contentType: "PROJECT",
      contentId: "proj_456",
      owner: {
        id: "user_789",
        name: "Sam Muthu",
        avatar: "url",
        username: "sammuthu"
      },
      content: {
        title: "Building a Productivity System",
        preview: "Documenting my journey...",
        visibility: "PUBLIC",
        createdAt: "2025-10-11T..."
      },
      engagement: {
        likes: 45,
        comments: 12,
        bookmarks: 8,
        views: 234
      },
      metadata: {
        tags: ["productivity", "workflow"],
        priority: "STELLAR"
      }
    }
  ],
  nextCursor: "2025-10-11T10:30:00.000Z",
  hasMore: true
}
```

### 8. Performance Optimizations

#### Database Level
1. **Composite Indexes**: Cover query patterns
2. **Partial Indexes**: Only PUBLIC content
3. **Materialized Views**: Pre-computed trending feeds
4. **Read Replicas**: Separate read/write databases

#### Application Level
1. **Connection Pooling**: Reuse database connections
2. **Query Batching**: Batch multiple queries
3. **Lazy Loading**: Fetch details on demand
4. **Response Compression**: gzip responses

#### Infrastructure Level
1. **CDN**: Cache static responses
2. **Load Balancer**: Distribute requests
3. **Horizontal Scaling**: Multiple app servers
4. **Database Sharding**: Partition by user ID (future)

### 9. Interest Tracking Implementation

Track user interactions for personalization:

```typescript
// Update interests on every interaction
async function trackInterest(userId, contentItem) {
  // Track tags
  for (const tag of contentItem.tags) {
    await updateInterestScore(userId, 'tag', tag, 0.5);
  }

  // Track content type
  await updateInterestScore(userId, 'contentType', contentItem.contentType, 0.3);

  // Track author (following)
  await updateInterestScore(userId, 'user', contentItem.ownerId, 1.0);

  // Decay old interests over time (background job)
}

async function updateInterestScore(userId, type, value, increment) {
  await prisma.userInterest.upsert({
    where: {
      userId_interestType_interestValue: {
        userId,
        interestType: type,
        interestValue: value
      }
    },
    create: {
      userId,
      interestType: type,
      interestValue: value,
      score: increment,
      lastInteractionAt: new Date()
    },
    update: {
      score: { increment },
      lastInteractionAt: new Date()
    }
  });
}
```

### 10. Scalability Milestones

| Users | Strategy | Query Time | Infrastructure |
|-------|----------|------------|----------------|
| < 100K | Simple query + cache | < 20ms | Single DB |
| < 1M | Indexed query + Redis | < 50ms | Single DB + Redis |
| < 10M | Denormalized + cache | < 100ms | Read replica + Redis |
| < 100M | Materialized views | < 150ms | Sharded DB + Redis cluster |
| 1B+ | Push-based feeds | < 50ms | Distributed system + Kafka |

### 11. Monitoring & Metrics

Track these metrics:
- Feed query latency (p50, p95, p99)
- Cache hit rate
- Database connection pool usage
- Engagement rate per content type
- User session duration on Discover

### 12. Future Enhancements

1. **Real-time Updates**: WebSocket for new content notifications
2. **Collaborative Filtering**: "Users like you also viewed..."
3. **Content Diversity**: Ensure varied content types
4. **Spam Detection**: Filter low-quality content
5. **A/B Testing**: Test ranking algorithms
6. **ML Recommendations**: Use ML models for personalization

---

## Implementation Plan

### Phase 1: MVP (Current)
✅ ContentVisibility table with basic indexes
✅ Simple time-based feed query
✅ Cursor-based pagination
🚧 Basic caching (5 min TTL)
🚧 Frontend infinite scroll

### Phase 2: Optimization (Week 4-5)
- Add denormalized fields to ContentVisibility
- Implement UserInterest tracking
- Add engagement counters
- Optimize database indexes
- Add Redis caching

### Phase 3: Personalization (Week 6-8)
- Interest-based ranking
- Trending content algorithm
- Content type preferences
- Following/connections influence

### Phase 4: Scale (Month 3+)
- Materialized views for trending
- Read replicas
- Push-based feed generation
- Distributed caching

---

**Status:** Phase 1 MVP ready for implementation
**Target Performance:** < 100ms query time for 1M+ users
**Scalability:** Proven patterns from Twitter, Instagram, LinkedIn
