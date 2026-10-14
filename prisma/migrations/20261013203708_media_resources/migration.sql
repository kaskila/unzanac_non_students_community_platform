-- CreateEnum
CREATE TYPE "VideoSource" AS ENUM ('YOUTUBE', 'FACEBOOK');

-- CreateEnum
CREATE TYPE "VideoKind" AS ENUM ('VIDEO', 'LIVE', 'PLAYLIST');

-- CreateEnum
CREATE TYPE "VideoCategory" AS ENUM ('DIVINE_SERVICES', 'CHOIR_MUSIC', 'YOUTH', 'SPECIAL_EVENTS', 'TEACHING');

-- CreateEnum
CREATE TYPE "MaterialCategory" AS ENUM ('DIVINE_SERVICE_HYMNS', 'SUNDAY_SCHOOL', 'CONFIRMATION', 'YOUTH', 'CHOIR_MUSIC', 'NOTICES_FORMS');

-- CreateEnum
CREATE TYPE "MaterialVisibility" AS ENUM ('PUBLIC', 'UNLISTED');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "livestreamUrl" TEXT;

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "source" "VideoSource" NOT NULL DEFAULT 'YOUTUBE',
    "externalId" TEXT NOT NULL,
    "kind" "VideoKind" NOT NULL DEFAULT 'VIDEO',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "VideoCategory" NOT NULL DEFAULT 'CHOIR_MUSIC',
    "thumbnailUrl" TEXT,
    "recordedAt" TIMESTAMPTZ(3),
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "eventId" TEXT,
    "committeeId" TEXT,
    "importedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "MaterialCategory" NOT NULL,
    "committeeId" TEXT,
    "visibility" "MaterialVisibility" NOT NULL DEFAULT 'PUBLIC',
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "currentFileId" TEXT,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMPTZ(3),
    "deletedAt" TIMESTAMPTZ(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialFile" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purgedAt" TIMESTAMPTZ(3),

    CONSTRAINT "MaterialFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingUpload" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingUpload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Video_slug_key" ON "Video"("slug");

-- CreateIndex
CREATE INDEX "Video_status_recordedAt_idx" ON "Video"("status", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Video_source_externalId_key" ON "Video"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Material_slug_key" ON "Material"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Material_currentFileId_key" ON "Material"("currentFileId");

-- CreateIndex
CREATE INDEX "Material_status_category_idx" ON "Material"("status", "category");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialFile_storageKey_key" ON "MaterialFile"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "PendingUpload_storageKey_key" ON "PendingUpload"("storageKey");

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "Committee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "Committee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_currentFileId_fkey" FOREIGN KEY ("currentFileId") REFERENCES "MaterialFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialFile" ADD CONSTRAINT "MaterialFile_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;
