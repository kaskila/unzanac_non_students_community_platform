import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, open, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { DOWNLOAD_URL_SECONDS, UPLOAD_URL_SECONDS, type StorageDriver } from "@/server/storage";

// Development stand-in for R2: files live in .storage/ and presigned URLs point at
// /api/dev-storage, signed with an HMAC so the route behaves like a private bucket.
// Filesystem calls carry turbopackIgnore: this driver is never deployed, so the build must not
// trace (and bundle) the whole project folder because of it.

const ROOT = path.join(process.cwd(), ".storage");
const KEY_PATTERN = /^[a-z0-9]+(\/[a-zA-Z0-9_-]+)*\.[a-z0-9]{2,5}$/;

export function localPath(key: string): string {
  if (!KEY_PATTERN.test(key)) throw new Error("Invalid storage key");
  const full = path.resolve(ROOT, key);
  if (!full.startsWith(ROOT + path.sep)) throw new Error("Invalid storage key");
  return full;
}

function secret(): string {
  return `local-storage:${process.env.BETTER_AUTH_SECRET ?? "dev"}`;
}

export type LocalGrant = { op: "put" | "get"; key: string; exp: number; name?: string; type?: string };

function payload(g: LocalGrant): string {
  return [g.op, g.key, g.exp, g.name ?? "", g.type ?? ""].join("\n");
}

export function signGrant(grant: LocalGrant): string {
  return createHmac("sha256", secret()).update(payload(grant)).digest("base64url");
}

/** Check a signed URL's grant: signature, expiry. */
export function verifyGrant(grant: LocalGrant, signature: string): boolean {
  if (!Number.isFinite(grant.exp) || grant.exp < Date.now() / 1000) return false;
  const expected = Buffer.from(signGrant(grant));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

function grantUrl(grant: LocalGrant): string {
  const params = new URLSearchParams({ op: grant.op, exp: String(grant.exp), sig: signGrant(grant) });
  if (grant.name) params.set("name", grant.name);
  if (grant.type) params.set("type", grant.type);
  return `/api/dev-storage/${grant.key}?${params}`;
}

export function localStorageDriver(): StorageDriver {
  return {
    name: "local",

    async presignUpload(key) {
      localPath(key);
      const exp = Math.floor(Date.now() / 1000) + UPLOAD_URL_SECONDS;
      return { url: grantUrl({ op: "put", key, exp }), headers: {} };
    },

    async size(key) {
      try {
        return (await stat(/*turbopackIgnore: true*/ localPath(key))).size;
      } catch {
        return null;
      }
    },

    async readStart(key, bytes) {
      const file = await open(/*turbopackIgnore: true*/ localPath(key), "r");
      try {
        const buffer = new Uint8Array(bytes);
        const { bytesRead } = await file.read(buffer, 0, bytes, 0);
        return buffer.subarray(0, bytesRead);
      } finally {
        await file.close();
      }
    },

    async sha256(key) {
      const hash = createHash("sha256");
      for await (const chunk of createReadStream(/*turbopackIgnore: true*/ localPath(key))) hash.update(chunk as Buffer);
      return hash.digest("hex");
    },

    async presignDownload(key, fileName, contentType) {
      const exp = Math.floor(Date.now() / 1000) + DOWNLOAD_URL_SECONDS;
      return grantUrl({ op: "get", key, exp, name: fileName, type: contentType });
    },

    async remove(key) {
      await rm(/*turbopackIgnore: true*/ localPath(key), { force: true });
    },

    async read(key) {
      return new Uint8Array(await readFile(/*turbopackIgnore: true*/ localPath(key)));
    },

    async put(key, body) {
      const file = localPath(key);
      await ensureParentDir(file);
      await writeFile(/*turbopackIgnore: true*/ file, body);
    },

    async stream(key) {
      const file = localPath(key);
      if (!(await stat(/*turbopackIgnore: true*/ file).catch(() => null))) return null;
      return Readable.toWeb(createReadStream(/*turbopackIgnore: true*/ file)) as ReadableStream<Uint8Array>;
    },
  };
}

export async function ensureParentDir(file: string) {
  await mkdir(/*turbopackIgnore: true*/ path.dirname(file), { recursive: true });
}
