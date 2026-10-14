// Video links (docs/PLAN.md §3.1). Admins paste any YouTube or Facebook link; we keep only the
// source and ID. YouTube plays through youtube-nocookie.com, inserted only when someone taps play.
// Facebook videos are linked, never embedded (heavy scripts, tracking cookies).

export type ParsedVideo =
  | { source: "YOUTUBE"; kind: "VIDEO" | "LIVE"; externalId: string }
  | { source: "YOUTUBE"; kind: "PLAYLIST"; externalId: string }
  | { source: "FACEBOOK"; kind: "VIDEO"; externalId: string };

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const PLAYLIST_ID = /^[A-Za-z0-9_-]{12,64}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"]);
const FACEBOOK_HOSTS = new Set(["facebook.com", "www.facebook.com", "m.facebook.com", "web.facebook.com", "fb.watch"]);

export function parseVideoUrl(input: string): ParsedVideo | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") {
    return VIDEO_ID.test(parts[0] ?? "") ? { source: "YOUTUBE", kind: "VIDEO", externalId: parts[0] } : null;
  }
  if (YOUTUBE_HOSTS.has(host)) {
    const v = url.searchParams.get("v");
    if (parts[0] === "watch" && v && VIDEO_ID.test(v)) return { source: "YOUTUBE", kind: "VIDEO", externalId: v };
    if (["shorts", "embed", "v", "live"].includes(parts[0] ?? "") && VIDEO_ID.test(parts[1] ?? "")) {
      return { source: "YOUTUBE", kind: parts[0] === "live" ? "LIVE" : "VIDEO", externalId: parts[1] };
    }
    const list = url.searchParams.get("list");
    if (parts[0] === "playlist" && list && PLAYLIST_ID.test(list)) {
      return { source: "YOUTUBE", kind: "PLAYLIST", externalId: list };
    }
    return null;
  }
  if (FACEBOOK_HOSTS.has(host)) {
    const isVideo = host === "fb.watch" || parts.includes("videos") || parts[0] === "watch" || parts[0] === "reel";
    if (!isVideo) return null;
    url.hash = "";
    return { source: "FACEBOOK", kind: "VIDEO", externalId: url.toString() };
  }
  return null;
}

/** ~15 KB thumbnail (320×180). */
export function youTubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

/** Privacy-enhanced player URL, used only after the visitor taps play. */
export function youTubeEmbedUrl(kind: ParsedVideo["kind"] | "PLAYLIST", externalId: string): string {
  return kind === "PLAYLIST"
    ? `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(externalId)}&autoplay=1`
    : `https://www.youtube-nocookie.com/embed/${encodeURIComponent(externalId)}?autoplay=1&rel=0`;
}

/** Link that opens the YouTube app on Android, or the website. */
export function youTubeAppUrl(kind: ParsedVideo["kind"] | "PLAYLIST", externalId: string): string {
  return kind === "PLAYLIST" ? `https://www.youtube.com/playlist?list=${encodeURIComponent(externalId)}` : `https://youtu.be/${externalId}`;
}

/** The URL oEmbed expects for a stored video. */
export function youTubeCanonicalUrl(kind: ParsedVideo["kind"] | "PLAYLIST", externalId: string): string {
  return kind === "PLAYLIST"
    ? `https://www.youtube.com/playlist?list=${externalId}`
    : `https://www.youtube.com/watch?v=${externalId}`;
}

export const CHANNEL_ID_PATTERN = /^UC[A-Za-z0-9_-]{22}$/;

export function channelFeedUrl(channelId: string): string {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
}

export type FeedEntry = { videoId: string; title: string; publishedAt: Date | null; description: string };

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&")
    .trim();
}

/** Parse a YouTube channel Atom feed. The format is fixed, so a small parser is enough. */
export function parseChannelFeed(xml: string): FeedEntry[] {
  const entries: FeedEntry[] = [];
  for (const match of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const entry = match[1];
    const tag = (name: string) => new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`).exec(entry)?.[1];
    const videoId = tag("yt:videoId")?.trim();
    if (!videoId || !VIDEO_ID.test(videoId)) continue;
    const published = tag("published");
    const date = published ? new Date(published.trim()) : null;
    entries.push({
      videoId,
      title: decodeXml(tag("title") ?? "").slice(0, 200) || videoId,
      publishedAt: date && !Number.isNaN(date.getTime()) ? date : null,
      description: decodeXml(tag("media:description") ?? "").slice(0, 2000),
    });
  }
  return entries;
}
