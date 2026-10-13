import { z } from "zod";
import {
  DEFAULT_SITE_CONTENT,
  parseSiteContent,
  SITE_CONTENT_KEYS,
  SITE_CONTENT_SCHEMAS,
  type SiteContent,
  type SiteContentKey,
} from "@/lib/site-content";
import type { Prisma } from "@/generated/prisma/client";
import { audit } from "@/server/audit";
import { prisma } from "@/server/db";
import { ServiceError } from "@/server/errors";
import { fields } from "@/server/forms";
import { can, type Actor } from "@/server/policy";

function assertCanEdit(actor: Actor) {
  if (!can(actor, "site.edit")) throw new ServiceError("forbidden");
}

/** All site content, with defaults for keys that were never saved. Uncached: for admin and public reads. */
export async function readSiteContent(): Promise<SiteContent> {
  const rows = await prisma.siteContent.findMany();
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  return Object.fromEntries(
    SITE_CONTENT_KEYS.map((key) => [key, byKey.has(key) ? parseSiteContent(key, byKey.get(key)) : DEFAULT_SITE_CONTENT[key]]),
  ) as SiteContent;
}

/**
 * Form fields → the JSON shape of a key. Contacts arrive as rows `contacts.0.role`, `contacts.0.name`, …;
 * rows left completely empty are dropped.
 */
export function siteContentInput(key: SiteContentKey, values: Record<string, string>): unknown {
  if (key === "contacts") {
    const items = [];
    for (let i = 0; i < 8; i++) {
      const role = values[`contacts.${i}.role`]?.trim() ?? "";
      const name = values[`contacts.${i}.name`]?.trim() ?? "";
      const phone = values[`contacts.${i}.phone`]?.trim() ?? "";
      if (!role && !name && !phone) continue;
      items.push({ role, name, phone, whatsapp: values[`contacts.${i}.whatsapp`] === "on" });
    }
    return { items };
  }
  const shape = SITE_CONTENT_SCHEMAS[key].shape as Record<string, unknown>;
  return Object.fromEntries(Object.keys(shape).map((field) => [field, values[field] ?? ""]));
}

export async function saveSiteContent(actor: Actor, key: SiteContentKey, values: Record<string, string>) {
  assertCanEdit(actor);
  const parsed = SITE_CONTENT_SCHEMAS[key].safeParse(siteContentInput(key, values));
  if (!parsed.success) {
    // Contact paths come back as ["items", 0, "phone"]; the form names them "contacts.0.phone".
    throw new z.ZodError(
      parsed.error.issues.map((issue) => ({
        ...issue,
        path: issue.path[0] === "items" ? ["contacts", ...issue.path.slice(1)] : issue.path,
      })),
    );
  }
  const value = parsed.data as Prisma.InputJsonValue;
  await prisma.siteContent.upsert({
    where: { key },
    create: { key, value, updatedById: actor.id },
    update: { value, updatedById: actor.id },
  });
  await audit({ actorId: actor.id, action: "site.update", entityType: "siteContent", entityId: key });
}

// ── Privacy notice (versioned: a new version will mean new consents from M4) ──

export async function latestPrivacyNotice() {
  return prisma.privacyNotice.findFirst({ orderBy: { version: "desc" } });
}

const privacySchema = z.object({ body: fields.required(20_000) });

export async function publishPrivacyNotice(actor: Actor, input: Record<string, string>) {
  assertCanEdit(actor);
  const { body } = privacySchema.parse(input);
  const latest = await latestPrivacyNotice();
  if (latest && latest.body.trim() === body.trim()) throw new ServiceError("unchanged");
  const notice = await prisma.privacyNotice.create({
    data: { version: (latest?.version ?? 0) + 1, body, publishedById: actor.id },
  });
  await audit({ actorId: actor.id, action: "privacy.publish", entityType: "privacyNotice", entityId: String(notice.version) });
  return notice;
}
