-- Simple migration to add new columns without breaking existing data

-- Add new columns if they don't exist (allowing NULL for now)
ALTER TABLE "UserThemeCustomization"
ADD COLUMN IF NOT EXISTS "deviceOS" TEXT,
ADD COLUMN IF NOT EXISTS "deviceIdentifier" TEXT,
ADD COLUMN IF NOT EXISTS "deviceName" TEXT;

-- Set default values for existing rows
UPDATE "UserThemeCustomization"
SET
  "deviceOS" = COALESCE("deviceOS", 'browser'),
  "deviceIdentifier" = COALESCE("deviceIdentifier", CONCAT('legacy-', COALESCE("deviceType", 'unknown'), '-', LEFT(id, 8))),
  "deviceName" = COALESCE("deviceName", 'Legacy Device')
WHERE "deviceOS" IS NULL OR "deviceIdentifier" IS NULL;

-- Create new indexes for performance
CREATE INDEX IF NOT EXISTS "UserThemeCustomization_userId_deviceType_deviceOS_idx"
ON "UserThemeCustomization" ("userId", "deviceType", "deviceOS");

-- The isGlobal column stays for backward compatibility, we'll handle it in code