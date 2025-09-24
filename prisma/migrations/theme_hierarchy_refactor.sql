-- Theme Hierarchy Refactor Migration
-- This creates a new global theme table and cleans up the customization table

-- Step 1: Create UserThemeGlobal table
CREATE TABLE IF NOT EXISTS "UserThemeGlobal" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "themeId" TEXT NOT NULL,
  "customColors" JSONB NOT NULL DEFAULT '{}',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserThemeGlobal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserThemeGlobal_userId_key" UNIQUE ("userId")
);

-- Step 2: Add foreign key constraints
ALTER TABLE "UserThemeGlobal" ADD CONSTRAINT "UserThemeGlobal_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserThemeGlobal" ADD CONSTRAINT "UserThemeGlobal_themeId_fkey"
  FOREIGN KEY ("themeId") REFERENCES "ThemeTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS "UserThemeGlobal_userId_idx" ON "UserThemeGlobal"("userId");
CREATE INDEX IF NOT EXISTS "UserThemeGlobal_themeId_idx" ON "UserThemeGlobal"("themeId");

-- Step 4: Clear existing UserThemeCustomization data (as requested)
TRUNCATE TABLE "UserThemeCustomization";

-- Step 5: Drop old columns and constraints if they exist
ALTER TABLE "UserThemeCustomization"
DROP COLUMN IF EXISTS "isActive",
DROP COLUMN IF EXISTS "isGlobal";

-- Step 6: Make device fields required (remove NULL)
UPDATE "UserThemeCustomization" SET
  "deviceType" = 'desktop' WHERE "deviceType" IS NULL;
UPDATE "UserThemeCustomization" SET
  "deviceOS" = 'browser' WHERE "deviceOS" IS NULL;
UPDATE "UserThemeCustomization" SET
  "deviceIdentifier" = 'legacy-device' WHERE "deviceIdentifier" IS NULL;
UPDATE "UserThemeCustomization" SET
  "deviceName" = 'Unknown Device' WHERE "deviceName" IS NULL;

-- Step 7: Alter columns to NOT NULL
ALTER TABLE "UserThemeCustomization"
ALTER COLUMN "deviceType" SET NOT NULL,
ALTER COLUMN "deviceOS" SET NOT NULL,
ALTER COLUMN "deviceIdentifier" SET NOT NULL,
ALTER COLUMN "deviceName" SET NOT NULL;

-- Step 8: Drop old unique constraint and create new one
ALTER TABLE "UserThemeCustomization"
DROP CONSTRAINT IF EXISTS "UserThemeCustomization_userId_themeId_deviceType_key";

ALTER TABLE "UserThemeCustomization"
ADD CONSTRAINT "UserThemeCustomization_userId_deviceIdentifier_key"
UNIQUE ("userId", "deviceIdentifier");

-- Step 9: Create default global themes for existing users (using default theme)
INSERT INTO "UserThemeGlobal" ("id", "userId", "themeId", "customColors", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  u."id",
  COALESCE(
    (SELECT "id" FROM "ThemeTemplate" WHERE "isDefault" = true LIMIT 1),
    (SELECT "id" FROM "ThemeTemplate" ORDER BY "name" ASC LIMIT 1)
  ),
  '{}',
  NOW(),
  NOW()
FROM "User" u
WHERE NOT EXISTS (
  SELECT 1 FROM "UserThemeGlobal" WHERE "userId" = u."id"
);