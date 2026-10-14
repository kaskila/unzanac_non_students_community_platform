import "server-only";
import { localStorageDriver } from "@/server/storage/local";
import { r2StorageDriver } from "@/server/storage/r2";

// File storage for Resources (docs/PLAN.md §3.2). Browsers upload straight to storage with a
// short-lived presigned URL, and downloads redirect to one; the bucket itself is never public.
//
// Drivers:
//   r2     Cloudflare R2 (staging, production). Needs R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
//          R2_SECRET_ACCESS_KEY, R2_BUCKET.
//   local  Files under .storage/ with HMAC-signed URLs served by /api/dev-storage. For development
//          and E2E tests only; refused in production.
// STORAGE_DRIVER picks one; by default R2 is used when R2_BUCKET is set, otherwise local.

export const UPLOAD_URL_SECONDS = 10 * 60;
export const DOWNLOAD_URL_SECONDS = 5 * 60;

export interface StorageDriver {
  readonly name: "r2" | "local";
  /** URL the browser PUTs the file to, valid UPLOAD_URL_SECONDS. */
  presignUpload(key: string): Promise<{ url: string; headers: Record<string, string> }>;
  /** Size of a stored object, or null if it doesn't exist. */
  size(key: string): Promise<number | null>;
  /** The first `bytes` bytes, for detecting the real file type. */
  readStart(key: string, bytes: number): Promise<Uint8Array>;
  /** SHA-256 of the whole object, as hex. */
  sha256(key: string): Promise<string>;
  /** URL that downloads the object as an attachment, valid DOWNLOAD_URL_SECONDS. */
  presignDownload(key: string, fileName: string, contentType: string): Promise<string>;
  remove(key: string): Promise<void>;
}

let driver: StorageDriver | null = null;

export function storage(): StorageDriver {
  if (driver) return driver;
  const choice = process.env.STORAGE_DRIVER ?? (process.env.R2_BUCKET ? "r2" : "local");
  if (choice === "r2") {
    driver = r2StorageDriver();
  } else if (choice === "local") {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_LOCAL_STORAGE !== "1") {
      throw new Error("Local file storage is for development only. Configure R2 (see .env.example).");
    }
    driver = localStorageDriver();
  } else {
    throw new Error(`Unknown STORAGE_DRIVER "${choice}"`);
  }
  return driver;
}

/** Content-Disposition for downloads: always an attachment, never shown inside the site. */
export function attachmentHeader(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
