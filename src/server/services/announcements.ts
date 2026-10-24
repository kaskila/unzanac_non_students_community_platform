import { z } from "zod";
import { uniqueSlug } from "@/lib/slug";
import { AnnouncementCategory, type ContentStatus } from "@/generated/prisma/client";
import { audit } from "@/server/audit";
import { prisma } from "@/server/db";
import { ServiceError } from "@/server/errors";
import { fields } from "@/server/forms";
import { can, type Actor } from "@/server/policy";

export const ANNOUNCEMENT_CATEGORIES = Object.values(AnnouncementCategory);
export const ANNOUNCEMENT_INTENTS = ["save", "publish", "unpublish", "archive"] as const;
export type AnnouncementIntent = (typeof ANNOUNCEMENT_INTENTS)[number];

function assertCanManage(actor: Actor) {
  if (!can(actor, "content.manage")) throw new ServiceError("forbidden");
}

export const announcementSchema = z
  .object({
    title: fields.required(120),
    body: fields.required(5000),
    category: z.enum(AnnouncementCategory, "invalid"),
    committeeId: fields.optional(40),
    pinned: fields.checkbox,
    publishAt: fields.optionalDateTime,
    expiresAt: fields.optionalDateTime,
    intent: z.enum(ANNOUNCEMENT_INTENTS).default("save"),
  })
  .superRefine((v, ctx) => {
    if (v.expiresAt && v.expiresAt <= (v.publishAt ?? new Date())) {
      ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "expiry_before_publish" });
    }
  });

/** Display state, derived from status and dates. */
export type AnnouncementState = "draft" | "scheduled" | "live" | "expired" | "archived";

export function announcementState(
  a: { status: ContentStatus; publishAt: Date | null; expiresAt: Date | null },
  now = new Date(),
): AnnouncementState {
  if (a.status === "ARCHIVED") return "archived";
  if (a.status === "DRAFT") return "draft";
  if (a.publishAt && a.publishAt > now) return "scheduled";
  if (a.expiresAt && a.expiresAt <= now) return "expired";
  return "live";
}

export async function listAnnouncementsForAdmin() {
  return prisma.announcement.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 200,
    select: { id: true, slug: true, title: true, status: true, pinned: true, publishAt: true, expiresAt: true, updatedAt: true },
  });
}

export async function getAnnouncementForAdmin(id: string) {
  return prisma.announcement.findUnique({ where: { id } });
}

function nextStatus(current: ContentStatus | null, intent: AnnouncementIntent): ContentStatus {
  switch (intent) {
    case "publish":
      return "PUBLISHED";
    case "unpublish":
      return "DRAFT";
    case "archive":
      return "ARCHIVED";
    default:
      return current ?? "DRAFT";
  }
}

const AUDIT_ACTION: Record<AnnouncementIntent, string> = {
  save: "announcement.update",
  publish: "announcement.publish",
  unpublish: "announcement.unpublish",
  archive: "announcement.archive",
};

export async function saveAnnouncement(actor: Actor, id: string | null, input: Record<string, string>) {
  assertCanManage(actor);
  const { intent, ...data } = announcementSchema.parse(input);
  const existing = id ? await prisma.announcement.findUnique({ where: { id } }) : null;
  if (id && !existing) throw new ServiceError("not_found");

  const status = nextStatus(existing?.status ?? null, intent);
  // Publishing without a date means "now"; an explicit future date schedules it.
  const publishAt = status === "PUBLISHED" ? (data.publishAt ?? new Date()) : data.publishAt;
  const values = { ...data, publishAt, status };

  if (existing) {
    const updated = await prisma.announcement.update({ where: { id: existing.id }, data: values });
    await audit({ actorId: actor.id, action: AUDIT_ACTION[intent], entityType: "announcement", entityId: updated.id });
    return updated;
  }

  const slug = await uniqueSlug(data.title, async (s) => !!(await prisma.announcement.findUnique({ where: { slug: s } })));
  const created = await prisma.announcement.create({ data: { ...values, slug, authorId: actor.id } });
  await audit({
    actorId: actor.id,
    action: status === "PUBLISHED" ? "announcement.publish" : "announcement.create",
    entityType: "announcement",
    entityId: created.id,
    meta: { slug },
  });
  return created;
}
