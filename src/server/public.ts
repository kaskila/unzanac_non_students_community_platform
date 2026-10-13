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
