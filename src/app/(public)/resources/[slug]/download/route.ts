import { startDownload } from "@/server/services/materials";

/** Counts the download, then redirects to a 5-minute signed link (docs/PLAN.md §3.2). */
export async function GET(request: Request, { params }: RouteContext<"/resources/[slug]/download">) {
  const { slug } = await params;
  const url = await startDownload(slug);
  if (!url) return new Response("Not found", { status: 404 });
  return new Response(null, {
    status: 302,
    headers: { Location: new URL(url, request.url).toString(), "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
