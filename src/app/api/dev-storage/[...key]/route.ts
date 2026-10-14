import { createReadStream, createWriteStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { MAX_UPLOAD_BYTES } from "@/lib/file-rules";
import { attachmentHeader, storage } from "@/server/storage";
import { ensureParentDir, localPath, verifyGrant, type LocalGrant } from "@/server/storage/local";

// Serves the local storage driver's signed URLs (src/server/storage/local.ts), imitating a private
// R2 bucket in development and E2E tests. Answers 404 whenever the local driver isn't in use.

type Context = RouteContext<"/api/dev-storage/[...key]">;

async function grantFor(request: Request, context: Context, op: "put" | "get") {
  if (storage().name !== "local") return null;
  const { key: parts } = await context.params;
  const url = new URL(request.url);
  const grant: LocalGrant = {
    op,
    key: parts.join("/"),
    exp: Number(url.searchParams.get("exp")),
    name: url.searchParams.get("name") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
  };
  if (url.searchParams.get("op") !== op || !verifyGrant(grant, url.searchParams.get("sig") ?? "")) return null;
  return grant;
}

export async function PUT(request: Request, context: Context) {
  const grant = await grantFor(request, context, "put");
  if (!grant) return new Response("Forbidden", { status: 403 });
  if (!request.body) return new Response("Empty", { status: 400 });

  const file = localPath(grant.key);
  await ensureParentDir(file);
  let received = 0;
  const limit = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      received += chunk.length;
      callback(received > MAX_UPLOAD_BYTES ? new Error("too_large") : null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(request.body as never), limit, createWriteStream(/*turbopackIgnore: true*/ file));
  } catch {
    await storage().remove(grant.key);
    return new Response("Too large", { status: 413 });
  }
  return new Response(null, { status: 200 });
}

export async function GET(request: Request, context: Context) {
  const grant = await grantFor(request, context, "get");
  if (!grant) return new Response("Forbidden", { status: 403 });
  const file = localPath(grant.key);
  const info = await stat(/*turbopackIgnore: true*/ file).catch(() => null);
  if (!info) return new Response("Not found", { status: 404 });
  return new Response(Readable.toWeb(createReadStream(/*turbopackIgnore: true*/ file)) as ReadableStream, {
    headers: {
      "Content-Type": grant.type ?? "application/octet-stream",
      "Content-Length": String(info.size),
      "Content-Disposition": attachmentHeader(grant.name ?? "download"),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
