-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AnnouncementCategory" AS ENUM ('GENERAL', 'SERVICES', 'YOUTH', 'SUNDAY_SCHOOL', 'MUSIC', 'CONDOLENCES');

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "AnnouncementCategory" NOT NULL DEFAULT 'GENERAL',
    "committeeId" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishAt" TIMESTAMPTZ(3),
    "expiresAt" TIMESTAMPTZ(3),
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT,
    "venue" TEXT NOT NULL,
    "mapUrl" TEXT,
    "audience" TEXT,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "rrule" TEXT,
    "isService" BOOLEAN NOT NULL DEFAULT false,
    "showInSchedule" BOOLEAN NOT NULL DEFAULT false,
    "committeeId" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventException" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "occurrenceStart" TIMESTAMPTZ(3) NOT NULL,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "newStart" TIMESTAMPTZ(3),
    "newEnd" TIMESTAMPTZ(3),
    "note" TEXT,

    CONSTRAINT "EventException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteContent" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SiteContent_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "PrivacyNotice" (
    "version" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "publishedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedById" TEXT,

    CONSTRAINT "PrivacyNotice_pkey" PRIMARY KEY ("version")
);

-- CreateIndex
CREATE UNIQUE INDEX "Announcement_slug_key" ON "Announcement"("slug");

-- CreateIndex
CREATE INDEX "Announcement_status_publishAt_idx" ON "Announcement"("status", "publishAt");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE INDEX "Event_status_startsAt_idx" ON "Event"("status", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventException_eventId_occurrenceStart_key" ON "EventException"("eventId", "occurrenceStart");

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "Committee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "Committee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventException" ADD CONSTRAINT "EventException_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
