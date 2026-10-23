// Cached reads for the public site (docs/PLAN.md §6). Every function is `use cache` with the
// "public" profile (5 minutes, next.config.ts) and a tag from cache-tags.ts, so most visits never
// reach the database and admin changes appear at once (updateTag in the admin actions).
// Only published, public content is returned here; admin screens read through the services instead.

import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { toWallClock } from "@/lib/dates";
import { expandOccurrences, parseRRule, type Occurrence } from "@/lib/recurrence";
import { TAGS } from "@/server/cache-tags";
import { prisma } from "@/server/db";
import { latestPrivacyNotice, readSiteContent } from "@/server/services/site-content";

const DAY_MS = 86_400_000;

export async function getSiteContent() {
  "use cache";
  cacheLife("public");
  cacheTag(TAGS.site);
  return readSiteContent();
}

export async function getPrivacyNotice() {
  "use cache";
  cacheLife("public");
  cacheTag(TAGS.privacy);
  return latestPrivacyNotice();
}

// ── Committees ──

const committeeSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  meetingInfo: true,
  contactName: true,
  contactPhone: true,
} as const;

export async function getPublicCommittees() {
  "use cache";
  cacheLife("public");
  cacheTag(TAGS.committees);
  return prisma.committee.findMany({
    where: { isPublic: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: committeeSelect,
  });
}

export async function getPublicCommittee(slug: string) {
  "use cache";
  cacheLife("public");
  cacheTag(TAGS.committees);
  return prisma.committee.findFirst({ where: { slug, isPublic: true }, select: committeeSelect });
}

// ── Announcements ──

function liveAnnouncementWhere(now: Date) {
  return {
    status: "PUBLISHED" as const,
    publishAt: { lte: now },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };
}

const announcementSelect = {
  slug: true,
  title: true,
  body: true,
  category: true,
  pinned: true,
  publishAt: true,
  committee: { select: { slug: true, name: true, isPublic: true } },
} as const;

/** Live announcements: pinned first, then newest. */
export async function getLiveAnnouncements(limit = 50) {
  "use cache";
  cacheLife("public");
  cacheTag(TAGS.announcements);
  return prisma.announcement.findMany({
    where: liveAnnouncementWhere(new Date()),
    orderBy: [{ pinned: "desc" }, { publishAt: "desc" }],
    take: limit,
    select: announcementSelect,
  });
}

export async function getLiveAnnouncement(slug: string) {
  "use cache";
  cacheLife("public");
  cacheTag(TAGS.announcements);
  return prisma.announcement.findFirst({ where: { slug, ...liveAnnouncementWhere(new Date()) }, select: announcementSelect });
}

// ── Events ──

const eventSelect = {
  id: true,
  slug: true,
  title: true,
  details: true,
  venue: true,
  mapUrl: true,
  audience: true,
  startsAt: true,
  endsAt: true,
  rrule: true,
  isService: true,
  showInSchedule: true,
  livestreamUrl: true,
  updatedAt: true,
  committee: { select: { slug: true, name: true, isPublic: true } },
  exceptions: { select: { occurrenceStart: true, cancelled: true, newStart: true, newEnd: true, note: true } },
} as const;

async function publishedEvents() {
  return prisma.event.findMany({ where: { status: "PUBLISHED" }, select: eventSelect });
}

type PublicEvent = Awaited<ReturnType<typeof publishedEvents>>[number];
export type DatedEvent = { event: Omit<PublicEvent, "exceptions">; occurrence: Occurrence };

function upcoming(events: PublicEvent[], from: Date, to: Date, perEvent: number): DatedEvent[] {
  return events
    .flatMap(({ exceptions, ...event }) =>
      expandOccurrences(event, exceptions, from, to, perEvent).map((occurrence) => ({ event, occurrence })),
    )
    .sort((a, b) => a.occurrence.start.getTime() - b.occurrence.start.getTime());
}

/** Upcoming dates of all published events in the next `days` days (cancelled ones flagged). */
export async function getUpcomingEvents(days = 60, limit = 100) {
  "use cache";
  cacheLife("public");
  cacheTag(TAGS.events);
  const now = new Date();
  return upcoming(await publishedEvents(), now, new Date(now.getTime() + days * DAY_MS), 20).slice(0, limit);
}

/** The next divine service that isn't cancelled (it may be in progress). */
export async function getNextService() {
  "use cache";
  cacheLife("public");
  cacheTag(TAGS.events);
  const now = new Date();
  const services = (await publishedEvents()).filter((e) => e.isService);
  return upcoming(services, now, new Date(now.getTime() + 62 * DAY_MS), 5).find((d) => !d.occurrence.cancelled) ?? null;
}

/** Recurring events marked "show in regular schedule", in weekday/time order. */
export async function getRegularSchedule() {
  "use cache";
  cacheLife("public");
  cacheTag(TAGS.events);
  const now = new Date();
  const events = (await publishedEvents()).filter((e) => e.showInSchedule && parseRRule(e.rrule));
  return events
    .filter((e) => {
      const until = parseRRule(e.rrule)?.until;
      return !until || until > now;
    })
    .map(({ exceptions: _e, ...event }) => {
      void _e;
      return event;
    })
    .sort((a, b) => {
      const key = (date: Date) => {
        const d = toWallClock(date); // Lusaka weekday and time
        return (d.getUTCDay() * 24 + d.getUTCHours()) * 60 + d.getUTCMinutes();
      };
      return key(a.startsAt) - key(b.startsAt);
    });
}

export async function getPublicEvent(slug: string) {
  "use cache";
  cacheLife("public");
  cacheTag(TAGS.events);
  const event = await prisma.event.findFirst({ where: { slug, status: "PUBLISHED" }, select: eventSelect });
  if (!event) return null;
  const now = new Date();
  const { exceptions, ...rest } = event;
  return {
    event: rest,
    exceptions,
    upcoming: expandOccurrences(rest, exceptions, now, new Date(now.getTime() + 120 * DAY_MS), 8),
  };
}

/** Published events with a livestream link that are running right now (for the "Live now" banner). */
export async function getLiveNow() {
  "use cache";
  cacheLife("public");
  cacheTag(TAGS.events);
  const now = new Date();
  const events = (await publishedEvents()).filter((e) => e.livestreamUrl);
  return upcoming(events, now, new Date(now.getTime() + 1), 1).filter((d) => !d.occurrence.cancelled && d.occurrence.start <= now);
}

// ── Videos ──

const videoSelect = {
  slug: true,
  source: true,
  kind: true,
  externalId: true,
  title: true,
  description: true,
  category: true,
  thumbnailUrl: true,
  recordedAt: true,
  featured: true,
  createdAt: true,
} as const;

export async function getPublishedVideos() {
  "use cache";
  cacheLife("public");
  cacheTag(TAGS.videos);
  return prisma.video.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ recordedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: 200,
    select: videoSelect,
  });
}

/** The featured video, or else the newest one. */
export async function getHomeVideo() {
  "use cache";
  cacheLife("public");
  cacheTag(TAGS.videos);
  return prisma.video.findFirst({
    where: { status: "PUBLISHED" },
    orderBy: [{ featured: "desc" }, { recordedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    select: videoSelect,
  });
}

export async function getPublicVideo(slug: string) {
  "use cache";
  cacheLife("public");
  cacheTag(TAGS.videos);
  return prisma.video.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: { ...videoSelect, committee: { select: { slug: true, name: true, isPublic: true } } },
  });
}

// ── Resources ──

function availableMaterialWhere(now: Date) {
  return {
    status: "PUBLISHED" as const,
    deletedAt: null,
    currentFileId: { not: null },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };
}

const materialSelect = {
  slug: true,
  title: true,
  description: true,
  category: true,
  visibility: true,
  updatedAt: true,
  committee: { select: { slug: true, name: true, isPublic: true } },
  currentFile: { select: { mimeType: true, sizeBytes: true, uploadedAt: true } },
} as const;

/** Listed resources: public ones only (unlisted ones are reachable by link alone). */
export async function getPublicMaterials() {
  "use cache";
  cacheLife("public");
  cacheTag(TAGS.materials);
  return prisma.material.findMany({
    where: { ...availableMaterialWhere(new Date()), visibility: "PUBLIC" },
    orderBy: { updatedAt: "desc" },
    take: 300,
    select: materialSelect,
  });
}

export async function getPublicMaterial(slug: string) {
  "use cache";
  cacheLife("public");
  cacheTag(TAGS.materials);
  return prisma.material.findFirst({ where: { slug, ...availableMaterialWhere(new Date()) }, select: materialSelect });
}

// ── Home page photos ──

export async function getHeroSlides() {
  "use cache";
  cacheLife("public");
  cacheTag(TAGS.hero);
  const slides = await prisma.heroSlide.findMany({
    where: { active: true, version: { not: null } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    take: 8,
    select: { id: true, alt: true, version: true },
  });
  return slides.map((s) => ({ id: s.id, alt: s.alt, version: s.version! }));
}

/** Slugs to prerender at build time (generateStaticParams). */
export async function getPublishedSlugs(kind: "announcements" | "events" | "committees") {
  "use cache";
  cacheLife("public");
  cacheTag(TAGS[kind]);
  const now = new Date();
  const rows =
    kind === "announcements"
      ? await prisma.announcement.findMany({ where: liveAnnouncementWhere(now), select: { slug: true }, take: 50 })
      : kind === "events"
        ? await prisma.event.findMany({ where: { status: "PUBLISHED" }, select: { slug: true }, take: 50 })
        : await prisma.committee.findMany({ where: { isPublic: true }, select: { slug: true } });
  return rows.map((r) => r.slug);
}
