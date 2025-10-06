-- Create AvatarHistory table
CREATE TABLE IF NOT EXISTS "AvatarHistory" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  "metadata" JSONB,
  CONSTRAINT "AvatarHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "AvatarHistory_userId_idx" ON "AvatarHistory"("userId");
CREATE INDEX IF NOT EXISTS "AvatarHistory_userId_isActive_idx" ON "AvatarHistory"("userId", "isActive");
CREATE INDEX IF NOT EXISTS "AvatarHistory_deletedAt_idx" ON "AvatarHistory"("deletedAt");
