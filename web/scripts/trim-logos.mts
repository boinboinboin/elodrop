// Crop the transparent margins off the club logos in Sanity: for each logo, the box around its
// pixels that aren't (almost) transparent is saved as the image's crop, which the site applies
// (data/sanity.ts, `rect` in the image URL; Sanity's image servers do the cropping). Logos that already
// have a crop are left alone (set or adjusted by hand in the Studio), unless --force; logos without
// transparency (JPEG, or no transparent margin) get no crop.
// Usage: pnpm --filter web trim-logos [--force] [--dry-run]
//        (reads NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_WRITE_TOKEN from .env.local)
import { createClient } from "@sanity/client";
import sharp from "sharp";

const force = process.argv.includes("--force");
const dryRun = process.argv.includes("--dry-run");
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
// A dry run only reads (the dataset is public), so it needs no token
const token = dryRun ? undefined : process.env.SANITY_WRITE_TOKEN;
if (!projectId || (!dryRun && !token)) throw new Error("Set NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_WRITE_TOKEN (in web/.env.local)");
const client = createClient({ projectId, dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production", token, apiVersion: "2025-02-19", useCdn: false });

// A pixel counts as part of the logo from this opacity (0-255), so faint anti-aliasing haze and
// stray near-transparent pixels in the margin don't keep it
const ALPHA = 8;

/** The box around the pixels that aren't (almost) transparent, or null if there's no margin to crop */
async function bounds(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}`);
  const image = sharp(Buffer.from(await res.arrayBuffer()));
  const { hasAlpha } = await image.metadata();
  if (!hasAlpha) return null;
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let [left, top, right, bottom] = [width, height, -1, -1];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * channels + channels - 1] < ALPHA) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  if (right < 0) return null; // fully transparent
  if (left === 0 && top === 0 && right === width - 1 && bottom === height - 1) return null; // no margin
  return { width, height, left, top, right, bottom };
}

const clubs = await client.fetch<{ _id: string; title: string; logo?: { crop?: object; asset?: { url: string } } }[]>(
  `*[_type == "club" && defined(logo.asset)] | order(title asc) { _id, title, logo { crop, asset->{ url } } }`,
);
let cropped = 0, kept = 0, none = 0;
for (const c of clubs) {
  if (c.logo?.crop && !force) {
    kept++;
    continue;
  }
  try {
    const b = await bounds(c.logo!.asset!.url);
    if (!b) {
      none++;
      console.log(`${c.title}: no transparent margin`);
      continue;
    }
    // Sanity's crop: the fraction cut off each side
    const crop = { _type: "sanity.imageCrop", left: b.left / b.width, top: b.top / b.height, right: (b.width - 1 - b.right) / b.width, bottom: (b.height - 1 - b.bottom) / b.height };
    const kept = `${b.right - b.left + 1}×${b.bottom - b.top + 1} of ${b.width}×${b.height}`;
    console.log(`${c.title}: ${kept}${dryRun ? " (dry run)" : ""}`);
    if (!dryRun) await client.patch(c._id).set({ "logo.crop": crop }).commit();
    cropped++;
  } catch (err) {
    console.error(`${c.title}: FAILED ${(err as Error).message}`);
  }
}
console.log(`${clubs.length} logos: ${cropped} cropped, ${kept} already had a crop, ${none} without a transparent margin`);
