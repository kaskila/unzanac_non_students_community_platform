// Builds the home page's built-in banner photos: assets/hero-photos/<name>.jpg → public/hero/<name>-<width>.webp
// Run with `npm run hero` after adding or replacing a photo (and list it in DEFAULT_HERO_PHOTOS).
import { mkdir, stat } from "node:fs/promises";
import sharp from "sharp";
import { DEFAULT_HERO_PHOTOS, HERO_ASPECT, HERO_QUALITY, HERO_WIDTHS } from "../src/lib/hero";

async function main() {
  await mkdir("public/hero", { recursive: true });
  for (const photo of DEFAULT_HERO_PHOTOS) {
    const source = `assets/hero-photos/${photo.name}.jpg`;
    const { width = 0, height = 0 } = await sharp(source).metadata();
    // Crop to the banner shape around focusY (group photos: faces sit above the middle).
    const cropHeight = Math.min(height, Math.round(width * HERO_ASPECT));
    const top = Math.round(Math.min(height - cropHeight, Math.max(0, photo.focusY * height - cropHeight / 2)));
    for (const w of HERO_WIDTHS) {
      const out = `public/hero/${photo.name}-${w}.webp`;
      await sharp(source)
        .rotate()
        .extract({ left: 0, top, width, height: cropHeight })
        .resize({ width: w, height: Math.round(w * HERO_ASPECT) })
        .webp({ quality: HERO_QUALITY })
        .toFile(out);
      console.log(`${out}  ${Math.round((await stat(out)).size / 1024)} KB`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
