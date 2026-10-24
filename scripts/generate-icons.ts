// Generates app icons and the header emblem from the source emblem in docs/brand/.
// Run with `npm run icons` after replacing the source (ideally with the official SVG).
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const SOURCE = "docs/brand/nac-emblem-azure.png";

async function main() {
  const source = sharp(SOURCE);
  const { width = 0, height = 0 } = await source.metadata();
  const { data } = await source.clone().extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
  const background = { r: data[0], g: data[1], b: data[2], alpha: 1 };

  // Pad to a square on the emblem's own Azure background.
  const side = Math.max(width, height);
  const square = await sharp(SOURCE)
    .extend({
      left: Math.floor((side - width) / 2),
      right: Math.ceil((side - width) / 2),
      top: Math.floor((side - height) / 2),
      bottom: Math.ceil((side - height) / 2),
      background,
    })
    .png()
    .toBuffer();

  await mkdir("public/icons", { recursive: true });
  await mkdir("public/brand", { recursive: true });

  const outputs: [string, number][] = [
    ["src/app/icon.png", 48],
    ["src/app/apple-icon.png", 180],
    ["public/icons/icon-192.png", 192],
    ["public/icons/icon-512.png", 512],
  ];
  for (const [file, size] of outputs) {
    await sharp(square).resize(size, size).png({ compressionLevel: 9, palette: true }).toFile(file);
  }

  // Maskable icon: emblem inside the central 80% safe zone.
  const inner = Math.round(512 * 0.8);
  await sharp({ create: { width: 512, height: 512, channels: 4, background } })
    .composite([{ input: await sharp(square).resize(inner, inner).toBuffer(), gravity: "centre" }])
    .png({ compressionLevel: 9, palette: true })
    .toFile("public/icons/maskable-512.png");

  // Header emblem: shown at 40px, stored at 2x for sharp screens.
  await sharp(square).resize(80, 80).webp({ quality: 80 }).toFile("public/brand/emblem-80.webp");

  console.log(`Generated icons from ${SOURCE} (${width}x${height}). Background rgb(${background.r}, ${background.g}, ${background.b}).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
