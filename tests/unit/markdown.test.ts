import { describe, expect, it } from "vitest";
import { excerpt, markdownToPlain, renderMarkdown } from "@/lib/markdown";
import { shareText, whatsAppChatUrl, whatsAppShareUrl } from "@/lib/share-text";

describe("renderMarkdown", () => {
  it("renders paragraphs, emphasis, lists and line breaks", () => {
    expect(renderMarkdown("Hello **all** and *you*\nsecond line\n\n- one\n- two\n\n1. first")).toBe(
      "<p>Hello <strong>all</strong> and <em>you</em><br>second line</p>\n<ul><li>one</li><li>two</li></ul>\n<ol><li>first</li></ol>",
    );
  });

  it("escapes all HTML", () => {
    expect(renderMarkdown('<script>alert(1)</script> <img src=x onerror="y">')).toBe(
      "<p>&lt;script&gt;alert(1)&lt;/script&gt; &lt;img src=x onerror=&quot;y&quot;&gt;</p>",
    );
  });

  it("allows only safe link targets", () => {
    expect(renderMarkdown("[site](https://example.org/a?b=1&c=2)")).toBe(
      '<p><a href="https://example.org/a?b=1&amp;c=2">site</a></p>',
    );
    expect(renderMarkdown("[visit](/visit) [call](tel:+260971234567)")).toContain('<a href="/visit">visit</a>');
    expect(renderMarkdown("[x](javascript:alert(1))")).not.toContain("<a");
    expect(renderMarkdown("[x](//evil.example)")).not.toContain("<a");
    expect(renderMarkdown('[x](https://a.org/"onmouseover="y)')).not.toContain('"onmouseover');
  });

  it("leaves snake_case and lone asterisks alone", () => {
    expect(renderMarkdown("file_name_here 2 * 3")).toBe("<p>file_name_here 2 * 3</p>");
  });
});

describe("plain text", () => {
  it("strips Markdown and keeps link targets", () => {
    expect(markdownToPlain("**Youth day** at [church](https://e.org)\n\n- tea")).toBe(
      "Youth day at church (https://e.org)\n\n• tea",
    );
  });

  it("cuts excerpts at a word boundary", () => {
    expect(excerpt("one two three four five", 12)).toBe("one two…");
    expect(excerpt("short", 12)).toBe("short");
  });
});

describe("share text", () => {
  it("builds WhatsApp text with title, body and link", () => {
    const text = shareText({
      title: "Youth day",
      body: "Bring **food**",
      url: "https://e.org/a/youth-day",
      extra: "Sat 24 Oct",
    });
    expect(text).toBe("*Youth day*\n\nSat 24 Oct\n\nBring food\n\nhttps://e.org/a/youth-day");
    expect(whatsAppShareUrl("a b&c")).toBe("https://wa.me/?text=a%20b%26c");
    expect(whatsAppChatUrl("+260971234567")).toBe("https://wa.me/260971234567");
  });
});
