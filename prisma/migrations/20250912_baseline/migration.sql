-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."Category" AS ENUM ('DOCUMENTATION', 'SNIPPET', 'CONFIGURATION', 'TOOLS', 'API', 'TUTORIAL', 'REFERENCE');

-- CreateEnum
CREATE TYPE "public"."MediaType" AS ENUM ('photo', 'screenshot', 'pdf');

-- CreateEnum
CREATE TYPE "public"."Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."Status" AS ENUM ('ACTIVE', 'COMPLETED', 'DELETED');

-- CreateTable
CREATE TABLE "public"."Media" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "public"."MediaType" NOT NULL,
    "name" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "metadata" JSONB,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Reference" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "url" TEXT,
    "category" "public"."Category" NOT NULL DEFAULT 'DOCUMENTATION',
    "priority" "public"."Priority" NOT NULL DEFAULT 'MEDIUM',
    "tags" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Task" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "priority" "public"."Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "public"."Status" NOT NULL DEFAULT 'ACTIVE',
    "completedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Media_createdAt_idx" ON "public"."Media"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "Media_projectId_type_idx" ON "public"."Media"("projectId" ASC, "type" ASC);

-- CreateIndex
CREATE INDEX "Media_type_idx" ON "public"."Media"("type" ASC);

-- CreateIndex
CREATE INDEX "Project_createdAt_idx" ON "public"."Project"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "Project_name_idx" ON "public"."Project"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Project_name_key" ON "public"."Project"("name" ASC);

-- CreateIndex
CREATE INDEX "Reference_category_idx" ON "public"."Reference"("category" ASC);

-- CreateIndex
CREATE INDEX "Reference_projectId_category_idx" ON "public"."Reference"("projectId" ASC, "category" ASC);

-- CreateIndex
CREATE INDEX "Reference_tags_idx" ON "public"."Reference"("tags" ASC);

-- CreateIndex
CREATE INDEX "Task_createdAt_idx" ON "public"."Task"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "Task_priority_idx" ON "public"."Task"("priority" ASC);

-- CreateIndex
CREATE INDEX "Task_projectId_status_idx" ON "public"."Task"("projectId" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "public"."Task"("status" ASC);

-- AddForeignKey
ALTER TABLE "public"."Media" ADD CONSTRAINT "Media_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reference" ADD CONSTRAINT "Reference_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

