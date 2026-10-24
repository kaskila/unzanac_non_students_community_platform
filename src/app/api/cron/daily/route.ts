import { timingSafeEqual } from "node:crypto";
import { ServiceError } from "@/server/errors";
import { purgeStorage } from "@/server/services/materials";
import { importChannelUploads } from "@/server/services/videos";

// Daily jobs (docs/PLAN.md §10), called by Vercel Cron (vercel.json) with
// "Authorization: Bearer $CRON_SECRET". Later milestones add token and retention clean-up here.

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  if (!authorised(request)) return new Response("Unauthorized", { status: 401 });

  const result: Record<string, unknown> = {};
  try {
    result.videosImported = await importChannelUploads(null);
  } catch (error) {
    result.videosImported = error instanceof ServiceError ? error.code : "failed";
    if (!(error instanceof ServiceError)) console.error(error);
  }
  try {
    result.purged = await purgeStorage();
  } catch (error) {
    result.purged = "failed";
    console.error(error);
  }
  return Response.json(result);
}
