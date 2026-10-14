import { randomBytes } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import { z } from "zod";
import { checkFile, MAX_UPLOAD_BYTES, sanitizeFileName } from "@/lib/file-rules";
import { uniqueSlug } from "@/lib/slug";
import { MaterialCategory, MaterialVisibility, type ContentStatus } from "@/generated/prisma/client";
import { audit } from "@/server/audit";
import { prisma } from "@/server/db";
import { ServiceError } from "@/server/errors";
import { fields } from "@/server/forms";
import { can, type Actor } from "@/server/policy";
import { storage, UPLOAD_URL_SECONDS } from "@/server/storage";

// Resources (docs/PLAN.md §3.2): metadata in Postgres, files in R2. Uploads go straight from the
// admin's browser to storage; confirmUpload() then checks what actually arrived.

export const MATERIAL_CATEGORIES = Object.values(MaterialCategory);
export const MATERIAL_VISIBILITIES = Object.values(MaterialVisibility);
export const MATERIAL_INTENTS = ["save", "publish", "unpublish", "archive"] as const;
export const PURGE_AFTER_DAYS = 30;
const DAY_MS = 86_400_000;
const SNIFF_BYTES = 64 * 1024; // enough for file-type to tell Office documents apart

function assertCan(actor: Actor, action: "media.manage" | "resource.delete") {
  if (!can(actor, action)) throw new ServiceError("forbidden");
}

export async function listMaterialsForAdmin() {
  return prisma.material.findMany({
    orderBy: [{ deletedAt: { sort: "desc", nulls: "first" } }, { status: "asc" }, { updatedAt: "desc" }],
    take: 300,
    include: { currentFile: { select: { mimeType: true, sizeBytes: true } } },
  });
}

export async function getMaterialForAdmin(id: string) {
  return prisma.material.findUnique({
    where: { id },
    include: { currentFile: true, files: { orderBy: { uploadedAt: "desc" } } },
  });
}

export const materialSchema = z.object({
  title: fields.required(150),
  description: fields.optional(2000),
  category: z.enum(MaterialCategory, "invalid"),
  committeeId: fields.optional(40),
  visibility: z.enum(MaterialVisibility, "invalid"),
  expiresAt: fields.optionalDateTime,
  intent: z.enum(MATERIAL_INTENTS).default("save"),
});

function nextStatus(current: ContentStatus | null, intent: (typeof MATERIAL_INTENTS)[number]): ContentStatus {
  if (intent === "publish") return "PUBLISHED";
  if (intent === "unpublish") return "DRAFT";
  if (intent === "archive") return "ARCHIVED";
  return current ?? "DRAFT";
}

/** Create (id = null) or update a resource's details. Publishing needs an uploaded file. */
export async function saveMaterial(actor: Actor, id: string | null, input: Record<string, string>) {
  assertCan(actor, "media.manage");
  const { intent, ...data } = materialSchema.parse(input);
  const existing = id ? await prisma.material.findUnique({ where: { id } }) : null;
  if (id && (!existing || existing.deletedAt)) throw new ServiceError("not_found");
  const status = nextStatus(existing?.status ?? null, intent);
  if (status === "PUBLISHED" && !existing?.currentFileId) throw new ServiceError("no_file");

  if (existing) {
    const updated = await prisma.material.update({ where: { id: existing.id }, data: { ...data, status } });
    await audit({ actorId: actor.id, action: `material.${intent === "save" ? "update" : intent}`, entityType: "material", entityId: existing.id });
    return updated;
  }
  const slug = await uniqueSlug(data.title, async (s) => !!(await prisma.material.findUnique({ where: { slug: s } })));
  const created = await prisma.material.create({ data: { ...data, slug, status, createdById: actor.id } });
  await audit({ actorId: actor.id, action: "material.create", entityType: "material", entityId: created.id, meta: { slug } });
  return created;
}

// ── Uploads ──

const uploadRequestSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  size: z.number().int().positive(),
});

/** Step 1: a presigned URL for one file. The browser PUTs the file there directly. */
export async function requestUpload(actor: Actor, materialId: string, input: { fileName: string; size: number }) {
  assertCan(actor, "media.manage");
  const { fileName, size } = uploadRequestSchema.parse(input);
  if (size > MAX_UPLOAD_BYTES) throw new ServiceError("file_size");
  const material = await prisma.material.findUnique({ where: { id: materialId } });
  if (!material || material.deletedAt) throw new ServiceError("not_found");

  const storageKey = `materials/${materialId}/${randomBytes(12).toString("base64url")}.file`;
  const pending = await prisma.pendingUpload.create({
    data: {
      storageKey,
      materialId,
      fileName,
      sizeBytes: size,
      createdById: actor.id,
      expiresAt: new Date(Date.now() + (UPLOAD_URL_SECONDS + 300) * 1000),
    },
  });
  const { url, headers } = await storage().presignUpload(storageKey);
  return { uploadId: pending.id, url, headers };
}

/**
 * Step 2: check the stored object (size, real type from its first bytes) and make it the
 * resource's current file. Anything not on the allow-list is deleted again.
 */
export async function confirmUpload(actor: Actor, uploadId: string) {
  assertCan(actor, "media.manage");
  const pending = await prisma.pendingUpload.findUnique({ where: { id: uploadId } });
  if (!pending || pending.expiresAt < new Date()) throw new ServiceError("upload_expired");
  const store = storage();

  const size = await store.size(pending.storageKey);
  if (size === null) throw new ServiceError("upload_missing");
  const detected = await fileTypeFromBuffer(await store.readStart(pending.storageKey, SNIFF_BYTES));
  const check = checkFile(detected?.mime, size);
  if (!check.ok) {
    await store.remove(pending.storageKey);
    await prisma.pendingUpload.delete({ where: { id: pending.id } });
    await audit({
      actorId: actor.id,
      action: "material.upload_rejected",
      entityType: "material",
      entityId: pending.materialId,
      meta: { reason: check.reason, detected: detected?.mime ?? null, size },
    });
    throw new ServiceError(`file_${check.reason}`);
  }

  const sha256 = await store.sha256(pending.storageKey);
  const file = await prisma.$transaction(async (tx) => {
    const created = await tx.materialFile.create({
      data: {
        materialId: pending.materialId,
        storageKey: pending.storageKey,
        fileName: sanitizeFileName(pending.fileName, check.kind.ext),
        mimeType: check.mimeType,
        sizeBytes: size,
        sha256,
        uploadedById: actor.id,
      },
    });
    await tx.material.update({ where: { id: pending.materialId }, data: { currentFileId: created.id } });
    await tx.pendingUpload.delete({ where: { id: pending.id } });
    return created;
  });
  await audit({
    actorId: actor.id,
    action: "material.upload",
    entityType: "material",
    entityId: pending.materialId,
    meta: { fileId: file.id, type: check.mimeType, size },
  });
  return file;
}

// ── Delete (owner only, undoable for 30 days) ──

export async function deleteMaterial(actor: Actor, id: string) {
  assertCan(actor, "resource.delete");
  await prisma.material.update({ where: { id }, data: { deletedAt: new Date(), status: "ARCHIVED" } });
  await audit({ actorId: actor.id, action: "material.delete", entityType: "material", entityId: id });
}

export async function restoreMaterial(actor: Actor, id: string) {
  assertCan(actor, "resource.delete");
  await prisma.material.update({ where: { id }, data: { deletedAt: null, status: "DRAFT" } });
  await audit({ actorId: actor.id, action: "material.restore", entityType: "material", entityId: id });
}

// ── Public download ──

/** Count a download and return a short-lived signed URL, or null if the resource isn't available. */
export async function startDownload(slug: string): Promise<string | null> {
  const now = new Date();
  const material = await prisma.material.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    include: { currentFile: true },
  });
  if (!material?.currentFile) return null;
  await prisma.material.update({ where: { id: material.id }, data: { downloadCount: { increment: 1 } } });
  const { storageKey, fileName, mimeType } = material.currentFile;
  return storage().presignDownload(storageKey, fileName, mimeType);
}

// ── Daily clean-up (cron) ──

/** Remove files of resources deleted more than 30 days ago, and abandoned uploads. */
export async function purgeStorage(now = new Date()) {
  const store = storage();
  const expired = await prisma.material.findMany({
    where: { deletedAt: { lt: new Date(now.getTime() - PURGE_AFTER_DAYS * DAY_MS) } },
    include: { files: true },
  });
  for (const material of expired) {
    for (const file of material.files) await store.remove(file.storageKey);
    await prisma.material.delete({ where: { id: material.id } });
  }
  const abandoned = await prisma.pendingUpload.findMany({ where: { expiresAt: { lt: now } } });
  for (const upload of abandoned) {
    await store.remove(upload.storageKey);
    await prisma.pendingUpload.delete({ where: { id: upload.id } });
  }
  if (expired.length || abandoned.length) {
    await audit({ action: "storage.purge", entityType: "material", meta: { materials: expired.length, uploads: abandoned.length } });
  }
  return { materials: expired.length, uploads: abandoned.length };
}
