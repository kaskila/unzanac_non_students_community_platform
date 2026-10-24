// Site-wide constants. Editable content (contacts, social links, …) lives in the database
// (src/lib/site-content.ts) and is managed under Admin → Site content.

export const BRAND_THEME_COLOR = "#5793c9";

/** Absolute public URL for share text, .ics files and links sent on WhatsApp. */
export function siteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}
