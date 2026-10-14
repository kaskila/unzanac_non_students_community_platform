import { describe, expect, it } from "vitest";
import { checkFile, formatBytes, sanitizeFileName, MAX_UPLOAD_BYTES } from "@/lib/file-rules";
import { parseChannelFeed, parseVideoUrl, youTubeAppUrl, youTubeEmbedUrl, youTubeThumbnail } from "@/lib/video-links";

const ID = "dQw4w9WgXcQ";

describe("parseVideoUrl", () => {
  it("understands the common YouTube link shapes", () => {
    for (const url of [
      `https://www.youtube.com/watch?v=${ID}`,
      `https://m.youtube.com/watch?v=${ID}&t=42s`,
      `https://youtu.be/${ID}?si=abc`,
      `https://www.youtube.com/shorts/${ID}`,
      `https://www.youtube.com/embed/${ID}`,
      `https://www.youtube.com/watch?v=${ID}&list=PL1234567890abcdef`,
    ]) {
      expect(parseVideoUrl(url), url).toEqual({ source: "YOUTUBE", kind: "VIDEO", externalId: ID });
    }
    expect(parseVideoUrl(`https://www.youtube.com/live/${ID}`)).toEqual({ source: "YOUTUBE", kind: "LIVE", externalId: ID });
    expect(parseVideoUrl("https://www.youtube.com/playlist?list=PL1234567890abcdef")).toEqual({
      source: "YOUTUBE",
      kind: "PLAYLIST",
      externalId: "PL1234567890abcdef",
    });
  });

  it("keeps Facebook video links as links", () => {
    expect(parseVideoUrl("https://www.facebook.com/unzanac/videos/123456789/#comments")).toEqual({
      source: "FACEBOOK",
      kind: "VIDEO",
      externalId: "https://www.facebook.com/unzanac/videos/123456789/",
    });
    expect(parseVideoUrl("https://fb.watch/abcDEF/")?.source).toBe("FACEBOOK");
  });

  it("rejects everything else", () => {
    for (const url of [
      "not a url",
      "https://www.youtube.com/@UNZANACMUSICDEPT",
      "https://www.youtube.com/watch?v=short",
      "https://evil.example/watch?v=dQw4w9WgXcQ",
      "javascript:alert(1)",
      "https://www.facebook.com/unzanac",
    ]) {
      expect(parseVideoUrl(url), url).toBeNull();
    }
  });

  it("builds thumbnail, player and app links", () => {
    expect(youTubeThumbnail(ID)).toBe(`https://i.ytimg.com/vi/${ID}/mqdefault.jpg`);
    expect(youTubeEmbedUrl("VIDEO", ID)).toBe(`https://www.youtube-nocookie.com/embed/${ID}?autoplay=1&rel=0`);
    expect(youTubeEmbedUrl("PLAYLIST", "PL1")).toContain("videoseries?list=PL1");
    expect(youTubeAppUrl("VIDEO", ID)).toBe(`https://youtu.be/${ID}`);
  });
});

describe("parseChannelFeed", () => {
  const xml = `<?xml version="1.0"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015">
    <entry><id>yt:video:${ID}</id><yt:videoId>${ID}</yt:videoId><title>Choir: &quot;Abide with me&quot; &amp; more</title>
      <published>2026-10-11T08:00:00+00:00</published>
      <media:group><media:description>Sunday &lt;3</media:description></media:group></entry>
    <entry><yt:videoId>bad</yt:videoId><title>x</title></entry>
  </feed>`;

  it("reads valid entries and decodes text", () => {
    expect(parseChannelFeed(xml)).toEqual([
      {
        videoId: ID,
        title: 'Choir: "Abide with me" & more',
        publishedAt: new Date("2026-10-11T08:00:00Z"),
        description: "Sunday <3",
      },
    ]);
  });
});

describe("file rules", () => {
  it("allows listed types within their size limits", () => {
    expect(checkFile("application/pdf", 1_000)).toMatchObject({ ok: true, kind: { label: "PDF" } });
    expect(checkFile("audio/mpeg", 49 * 1024 * 1024)).toMatchObject({ ok: true });
    expect(MAX_UPLOAD_BYTES).toBe(50 * 1024 * 1024);
  });

  it("rejects unknown, dangerous, oversized and empty files", () => {
    expect(checkFile(undefined, 100)).toEqual({ ok: false, reason: "type" }); // plain text / HTML: no magic bytes
    expect(checkFile("image/svg+xml", 100)).toEqual({ ok: false, reason: "type" });
    expect(checkFile("application/x-msdownload", 100)).toEqual({ ok: false, reason: "type" });
    expect(checkFile("image/png", 11 * 1024 * 1024)).toEqual({ ok: false, reason: "size" });
    expect(checkFile("application/pdf", 0)).toEqual({ ok: false, reason: "empty" });
  });

  it("sanitises names and forces the detected extension", () => {
    expect(sanitizeFileName("Hymn sheet (Oct) ✝.exe", "pdf")).toBe("Hymn sheet Oct.pdf");
    expect(sanitizeFileName("../../etc/passwd", "pdf")).toBe("passwd.pdf");
    expect(sanitizeFileName("C:\\Users\\me\\hymns.pdf", "pdf")).toBe("hymns.pdf");
    expect(sanitizeFileName("Réunion.docx", "docx")).toBe("Reunion.docx");
    expect(sanitizeFileName("", "png")).toBe("file.png");
  });

  it("formats sizes", () => {
    expect(formatBytes(1_258_291)).toBe("1.2 MB");
    expect(formatBytes(348_160)).toBe("340 KB");
    expect(formatBytes(10)).toBe("1 KB");
  });
});
