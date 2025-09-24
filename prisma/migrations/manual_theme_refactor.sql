-- Manual migration to refactor UserThemeCustomization table
-- This preserves existing data while adding new columns

-- Step 1: Add new columns (allowing NULL temporarily)
ALTER TABLE "UserThemeCustomization"
ADD COLUMN IF NOT EXISTS "deviceOS" TEXT,
ADD COLUMN IF NOT EXISTS "deviceIdentifier" TEXT,
ADD COLUMN IF NOT EXISTS "deviceName" TEXT;

-- Step 2: Update existing rows with default values based on current deviceType
UPDATE "UserThemeCustomization"
SET
  "deviceOS" = CASE
    WHEN "deviceType" = 'mobile' THEN 'ios'
    WHEN "deviceType" = 'tablet' THEN 'ios'
    WHEN "deviceType" = 'web' THEN 'browser'
    WHEN "deviceType" IS NULL AND "isGlobal" = true THEN 'browser'
    ELSE 'browser'
  END,
  "deviceIdentifier" = CASE
    WHEN "deviceType" IS NULL AND "isGlobal" = true THEN 'global-default'
    ELSE CONCAT('legacy-', COALESCE("deviceType", 'unknown'), '-', id)
  END,
  "deviceName" = CASE
    WHEN "deviceType" = 'mobile' THEN 'Mobile Device'
    WHEN "deviceType" = 'tablet' THEN 'Tablet Device'
    WHEN "deviceType" = 'web' THEN 'Web Browser'
    WHEN "deviceType" IS NULL AND "isGlobal" = true THEN 'All Devices (Legacy)'
    ELSE 'Unknown Device'
  END
WHERE "deviceOS" IS NULL;

-- Step 3: Make deviceType required (set default for NULL values first)
UPDATE "UserThemeCustomization"
SET "deviceType" = 'desktop'
WHERE "deviceType" IS NULL;

-- Step 4: Make the new columns required
ALTER TABLE "UserThemeCustomization"
ALTER COLUMN "deviceType" SET NOT NULL,
ALTER COLUMN "deviceOS" SET NOT NULL;

-- Step 5: Drop the old unique constraint
ALTER TABLE "UserThemeCustomization"
DROP CONSTRAINT IF EXISTS "UserThemeCustomization_userId_themeId_deviceType_key";

-- Step 6: Add new unique constraint
ALTER TABLE "UserThemeCustomization"
ADD CONSTRAINT "UserThemeCustomization_userId_deviceType_deviceOS_deviceIdentifier_key"
UNIQUE ("userId", "deviceType", "deviceOS", "deviceIdentifier");

-- Step 7: Add new indexes
CREATE INDEX IF NOT EXISTS "UserThemeCustomization_userId_deviceType_deviceOS_idx"
ON "UserThemeCustomization" ("userId", "deviceType", "deviceOS");

-- Step 8: Drop the isGlobal column as it's no longer needed
-- (We'll handle global application by creating entries for all devices)
ALTER TABLE "UserThemeCustomization"
DROP COLUMN IF EXISTS "isGlobal";

-- Step 9: For users with global themes, create entries for other common devices
-- This ensures when they access from a new device type, they get the theme
INSERT INTO "UserThemeCustomization"
  ("id", "userId", "themeId", "customColors", "isActive", "deviceType", "deviceOS", "deviceIdentifier", "deviceName", "metadata", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  u."userId",
  u."themeId",
  u."customColors",
  u."isActive",
  'mobile',
  'android',
  'default-android',
  'Android Device',
  u."metadata",
  NOW(),
  NOW()
FROM "UserThemeCustomization" u
WHERE u."deviceIdentifier" = 'global-default'
  AND NOT EXISTS (
    SELECT 1 FROM "UserThemeCustomization"
    WHERE "userId" = u."userId"
      AND "themeId" = u."themeId"
      AND "deviceType" = 'mobile'
      AND "deviceOS" = 'android'
  );

-- Create iOS entries for global themes
INSERT INTO "UserThemeCustomization"
  ("id", "userId", "themeId", "customColors", "isActive", "deviceType", "deviceOS", "deviceIdentifier", "deviceName", "metadata", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  u."userId",
  u."themeId",
  u."customColors",
  u."isActive",
  'mobile',
  'ios',
  'default-ios',
  'iOS Device',
  u."metadata",
  NOW(),
  NOW()
FROM "UserThemeCustomization" u
WHERE u."deviceIdentifier" = 'global-default'
  AND NOT EXISTS (
    SELECT 1 FROM "UserThemeCustomization"
    WHERE "userId" = u."userId"
      AND "themeId" = u."themeId"
      AND "deviceType" = 'mobile'
      AND "deviceOS" = 'ios'
  );