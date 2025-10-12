-- Rollback for Phase S1: Social Platform Foundation
-- This script safely removes all changes from the up migration

-- ============================================
-- STEP 1: Drop Foreign Key Constraints
-- ============================================

ALTER TABLE "UserConnection" DROP CONSTRAINT IF EXISTS "UserConnection_connectedUserId_fkey";
ALTER TABLE "UserConnection" DROP CONSTRAINT IF EXISTS "UserConnection_userId_fkey";
ALTER TABLE "ContentAmplify" DROP CONSTRAINT IF EXISTS "ContentAmplify_userId_fkey";
ALTER TABLE "ContentComment" DROP CONSTRAINT IF EXISTS "ContentComment_parentCommentId_fkey";
ALTER TABLE "ContentComment" DROP CONSTRAINT IF EXISTS "ContentComment_userId_fkey";
ALTER TABLE "ContentEngagement" DROP CONSTRAINT IF EXISTS "ContentEngagement_userId_fkey";
ALTER TABLE "ContentVisibility" DROP CONSTRAINT IF EXISTS "ContentVisibility_ownerId_fkey";
ALTER TABLE "Task" DROP CONSTRAINT IF EXISTS "Task_eventId_fkey";
ALTER TABLE "Event" DROP CONSTRAINT IF EXISTS "Event_createdBy_fkey";
ALTER TABLE "Event" DROP CONSTRAINT IF EXISTS "Event_projectId_fkey";

-- ============================================
-- STEP 2: Drop Tables (in reverse dependency order)
-- ============================================

DROP TABLE IF EXISTS "UserConnection";
DROP TABLE IF EXISTS "ContentAmplify";
DROP TABLE IF EXISTS "ContentComment";
DROP TABLE IF EXISTS "ContentEngagement";
DROP TABLE IF EXISTS "ContentVisibility";
DROP TABLE IF EXISTS "Event";

-- ============================================
-- STEP 3: Remove Columns from Existing Tables
-- ============================================

ALTER TABLE "Task" DROP COLUMN IF EXISTS "eventId";
ALTER TABLE "Media" DROP COLUMN IF EXISTS "visibility";
ALTER TABLE "Reference" DROP COLUMN IF EXISTS "visibility";
ALTER TABLE "Task" DROP COLUMN IF EXISTS "visibility";
ALTER TABLE "Project" DROP COLUMN IF EXISTS "visibility";

-- ============================================
-- STEP 4: Drop Enums
-- ============================================

DROP TYPE IF EXISTS "ConnectionType";
DROP TYPE IF EXISTS "EngagementType";
DROP TYPE IF EXISTS "ContentType";
DROP TYPE IF EXISTS "Visibility";

-- ============================================
-- Rollback Complete
-- ============================================

-- All social platform foundation changes have been reverted
-- The database is back to its pre-Phase-S1 state
