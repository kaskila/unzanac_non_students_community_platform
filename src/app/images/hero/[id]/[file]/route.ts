import { HERO_WIDTHS } from "@/lib/hero";
import { storage } from "@/server/storage";

// Serves home page photos from the private bucket. File names include a version that changes on
// every upload, so responses are cached for a year by browsers and the CDN.
const FILE_PATTERN = /^([A-Za-z0-9]+)-(\d+)\.webp$/;

export async function GET(_request: Request, { params }: RouteContext<"/images/hero/[id]/[file]">) {
  const { id, file } = await params;
  const match = FILE_PATTERN.exec(file);
  if (!/^[a-z0-9]+$/.test(id) || !match || !HERO_WIDTHS.includes(Number(match[2]) as never)) {
    return new Response("Not found", { status: 404 });
  }
  const body = await storage().stream(`hero/${id}/${file}`);
  if (!body) return new Response("Not found", { status: 404 });
  return new Response(body, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
