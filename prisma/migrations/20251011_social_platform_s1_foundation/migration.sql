-- Phase S1: Social Platform Foundation
-- This migration adds the core tables and columns needed for social features
-- All changes are backward compatible (additive only)

-- ============================================
-- STEP 1: Create Enums
-- ============================================

CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'CONTACTS', 'PRIVATE');
CREATE TYPE "ContentType" AS ENUM ('PROJECT', 'TASK', 'NOTE', 'PHOTO', 'SCREENSHOT', 'PDF', 'EVENT');
CREATE TYPE "EngagementType" AS ENUM ('LIKE', 'BOOKMARK', 'VIEW');
CREATE TYPE "ConnectionType" AS ENUM ('CONTACT', 'FOLLOWING', 'BLOCKED');

-- ============================================
-- STEP 2: Add Visibility Columns to Existing Tables
-- ============================================

-- Add visibility to projects (default PRIVATE for existing data)
ALTER TABLE "Project"
ADD COLUMN "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE';

-- Add visibility to tasks (default PRIVATE for existing data)
ALTER TABLE "Task"
ADD COLUMN "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE';

-- Add visibility to references/neural notes (default PRIVATE for existing data)
ALTER TABLE "Reference"
ADD COLUMN "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE';

-- Add visibility to media (default PRIVATE for existing data)
ALTER TABLE "Media"
ADD COLUMN "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE';

-- ============================================
-- STEP 3: Create Events Table
-- ============================================

CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "location" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- Add event relationship to tasks
ALTER TABLE "Task"
ADD COLUMN "eventId" TEXT;

-- ============================================
-- STEP 4: Create Content Visibility Table
-- ============================================

-- This table tracks visibility settings for all content types
-- It's a central place to query what content is visible to whom
CREATE TABLE "ContentVisibility" (
    "id" TEXT NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "contentId" TEXT NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentVisibility_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- STEP 5: Create Content Engagement Table
-- ============================================

-- Stores likes, bookmarks, and views
CREATE TABLE "ContentEngagement" (
    "id" TEXT NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "contentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "engagementType" "EngagementType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentEngagement_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- STEP 6: Create Content Comments Table
-- ============================================

-- Threaded comments like X/Twitter
CREATE TABLE "ContentComment" (
    "id" TEXT NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "contentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "commentText" TEXT NOT NULL,
    "parentCommentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "ContentComment_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- STEP 7: Create Content Amplify Table
-- ============================================

-- Repost/amplify feature (like retweet but cosmic-themed)
CREATE TABLE "ContentAmplify" (
    "id" TEXT NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "contentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amplifyText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentAmplify_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- STEP 8: Create User Connections Table
-- ============================================

-- Contacts and following system
CREATE TABLE "UserConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "connectedUserId" TEXT NOT NULL,
    "connectionType" "ConnectionType" NOT NULL DEFAULT 'CONTACT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "UserConnection_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- STEP 9: Create Indexes
-- ============================================

-- Project visibility index
CREATE INDEX "Project_visibility_idx" ON "Project"("visibility");

-- Task visibility and event indexes
CREATE INDEX "Task_visibility_idx" ON "Task"("visibility");
CREATE INDEX "Task_eventId_idx" ON "Task"("eventId");

-- Reference visibility index
CREATE INDEX "Reference_visibility_idx" ON "Reference"("visibility");

-- Media visibility index
CREATE INDEX "Media_visibility_idx" ON "Media"("visibility");

-- Event indexes
CREATE INDEX "Event_projectId_idx" ON "Event"("projectId");
CREATE INDEX "Event_createdBy_idx" ON "Event"("createdBy");
CREATE INDEX "Event_startDate_endDate_idx" ON "Event"("startDate", "endDate");
CREATE INDEX "Event_deletedAt_idx" ON "Event"("deletedAt");
CREATE INDEX "Event_visibility_idx" ON "Event"("visibility");

-- ContentVisibility indexes (critical for performance)
CREATE UNIQUE INDEX "ContentVisibility_contentType_contentId_key" ON "ContentVisibility"("contentType", "contentId");
CREATE INDEX "ContentVisibility_visibility_idx" ON "ContentVisibility"("visibility");
CREATE INDEX "ContentVisibility_ownerId_idx" ON "ContentVisibility"("ownerId");
CREATE INDEX "ContentVisibility_contentType_contentId_idx" ON "ContentVisibility"("contentType", "contentId");

-- ContentEngagement indexes
CREATE INDEX "ContentEngagement_contentType_contentId_idx" ON "ContentEngagement"("contentType", "contentId");
CREATE INDEX "ContentEngagement_userId_idx" ON "ContentEngagement"("userId");
CREATE INDEX "ContentEngagement_engagementType_idx" ON "ContentEngagement"("engagementType");
CREATE UNIQUE INDEX "ContentEngagement_unique_engagement" ON "ContentEngagement"("contentType", "contentId", "userId", "engagementType");

-- ContentComment indexes
CREATE INDEX "ContentComment_contentType_contentId_idx" ON "ContentComment"("contentType", "contentId");
CREATE INDEX "ContentComment_userId_idx" ON "ContentComment"("userId");
CREATE INDEX "ContentComment_parentCommentId_idx" ON "ContentComment"("parentCommentId");
CREATE INDEX "ContentComment_createdAt_idx" ON "ContentComment"("createdAt");
CREATE INDEX "ContentComment_deletedAt_idx" ON "ContentComment"("deletedAt");

-- ContentAmplify indexes
CREATE INDEX "ContentAmplify_contentType_contentId_idx" ON "ContentAmplify"("contentType", "contentId");
CREATE INDEX "ContentAmplify_userId_idx" ON "ContentAmplify"("userId");
CREATE INDEX "ContentAmplify_createdAt_idx" ON "ContentAmplify"("createdAt");
CREATE UNIQUE INDEX "ContentAmplify_unique_amplify" ON "ContentAmplify"("contentType", "contentId", "userId");

-- UserConnection indexes
CREATE INDEX "UserConnection_userId_idx" ON "UserConnection"("userId");
CREATE INDEX "UserConnection_connectedUserId_idx" ON "UserConnection"("connectedUserId");
CREATE INDEX "UserConnection_connectionType_idx" ON "UserConnection"("connectionType");
CREATE UNIQUE INDEX "UserConnection_unique_connection" ON "UserConnection"("userId", "connectedUserId");

-- ============================================
-- STEP 10: Add Foreign Key Constraints
-- ============================================

-- Event foreign keys
ALTER TABLE "Event" ADD CONSTRAINT "Event_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Task event foreign key
ALTER TABLE "Task" ADD CONSTRAINT "Task_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ContentVisibility foreign keys
ALTER TABLE "ContentVisibility" ADD CONSTRAINT "ContentVisibility_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ContentEngagement foreign keys
ALTER TABLE "ContentEngagement" ADD CONSTRAINT "ContentEngagement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ContentComment foreign keys
ALTER TABLE "ContentComment" ADD CONSTRAINT "ContentComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentComment" ADD CONSTRAINT "ContentComment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "ContentComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ContentAmplify foreign keys
ALTER TABLE "ContentAmplify" ADD CONSTRAINT "ContentAmplify_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UserConnection foreign keys
ALTER TABLE "UserConnection" ADD CONSTRAINT "UserConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserConnection" ADD CONSTRAINT "UserConnection_connectedUserId_fkey" FOREIGN KEY ("connectedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- STEP 11: Populate ContentVisibility for Existing Data
-- ============================================

-- Populate ContentVisibility for all existing projects
INSERT INTO "ContentVisibility" ("id", "contentType", "contentId", "visibility", "ownerId", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    'PROJECT'::"ContentType",
    "id",
    "visibility",
    "userId",
    "createdAt",
    "updatedAt"
FROM "Project"
WHERE "deletedAt" IS NULL;

-- Populate ContentVisibility for all existing tasks
INSERT INTO "ContentVisibility" ("id", "contentType", "contentId", "visibility", "ownerId", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    'TASK'::"ContentType",
    "id",
    "visibility",
    "creatorId",
    "createdAt",
    "updatedAt"
FROM "Task";

-- Populate ContentVisibility for all existing references (neural notes)
INSERT INTO "ContentVisibility" ("id", "contentType", "contentId", "visibility", "ownerId", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    'NOTE'::"ContentType",
    "id",
    "visibility",
    "userId",
    "createdAt",
    "updatedAt"
FROM "Reference"
WHERE "deletedAt" IS NULL;

-- Populate ContentVisibility for all existing media
INSERT INTO "ContentVisibility" ("id", "contentType", "contentId", "visibility", "ownerId", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    CASE
        WHEN "type" = 'PHOTO' THEN 'PHOTO'::"ContentType"
        WHEN "type" = 'SCREENSHOT' THEN 'SCREENSHOT'::"ContentType"
        WHEN "type" = 'PDF' THEN 'PDF'::"ContentType"
        WHEN "type" = 'DOCUMENT' THEN 'PDF'::"ContentType"
    END,
    "id",
    "visibility",
    "userId",
    "createdAt",
    "updatedAt"
FROM "Media"
WHERE "deletedAt" IS NULL;

-- ============================================
-- Migration Complete
-- ============================================

-- This migration adds:
-- 1. Visibility columns to existing tables (all default to PRIVATE)
-- 2. Event entity with project relationship
-- 3. Event-task linking
-- 4. ContentVisibility tracking table
-- 5. ContentEngagement table (likes, bookmarks, views)
-- 6. ContentComment table (threaded comments)
-- 7. ContentAmplify table (repost feature)
-- 8. UserConnection table (contacts, following)
-- 9. Comprehensive indexes for performance
-- 10. Foreign key constraints for data integrity
-- 11. Initial ContentVisibility records for all existing data

-- Backward Compatibility: YES
-- - All new columns have default values (PRIVATE)
-- - All new tables are independent
-- - Existing queries will continue to work
-- - No breaking changes to existing APIs

-- Rollback: See down.sql
