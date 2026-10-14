import "server-only";
import { channelFeedUrl, parseChannelFeed, youTubeCanonicalUrl, type FeedEntry } from "@/lib/video-links";

// YouTube without an API key (docs/PLAN.md §3.1): oEmbed for a pasted link's title, and the
// channel's public RSS feed for new uploads. Both are best effort: a failure never blocks an admin.

const TIMEOUT_MS = 5000;

export async function fetchOEmbed(kind: "VIDEO" | "LIVE" | "PLAYLIST", externalId: string): Promise<{ title: string } | null> {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(youTubeCanonicalUrl(kind, externalId))}`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) return null;
    const data = (await response.json()) as { title?: unknown };
    return typeof data.title === "string" && data.title.trim() ? { title: data.title.trim().slice(0, 200) } : null;
  } catch {
    return null;
  }
}

export async function fetchChannelFeed(channelId: string): Promise<FeedEntry[]> {
  const response = await fetch(channelFeedUrl(channelId), { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`YouTube feed returned ${response.status}`);
  return parseChannelFeed(await response.text());
}
