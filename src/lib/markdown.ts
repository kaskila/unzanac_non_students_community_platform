// Limited Markdown for announcements, event details, the visit page and the privacy notice
// (docs/PLAN.md §3): paragraphs, **bold**, *italic*, [links](https://…), "- " and "1. " lists.
// Rendered on the server. Safety comes from escaping ALL HTML first, then adding only the tags
// below; links are limited to http(s), mailto, tel and site-relative paths.

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

const SAFE_URL = /^(https?:\/\/|mailto:|tel:|\/(?!\/))/i;

/** Inline formatting on text that has already been HTML-escaped. */
function inline(escaped: string): string {
  return escaped
    .replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (match, text: string, url: string) =>
      SAFE_URL.test(url) ? `<a href="${url}">${text}</a>` : match,
    )
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, "$1<em>$2</em>")
    .replace(/(^|[^_\w])_([^_\n]+)_(?!\w)/g, "$1<em>$2</em>");
}

type Block = { kind: "p" | "ul" | "ol"; lines: string[] };

function blocks(source: string): Block[] {
  const result: Block[] = [];
  let current: Block | null = null;
  for (const raw of source.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) {
      current = null;
      continue;
    }
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    const kind = bullet ? "ul" : numbered ? "ol" : "p";
    const text = bullet?.[1] ?? numbered?.[1] ?? line;
    if (!current || current.kind !== kind) {
      current = { kind, lines: [] };
      result.push(current);
    }
    current.lines.push(text);
  }
  return result;
}

/** Render limited Markdown to safe HTML. */
export function renderMarkdown(source: string): string {
  return blocks(source)
    .map((block) => {
      const lines = block.lines.map((l) => inline(escapeHtml(l)));
      if (block.kind === "p") return `<p>${lines.join("<br>")}</p>`;
      return `<${block.kind}>${lines.map((l) => `<li>${l}</li>`).join("")}</${block.kind}>`;
    })
    .join("\n");
}

/** Plain text without Markdown syntax, for share text, excerpts and calendar descriptions. */
export function markdownToPlain(source: string): string {
  return blocks(source)
    .map((block) =>
      block.lines
        .map((line) =>
          line
            .replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, "$1 ($2)")
            .replace(/\*\*([^*\n]+)\*\*/g, "$1")
            .replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, "$1$2")
            .replace(/(^|[^_\w])_([^_\n]+)_(?!\w)/g, "$1$2"),
        )
        .map((line) => (block.kind === "p" ? line : `• ${line}`))
        .join("\n"),
    )
    .join("\n\n");
}

/** First `max` characters of the plain text, cut at a word boundary. */
export function excerpt(source: string, max = 160): string {
  const plain = markdownToPlain(source).replace(/\s+/g, " ").trim();
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.5 ? cut.slice(0, space) : cut).replace(/[\s,.;:]+$/, "")}…`;
}
