-- CreateEnum
CREATE TYPE "UploadKind" AS ENUM ('MATERIAL', 'HERO');

-- AlterTable
ALTER TABLE "PendingUpload" ADD COLUMN     "kind" "UploadKind" NOT NULL DEFAULT 'MATERIAL';

-- CreateTable
CREATE TABLE "HeroSlide" (
    "id" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "HeroSlide_pkey" PRIMARY KEY ("id")
);
