// The site's icons, rendered from the mark in utils/logo.ts: favicon.ico (the 16 px drawing, and 32 and
// 48 px from the full one), apple-icon.png (180 px) for iPhone home screens, and the web app
// manifest's icons (public/icon-192.png, icon-512.png; app/manifest.ts). The home-screen icons are a
// plain square (the phone rounds or masks the corners itself; the line runs off the edges anyway,
// and the shuttle stays inside the circle an Android mask keeps). There's no SVG icon: browsers
// would draw it at 16 px too, instead of the drawing made for that size.
// Run after changing the mark: pnpm --filter web make-icons
import { writeFileSync } from "node:fs";
import sharp from "sharp";
import { MARK, MARK_16, markSvg } from "../utils/logo";

const dir = new URL("..", import.meta.url).pathname;
const png = (svg: string, from: number, size: number) => sharp(Buffer.from(svg), { density: (72 * size) / from }).resize(size, size).png().toBuffer();

// An .ico holding PNGs: a 6-byte header, a 16-byte entry per image, then the images
function ico(images: { size: number; data: Buffer }[]) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const at = 6 + 16 * i;
    header.writeUInt8(size % 256, at); // width and height (0 means 256)
    header.writeUInt8(size % 256, at + 1);
    header.writeUInt16LE(1, at + 4); // colour planes
    header.writeUInt16LE(32, at + 6); // bits per pixel
    header.writeUInt32LE(data.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((i) => i.data)]);
}

const full = markSvg(MARK);
const square = markSvg(MARK, { rounded: false });
writeFileSync(
  `${dir}app/favicon.ico`,
  ico([
    { size: 16, data: await png(markSvg(MARK_16), 16, 16) },
    { size: 32, data: await png(full, 32, 32) },
    { size: 48, data: await png(full, 32, 48) },
  ]),
);
writeFileSync(`${dir}app/apple-icon.png`, await png(square, 32, 180));
for (const size of [192, 512]) writeFileSync(`${dir}public/icon-${size}.png`, await png(square, 32, size));
console.log("Wrote app/favicon.ico, app/apple-icon.png, public/icon-192.png and public/icon-512.png");
