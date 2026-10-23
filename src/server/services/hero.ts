import { randomBytes } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { z } from "zod";
import { checkFile } from "@/lib/file-rules";
import { HERO_WIDTHS, heroImageKey } from "@/lib/hero";
import { audit } from "@/server/audit";
import { prisma } from "@/server/db";
import { ServiceError } from "@/server/errors";
import { fields } from "@/server/forms";
import { can, type Actor } from "@/server/policy";
import { storage, UPLOAD_URL_SECONDS } from "@/server/storage";

// Home page photos (the slider under the menu). Admins upload one photo; the server checks it is
// really a JPG, PNG or WebP, then stores small WebP copies cropped to the banner shape, so a phone
// downloads ~30 KB instead of a multi-megabyte camera file. Re-encoding also drops EXIF data
// (such as GPS location). The original upload is deleted.

const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ASPECT = 7 / 16; // height / width, like the mockup's banner
const QUALITY = 60;

function assertCanEdit(actor: Actor) {
  if (!can(actor, "site.edit")) throw new ServiceError("forbidden");
}

export async function listSlidesForAdmin() {
  return prisma.heroSlide.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
}

const altSchema = fields.required(200);

/** Step 1: create the slide (hidden until processed) and a presigned upload URL. */
export async function startSlideUpload(actor: Actor, input: { alt: string; fileName: string; size: number }) {
  assertCanEdit(actor);
  const alt = altSchema.safeParse(input.alt);
  if (!alt.success) throw new z.ZodError([{ code: "custom", path: ["alt"], message: "required", input: input.alt }]);
  if (!Number.isInteger(input.size) || input.size <= 0 || input.size > 10 * 1024 * 1024) throw new ServiceError("file_size");

  const last = await prisma.heroSlide.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  const slide = await prisma.heroSlide.create({
    data: { alt: alt.data, active: false, sortOrder: (last?.sortOrder ?? -1) + 1, createdById: actor.id },
  });
  const storageKey = `hero/${slide.id}/${randomBytes(9).toString("base64url")}.file`;
  const pending = await prisma.pendingUpload.create({
    data: {
      kind: "HERO",
      storageKey,
      targetId: slide.id,
      fileName: input.fileName.slice(0, 255),
      sizeBytes: input.size,
      createdById: actor.id,
      expiresAt: new Date(Date.now() + (UPLOAD_URL_SECONDS + 300) * 1000),
    },
  });
  const { url, headers } = await storage().presignUpload(storageKey);
  return { uploadId: pending.id, url, headers };
}

/** Step 2: check the photo, store the resized WebP copies, show the slide. */
export async function finishSlideUpload(actor: Actor, uploadId: string) {
  assertCanEdit(actor);
  const pending = await prisma.pendingUpload.findUnique({ where: { id: uploadId } });
  if (!pending || pending.kind !== "HERO" || pending.expiresAt < new Date()) throw new ServiceError("upload_expired");
  const store = storage();

  const fail = async (code: string) => {
    await store.remove(pending.storageKey);
    await prisma.pendingUpload.delete({ where: { id: pending.id } });
    await prisma.heroSlide.delete({ where: { id: pending.targetId } }).catch(() => undefined);
    throw new ServiceError(code);
  };

  const size = await store.size(pending.storageKey);
  if (size === null) return fail("upload_missing");
  const original = await store.read(pending.storageKey);
  const detected = await fileTypeFromBuffer(original);
  const check = checkFile(detected?.mime, size);
  if (!check.ok || !PHOTO_TYPES.has(check.mimeType)) return fail(check.ok ? "photo_type" : `file_${check.reason}`);

  const version = randomBytes(6).toString("base64url").replace(/[^A-Za-z0-9]/g, "x");
  try {
    for (const width of HERO_WIDTHS) {
      const webp = await sharp(original)
        .rotate() // respect the phone's orientation flag before it is dropped
        .resize({ width, height: Math.round(width * ASPECT), fit: "cover", position: "attention" })
        .webp({ quality: QUALITY })
        .toBuffer();
      await store.put(heroImageKey(pending.targetId, version, width), new Uint8Array(webp), "image/webp");
    }
  } catch {
    return fail("photo_unreadable");
  }

  await store.remove(pending.storageKey);
  await prisma.$transaction([
    prisma.heroSlide.update({ where: { id: pending.targetId }, data: { version, active: true } }),
    prisma.pendingUpload.delete({ where: { id: pending.id } }),
  ]);
  await audit({ actorId: actor.id, action: "hero.upload", entityType: "heroSlide", entityId: pending.targetId });
}

const slideSchema = z.object({
  alt: fields.required(200),
  sortOrder: z.coerce.number().int("invalid").min(0, "invalid").max(999, "invalid"),
  active: fields.checkbox,
});

export async function updateSlide(actor: Actor, id: string, input: Record<string, string>) {
  assertCanEdit(actor);
  const data = slideSchema.parse(input);
  await prisma.heroSlide.update({ where: { id }, data });
  await audit({ actorId: actor.id, action: "hero.update", entityType: "heroSlide", entityId: id });
}

export async function deleteSlide(actor: Actor, id: string) {
  assertCanEdit(actor);
  const slide = await prisma.heroSlide.findUnique({ where: { id } });
  if (!slide) return;
  if (slide.version) {
    for (const width of HERO_WIDTHS) await storage().remove(heroImageKey(slide.id, slide.version, width));
  }
  await prisma.heroSlide.delete({ where: { id } });
  await audit({ actorId: actor.id, action: "hero.delete", entityType: "heroSlide", entityId: id });
}
