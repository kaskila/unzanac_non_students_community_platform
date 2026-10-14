import { z } from "zod";
import { uniqueSlug } from "@/lib/slug";
import { parseVideoUrl, youTubeThumbnail } from "@/lib/video-links";
import { VideoCategory, type ContentStatus } from "@/generated/prisma/client";
import { audit } from "@/server/audit";
import { prisma } from "@/server/db";
import { ServiceError } from "@/server/errors";
import { fields } from "@/server/forms";
import { can, type Actor } from "@/server/policy";
import { readSiteContent } from "@/server/services/site-content";
import { fetchChannelFeed, fetchOEmbed } from "@/server/youtube";

export const VIDEO_CATEGORIES = Object.values(VideoCategory);
export const VIDEO_INTENTS = ["save", "publish", "unpublish", "archive"] as const;

function assertCanManage(actor: Actor | null) {
  if (actor && !can(actor, "media.manage")) throw new ServiceError("forbidden");
}

const videoSlug = (title: string) =>
  uniqueSlug(title, async (s) => !!(await prisma.video.findUnique({ where: { slug: s } })));

export async function listVideosForAdmin() {
  return prisma.video.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 300,
    select: { id: true, title: true, status: true, source: true, thumbnailUrl: true, featured: true, importedAt: true, recordedAt: true },
  });
}

export async function getVideoForAdmin(id: string) {
  return prisma.video.findUnique({ where: { id } });
}

const addSchema = z.object({ url: fields.required(500) });

/** Paste a link: the video is created as a draft, titled from YouTube when possible. Returns its id. */
export async function addVideoFromUrl(actor: Actor, input: Record<string, string>): Promise<string> {
  assertCanManage(actor);
  const { url } = addSchema.parse(input);
  const parsed = parseVideoUrl(url);
  if (!parsed) throw new z.ZodError([{ code: "custom", path: ["url"], message: "video_url", input: url }]);

  const existing = await prisma.video.findUnique({
    where: { source_externalId: { source: parsed.source, externalId: parsed.externalId } },
  });
  if (existing) throw new z.ZodError([{ code: "custom", path: ["url"], message: "video_exists", input: url }]);

  const oembed = parsed.source === "YOUTUBE" ? await fetchOEmbed(parsed.kind, parsed.externalId) : null;
  const title = oembed?.title ?? (parsed.source === "FACEBOOK" ? "Facebook video" : "YouTube video");
  const video = await prisma.video.create({
    data: {
      ...parsed,
      slug: await videoSlug(title),
      title,
      thumbnailUrl: parsed.source === "YOUTUBE" && parsed.kind !== "PLAYLIST" ? youTubeThumbnail(parsed.externalId) : null,
    },
  });
  await audit({ actorId: actor.id, action: "video.create", entityType: "video", entityId: video.id, meta: { source: parsed.source } });
  return video.id;
}

export const videoSchema = z.object({
  title: fields.required(200),
  description: fields.optional(2000),
  category: z.enum(VideoCategory, "invalid"),
  recordedAt: fields.optionalDateTime,
  featured: fields.checkbox,
  eventId: fields.optional(40),
  committeeId: fields.optional(40),
  intent: z.enum(VIDEO_INTENTS).default("save"),
});

function nextStatus(current: ContentStatus, intent: (typeof VIDEO_INTENTS)[number]): ContentStatus {
  if (intent === "publish") return "PUBLISHED";
  if (intent === "unpublish") return "DRAFT";
  if (intent === "archive") return "ARCHIVED";
  return current;
}

export async function updateVideo(actor: Actor, id: string, input: Record<string, string>) {
  assertCanManage(actor);
  const { intent, ...data } = videoSchema.parse(input);
  const existing = await prisma.video.findUnique({ where: { id } });
  if (!existing) throw new ServiceError("not_found");
  const status = nextStatus(existing.status, intent);
  const featured = data.featured && status === "PUBLISHED";

  await prisma.$transaction([
    // Only one featured video at a time.
    ...(featured ? [prisma.video.updateMany({ where: { featured: true, id: { not: id } }, data: { featured: false } })] : []),
    prisma.video.update({ where: { id }, data: { ...data, featured, status } }),
  ]);
  await audit({ actorId: actor.id, action: `video.${intent === "save" ? "update" : intent}`, entityType: "video", entityId: id });
}

/**
 * Import new uploads from the congregation's YouTube channel as drafts (docs/PLAN.md §3.1).
 * `actor` is null when the daily cron runs it. Returns how many videos were added.
 */
export async function importChannelUploads(actor: Actor | null): Promise<number> {
  assertCanManage(actor);
  const { social } = await readSiteContent();
  if (!social.youtubeChannelId) throw new ServiceError("no_channel_id");

  let entries;
  try {
    entries = await fetchChannelFeed(social.youtubeChannelId);
  } catch {
    throw new ServiceError("feed_unavailable");
  }
  const known = await prisma.video.findMany({
    where: { source: "YOUTUBE", externalId: { in: entries.map((e) => e.videoId) } },
    select: { externalId: true },
  });
  const knownIds = new Set(known.map((v) => v.externalId));

  let added = 0;
  for (const entry of entries.filter((e) => !knownIds.has(e.videoId))) {
    await prisma.video.create({
      data: {
        source: "YOUTUBE",
        kind: "VIDEO",
        externalId: entry.videoId,
        slug: await videoSlug(entry.title),
        title: entry.title,
        description: entry.description || null,
        thumbnailUrl: youTubeThumbnail(entry.videoId),
        recordedAt: entry.publishedAt,
        importedAt: new Date(),
      },
    });
    added++;
  }
  await audit({ actorId: actor?.id ?? null, action: "video.import", entityType: "video", meta: { added } });
  return added;
}
