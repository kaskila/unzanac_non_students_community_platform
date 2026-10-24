// URL slugs for announcements, events and committees: lowercase ASCII words joined by hyphens.

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_LENGTH = 60;

export function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // accents: "Ré" → "Re"
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_LENGTH)
    .replace(/-+$/g, "");
  return slug || "item";
}

/** First free slug: "youth-day", then "youth-day-2", "youth-day-3", … */
export async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  const root = slugify(base);
  if (!(await exists(root))) return root;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${root.slice(0, MAX_LENGTH - String(n).length - 1)}-${n}`;
    if (!(await exists(candidate))) return candidate;
  }
  throw new Error("No free slug");
}
