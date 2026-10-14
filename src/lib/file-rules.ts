// What may be uploaded to Resources (docs/PLAN.md §3.2). The type is decided from the file's
// first bytes (file-type), never from its name. HTML, SVG and executables are never allowed.

export type FileKind = { label: string; ext: string; maxBytes: number };

const MB = 1024 * 1024;

export const ALLOWED_TYPES: Readonly<Record<string, FileKind>> = {
  "application/pdf": { label: "PDF", ext: "pdf", maxBytes: 25 * MB },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { label: "Word", ext: "docx", maxBytes: 25 * MB },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": { label: "PowerPoint", ext: "pptx", maxBytes: 25 * MB },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { label: "Excel", ext: "xlsx", maxBytes: 25 * MB },
  "image/jpeg": { label: "JPG", ext: "jpg", maxBytes: 10 * MB },
  "image/png": { label: "PNG", ext: "png", maxBytes: 10 * MB },
  "image/webp": { label: "WebP", ext: "webp", maxBytes: 10 * MB },
  "audio/mpeg": { label: "MP3", ext: "mp3", maxBytes: 50 * MB },
  "audio/mp4": { label: "M4A", ext: "m4a", maxBytes: 50 * MB },
  "audio/x-m4a": { label: "M4A", ext: "m4a", maxBytes: 50 * MB },
};

/** Largest file of any allowed type: the cap for a presigned upload before its type is known. */
export const MAX_UPLOAD_BYTES = Math.max(...Object.values(ALLOWED_TYPES).map((t) => t.maxBytes));

/** For the file picker's `accept` attribute (a hint only; the server checks the content). */
export const ACCEPT_ATTRIBUTE = ".pdf,.docx,.pptx,.xlsx,.jpg,.jpeg,.png,.webp,.mp3,.m4a";

export type FileCheck = { ok: true; kind: FileKind; mimeType: string } | { ok: false; reason: "type" | "size" | "empty" };

/** Check a detected MIME type (or none) and the stored size against the allow-list. */
export function checkFile(detectedMime: string | undefined, sizeBytes: number): FileCheck {
  if (sizeBytes <= 0) return { ok: false, reason: "empty" };
  const kind = detectedMime ? ALLOWED_TYPES[detectedMime] : undefined;
  if (!kind || !detectedMime) return { ok: false, reason: "type" };
  if (sizeBytes > kind.maxBytes) return { ok: false, reason: "size" };
  return { ok: true, kind, mimeType: detectedMime };
}

/** A safe download name: letters, digits, spaces, dots, hyphens; the right extension. */
export function sanitizeFileName(name: string, ext: string): string {
  const base = (name.split(/[\\/]/).pop() ?? "") // drop any folder path
    .replace(/\.[A-Za-z0-9]{1,8}$/, "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return `${base || "file"}.${ext}`;
}

/** "1.2 MB", "340 KB" (base 1024, one decimal for MB). */
export function formatBytes(bytes: number): string {
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function kindLabel(mimeType: string): string {
  return ALLOWED_TYPES[mimeType]?.label ?? "File";
}
