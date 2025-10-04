-- Add priority column to Project table with default NEBULA
-- This migration adds project-level priorities

-- Add priority column to Project table
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "priority" "Priority" DEFAULT 'NEBULA';

-- Create index on priority for filtering
CREATE INDEX IF NOT EXISTS "Project_priority_idx" ON "Project"("priority");

-- Update existing projects to have NEBULA priority (default)
UPDATE "Project" SET "priority" = 'NEBULA' WHERE "priority" IS NULL;
