-- DropForeignKey
ALTER TABLE "public"."AuthMethod" DROP CONSTRAINT "AuthMethod_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MagicLink" DROP CONSTRAINT "MagicLink_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Connection" DROP CONSTRAINT "Connection_fromUserId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Connection" DROP CONSTRAINT "Connection_toUserId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Project" DROP CONSTRAINT "Project_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProjectMember" DROP CONSTRAINT "ProjectMember_projectId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProjectMember" DROP CONSTRAINT "ProjectMember_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProjectInvite" DROP CONSTRAINT "ProjectInvite_projectId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProjectInvite" DROP CONSTRAINT "ProjectInvite_senderId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProjectInvite" DROP CONSTRAINT "ProjectInvite_recipientId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Activity" DROP CONSTRAINT "Activity_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Activity" DROP CONSTRAINT "Activity_projectId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Media" DROP CONSTRAINT "Media_uploadedBy_fkey";

-- DropIndex
DROP INDEX "public"."Project_ownerId_idx";

-- DropIndex
DROP INDEX "public"."Project_visibility_idx";

-- DropIndex
DROP INDEX "public"."Project_name_ownerId_key";

-- DropIndex
DROP INDEX "public"."Media_projectId_idx";

-- DropIndex
DROP INDEX "public"."Media_uploadedBy_idx";

-- AlterTable
ALTER TABLE "public"."Project" DROP COLUMN "ownerId",
DROP COLUMN "settings",
DROP COLUMN "visibility";

-- AlterTable
ALTER TABLE "public"."Media" ALTER COLUMN "metadata" DROP NOT NULL;

-- DropTable
DROP TABLE "public"."User";

-- DropTable
DROP TABLE "public"."AuthMethod";

-- DropTable
DROP TABLE "public"."MagicLink";

-- DropTable
DROP TABLE "public"."Session";

-- DropTable
DROP TABLE "public"."Connection";

-- DropTable
DROP TABLE "public"."ProjectMember";

-- DropTable
DROP TABLE "public"."ProjectInvite";

-- DropTable
DROP TABLE "public"."Notification";

-- DropTable
DROP TABLE "public"."Activity";

-- DropEnum
DROP TYPE "public"."AuthProvider";

-- DropEnum
DROP TYPE "public"."ConnectionStatus";

-- DropEnum
DROP TYPE "public"."ProjectVisibility";

-- DropEnum
DROP TYPE "public"."ProjectRole";

-- DropEnum
DROP TYPE "public"."InviteStatus";

-- DropEnum
DROP TYPE "public"."NotificationType";

-- DropEnum
DROP TYPE "public"."ActivityType";

-- CreateIndex
CREATE INDEX "Project_name_idx" ON "public"."Project"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Project_name_key" ON "public"."Project"("name" ASC);

-- CreateIndex
CREATE INDEX "Media_projectId_type_idx" ON "public"."Media"("projectId" ASC, "type" ASC);

