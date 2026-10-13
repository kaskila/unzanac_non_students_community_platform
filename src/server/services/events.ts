import { z } from "zod";
import { parseLocalDateTime } from "@/lib/dates";
import { buildRRule, isOccurrence, RECURRENCE_CHOICES } from "@/lib/recurrence";
import { uniqueSlug } from "@/lib/slug";
import type { ContentStatus } from "@/generated/prisma/client";
import { audit } from "@/server/audit";
import { prisma } from "@/server/db";
import { ServiceError } from "@/server/errors";
import { fields } from "@/server/forms";
import { can, type Actor } from "@/server/policy";

export const EVENT_INTENTS = ["save", "publish", "unpublish", "archive"] as const;
export type EventIntent = (typeof EVENT_INTENTS)[number];
const MAX_DURATION_MS = 7 * 86_400_000;

function assertCanManage(actor: Actor) {
  if (!can(actor, "content.manage")) throw new ServiceError("forbidden");
}

/** "YYYY-MM-DD" (Lusaka) → the last minute of that day, for UNTIL. */
const untilDate = z
  .string()
  .optional()
  .transform((v, ctx) => {
    if (!v?.trim()) return null;
    const end = parseLocalDateTime(`${v.trim()}T23:59`);
    if (!end) ctx.addIssue({ code: "custom", message: "invalid_date" });
    return end;
  });

export const eventSchema = z
  .object({
    title: fields.required(120),
    details: fields.optional(5000),
    venue: fields.required(150),
    mapUrl: fields.optionalHttpsUrl,
    audience: fields.optional(60),
    startsAt: fields.dateTime,
    endsAt: fields.dateTime,
    recurrence: z.enum(RECURRENCE_CHOICES, "invalid").default("none"),
    until: untilDate,
    isService: fields.checkbox,
    showInSchedule: fields.checkbox,
    committeeId: fields.optional(40),
    intent: z.enum(EVENT_INTENTS).default("save"),
  })
  .superRefine((v, ctx) => {
    const duration = v.endsAt.getTime() - v.startsAt.getTime();
    if (!Number.isNaN(duration) && duration <= 0) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "end_before_start" });
    } else if (duration > MAX_DURATION_MS) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "too_long_event" });
    }
    if (v.until && v.recurrence === "none") {
      ctx.addIssue({ code: "custom", path: ["until"], message: "until_without_repeat" });
    } else if (v.until && v.until < v.startsAt) {
      ctx.addIssue({ code: "custom", path: ["until"], message: "until_before_start" });
    }
  })
  .transform((v, ctx) => {
    let rrule: string | null = null;
    try {
      rrule = buildRRule(v.recurrence, v.startsAt, v.until);
    } catch (error) {
      ctx.addIssue({ code: "custom", path: ["recurrence"], message: (error as Error).message });
    }
    const { recurrence: _r, until: _u, ...rest } = v;
    void _r;
    void _u;
    return { ...rest, rrule };
  });

export async function listEventsForAdmin() {
  return prisma.event.findMany({
    orderBy: [{ status: "asc" }, { startsAt: "desc" }],
    take: 200,
    select: { id: true, slug: true, title: true, status: true, startsAt: true, rrule: true, isService: true, venue: true },
  });
}

export async function getEventForAdmin(id: string) {
  return prisma.event.findUnique({
    where: { id },
    include: { exceptions: { orderBy: { occurrenceStart: "asc" } } },
  });
}

function nextStatus(current: ContentStatus | null, intent: EventIntent): ContentStatus {
  if (intent === "publish") return "PUBLISHED";
  if (intent === "unpublish") return "DRAFT";
  if (intent === "archive") return "ARCHIVED";
  return current ?? "DRAFT";
}

export async function saveEvent(actor: Actor, id: string | null, input: Record<string, string>) {
  assertCanManage(actor);
  const { intent, ...data } = eventSchema.parse(input);
  const status = (existingStatus: ContentStatus | null) => nextStatus(existingStatus, intent);

  if (id) {
    const existing = await prisma.event.findUnique({ where: { id }, include: { exceptions: true } });
    if (!existing) throw new ServiceError("not_found");
    // Exceptions for dates that are no longer part of the series would never match again.
    const timing = { startsAt: data.startsAt, endsAt: data.endsAt, rrule: data.rrule };
    const orphaned = existing.exceptions.filter((e) => !isOccurrence(timing, e.occurrenceStart)).map((e) => e.id);
    const [updated] = await prisma.$transaction([
      prisma.event.update({ where: { id }, data: { ...data, status: status(existing.status) } }),
      prisma.eventException.deleteMany({ where: { id: { in: orphaned } } }),
    ]);
    await audit({
      actorId: actor.id,
      action: `event.${intent === "save" ? "update" : intent}`,
      entityType: "event",
      entityId: id,
      meta: orphaned.length ? { removedExceptions: orphaned.length } : undefined,
    });
    return updated;
  }

  const slug = await uniqueSlug(data.title, async (s) => !!(await prisma.event.findUnique({ where: { slug: s } })));
  const created = await prisma.event.create({ data: { ...data, slug, status: status(null), createdById: actor.id } });
  await audit({
    actorId: actor.id,
    action: created.status === "PUBLISHED" ? "event.publish" : "event.create",
    entityType: "event",
    entityId: created.id,
    meta: { slug },
  });
  return created;
}

// ── Single dates of a recurring event ──

export const exceptionSchema = z
  .object({
    occurrenceStart: z.iso.datetime({ offset: true, message: "invalid" }).transform((v) => new Date(v)),
    action: z.enum(["cancel", "move"]),
    newStart: fields.optionalDateTime,
    newEnd: fields.optionalDateTime,
    note: fields.optional(200),
  })
  .superRefine((v, ctx) => {
    if (v.action !== "move") return;
    if (!v.newStart) ctx.addIssue({ code: "custom", path: ["newStart"], message: "required" });
    if (v.newStart && v.newEnd && v.newEnd <= v.newStart) {
      ctx.addIssue({ code: "custom", path: ["newEnd"], message: "end_before_start" });
    }
  });

export async function setOccurrenceException(actor: Actor, eventId: string, input: Record<string, string>) {
  assertCanManage(actor);
  const v = exceptionSchema.parse(input);
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new ServiceError("not_found");
  if (!isOccurrence(event, v.occurrenceStart)) throw new ServiceError("not_an_occurrence");

  const duration = event.endsAt.getTime() - event.startsAt.getTime();
  const data =
    v.action === "cancel"
      ? { cancelled: true, newStart: null, newEnd: null, note: v.note }
      : {
          cancelled: false,
          newStart: v.newStart,
          newEnd: v.newEnd ?? new Date(v.newStart!.getTime() + duration),
          note: v.note,
        };
  const exception = await prisma.eventException.upsert({
    where: { eventId_occurrenceStart: { eventId, occurrenceStart: v.occurrenceStart } },
    create: { eventId, occurrenceStart: v.occurrenceStart, ...data },
    update: data,
  });
  await audit({
    actorId: actor.id,
    action: v.action === "cancel" ? "event.cancel_date" : "event.move_date",
    entityType: "event",
    entityId: eventId,
    meta: { exceptionId: exception.id, date: v.occurrenceStart.toISOString() },
  });
}

export async function clearOccurrenceException(actor: Actor, eventId: string, exceptionId: string) {
  assertCanManage(actor);
  const { count } = await prisma.eventException.deleteMany({ where: { id: exceptionId, eventId } });
  if (count) await audit({ actorId: actor.id, action: "event.restore_date", entityType: "event", entityId: eventId });
}
