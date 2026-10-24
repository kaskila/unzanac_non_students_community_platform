// Builds the home page's built-in images (run `npm run hero` after replacing one):
//   assets/hero-photos/<name>.jpg → public/hero/<name>-<width>.webp   (slider banners, DEFAULT_HERO_PHOTOS)
//   assets/people/rector.png      → public/hero/rector-<width>.webp   (welcome section, transparent background)
import { mkdir, stat } from "node:fs/promises";
import sharp, { type Sharp } from "sharp";
import { DEFAULT_HERO_PHOTOS, HERO_ASPECT, HERO_AVIF_QUALITY, HERO_QUALITY, HERO_WIDTHS, RECTOR_WIDTHS } from "../src/lib/hero";

async function main() {
  await mkdir("public/hero", { recursive: true });
  for (const photo of DEFAULT_HERO_PHOTOS) {
    const source = `assets/hero-photos/${photo.name}.jpg`;
    const { width = 0, height = 0 } = await sharp(source).metadata();
    // Crop to the banner shape around focusY (group photos: faces sit above the middle).
    const cropHeight = Math.min(height, Math.round(width * HERO_ASPECT));
    const top = Math.round(Math.min(height - cropHeight, Math.max(0, photo.focusY * height - cropHeight / 2)));
    for (const w of HERO_WIDTHS) {
      const banner = () =>
        sharp(source)
          .rotate()
          .extract({ left: 0, top, width, height: cropHeight })
          .resize({ width: w, height: Math.round(w * HERO_ASPECT) });
      for (const [format, write] of [
        ["webp", (s: Sharp) => s.webp({ quality: HERO_QUALITY })],
        ["avif", (s: Sharp) => s.avif({ quality: HERO_AVIF_QUALITY, effort: 6 })],
      ] as const) {
        const out = `public/hero/${photo.name}-${w}.${format}`;
        await write(banner()).toFile(out);
        console.log(`${out}  ${Math.round((await stat(out)).size / 1024)} KB`);
      }
    }
  }
}

/** The Rector's cut-out portrait for the welcome section: keeps transparency, no cropping. */
async function rector() {
  for (const w of RECTOR_WIDTHS) {
    const portrait = () => sharp("assets/people/rector.png").resize({ width: w });
    for (const [out, write] of [
      [`public/hero/rector-${w}.webp`, portrait().webp({ quality: 60, alphaQuality: 70 })],
      [`public/hero/rector-${w}.avif`, portrait().avif({ quality: HERO_AVIF_QUALITY, effort: 6 })],
    ] as const) {
      await write.toFile(out);
      console.log(`${out}  ${Math.round((await stat(out)).size / 1024)} KB`);
    }
  }
}

main()
  .then(rector)
  .catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
