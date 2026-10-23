// Home page photo sizes. The browser picks one with srcset: ~480px wide on most phones.
export const HERO_WIDTHS = [480, 960, 1440] as const;
/** Banner shape (height / width), like the mockup. */
export const HERO_ASPECT = 7 / 16;
export const HERO_QUALITY = 60;
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

// ── Built-in photos (used until admins upload their own under Admin → Home photos) ──
// Originals live in assets/hero-photos/ (not served); `npm run hero` writes the banners to public/hero/.

export type DefaultHeroPhoto = { name: string; alt: string; /** crop focus, 0 = top, 1 = bottom */ focusY: number };

export const DEFAULT_HERO_PHOTOS: readonly DefaultHeroPhoto[] = [
  { name: "1-congregation-steps", alt: "Members of the UNZA congregation standing together on the church steps", focusY: 0.35 },
  { name: "2-choir-orchestra", alt: "The UNZANAC choir and orchestra performing in the church", focusY: 0.5 },
  { name: "3-sisters-group", alt: "A large group of sisters of the congregation in white blouses, gathered in front of a building", focusY: 0.55 },
  { name: "4-youth-gathering", alt: "Young people of the congregation smiling together at an outdoor youth gathering", focusY: 0.42 },
];

export function defaultHeroUrl(name: string, width: number): string {
  return `/hero/${name}-${width}.webp`;
}

export type CarouselSlide = { id: string; alt: string; src: string; srcSet: string };

export function defaultHeroSlides(): CarouselSlide[] {
  return DEFAULT_HERO_PHOTOS.map((p) => ({
    id: p.name,
    alt: p.alt,
    src: defaultHeroUrl(p.name, 960),
    srcSet: HERO_WIDTHS.map((w) => `${defaultHeroUrl(p.name, w)} ${w}w`).join(", "),
  }));
}
