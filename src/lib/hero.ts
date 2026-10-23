// Home page photo sizes. The browser picks one with srcset: ~480px wide on most phones.
export const HERO_WIDTHS = [480, 960, 1440] as const;
export type HeroWidth = (typeof HERO_WIDTHS)[number];

/** Storage key of one resized copy. `version` changes on every upload, so URLs can be cached forever. */
export function heroImageKey(slideId: string, version: string, width: number): string {
  return `hero/${slideId}/${version}-${width}.webp`;
}

/** Public URL of one resized copy, served by /images/hero/[id]/[file]. */
export function heroImageUrl(slideId: string, version: string, width: number): string {
  return `/images/hero/${slideId}/${version}-${width}.webp`;
}

export function heroSrcSet(slideId: string, version: string): string {
  return HERO_WIDTHS.map((w) => `${heroImageUrl(slideId, version, w)} ${w}w`).join(", ");
}
