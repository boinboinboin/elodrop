// Find the club logos and badge art that would vanish in the dark theme (Lights out, app/globals.css): mostly black
// or dark grey on a transparent background. Lists every image with its share of dark and of colourful pixels and what
// it suggests: a mostly dark, colourless image inverted (white); a colourful one (a red badge) is better left as it is,
// as inverting changes its colours. With --write it ticks "Invert in dark mode" (invertInDark) on the ones it
// suggests, or with --write --only "Bærum,Sotra,…" on exactly those (clubs' short names, badges' titles), and leaves
// the rest as they are (a box ticked or cleared by hand in the Studio stays). Images without transparency (a JPEG, a
// logo on its own background) never vanish, so they're never suggested.
// Usage: pnpm --filter web mark-dark-logos [--write [--only "name,name"]]
//        (reads NEXT_PUBLIC_SANITY_PROJECT_ID, and SANITY_WRITE_TOKEN for --write, from .env.local)
import { createClient } from "@sanity/client";
import sharp from "sharp";

const write = process.argv.includes("--write");
const onlyAt = process.argv.indexOf("--only");
const only = onlyAt > 0 ? new Set(process.argv[onlyAt + 1]?.split(",").map((name) => name.trim())) : null;
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
// Listing only reads (the dataset is public), so it needs no token
const token = write ? process.env.SANITY_WRITE_TOKEN : undefined;
if (!projectId || (write && !token)) throw new Error("Set NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_WRITE_TOKEN (in web/.env.local)");
const client = createClient({ projectId, dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production", token, apiVersion: "2025-02-19", useCdn: false });

// A pixel is part of the image from this opacity (0-255); dark when its contrast with the dark theme's cards
// (#0e0e0e) is below DARK, about where it stops showing (black, dark grey, navy)
const OPAQUE = 128;
const DARK = 2;
/** WCAG relative luminance of an sRGB colour (0-255 channels) */
const luminance = (r: number, g: number, b: number) => {
  const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const CARD = luminance(14, 14, 14);
// Suggested from this share of dark pixels (of the image's own), unless more than COLOURFUL of them are colourful
// (their channels more than 40 apart); from MAYBE listed to look at by hand
const SUGGEST = 0.5;
const MAYBE = 0.25;
const COLOURFUL = 0.2;

/** The shares of the image's (not transparent) pixels that are dark and colourful, or null if it has no transparency */
async function shares(url: string): Promise<{ dark: number; colourful: number } | null> {
  const res = await fetch(`${url}?w=256&h=256&fit=max&fm=png`);
  if (!res.ok) throw new Error(`${res.status}`);
  const { data, info } = await sharp(Buffer.from(await res.arrayBuffer())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let seen = 0, transparent = 0, dark = 0, colourful = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3] < OPAQUE) {
      transparent++;
      continue;
    }
    seen++;
    if ((luminance(data[i], data[i + 1], data[i + 2]) + 0.05) / (CARD + 0.05) < DARK) dark++;
    if (Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]) > 40) colourful++;
  }
  if (!seen || transparent / (seen + transparent) < 0.02) return null;
  return { dark: dark / seen, colourful: colourful / seen };
}

interface Image {
  /** What the list calls it */
  name: string;
  /** The club's short name or the badge's title, for --only */
  key: string;
  url: string;
  invert: boolean;
  /** Its document and the path of its invertInDark field */
  id: string;
  path: string;
}

const clubs = await client.fetch<{ _id: string; title: string; logo: { url: string; invert: boolean | null } }[]>(
  `*[_type == "club" && defined(logo.asset) && !(_id in path("drafts.**"))] | order(title asc) { _id, title, "logo": { "url": logo.asset->url, "invert": logo.invertInDark } }`,
);
type Art = { url: string; invert: boolean | null } | null;
const badges = await client.fetch<{ _id: string; title: string; art: Art; levels: { _key: string; level: number | null; art: Art }[] | null }[]>(
  `*[_type == "badge" && !(_id in path("drafts.**"))] | order(title asc) { _id, title, "art": select(defined(art.asset) => { "url": art.asset->url, "invert": art.invertInDark }), "levels": levels[]{ _key, level, "art": select(defined(art.asset) => { "url": art.asset->url, "invert": art.invertInDark }) } }`,
);
const images: Image[] = [
  ...clubs.map((c) => ({ name: `Club ${c.title}`, key: c.title, url: c.logo.url, invert: !!c.logo.invert, id: c._id, path: "logo.invertInDark" })),
  ...badges.flatMap((b) => [
    ...(b.art ? [{ name: `Badge ${b.title}`, key: b.title, url: b.art.url, invert: !!b.art.invert, id: b._id, path: "art.invertInDark" }] : []),
    ...(b.levels ?? []).flatMap((l) => (l.art ? [{ name: `Badge ${b.title}, level ${l.level ?? "?"}`, key: b.title, url: l.art.url, invert: !!l.art.invert, id: b._id, path: `levels[_key=="${l._key}"].art.invertInDark` }] : [])),
  ]),
];

let suggested = 0, ticked = 0;
for (const image of images) {
  try {
    const s = await shares(image.url);
    const suggest = !!s && s.dark >= SUGGEST && s.colourful <= COLOURFUL;
    const verdict = !s ? "no transparency" : suggest ? "INVERT" : s.dark >= MAYBE ? "maybe (look at it)" : "fine";
    const state = image.invert ? " [ticked]" : "";
    console.log(`${image.name}: ${s ? `${Math.round(s.dark * 100)}% dark, ${Math.round(s.colourful * 100)}% colourful` : "–"}, ${verdict}${state}`);
    if (suggest) suggested++;
    if (write && !image.invert && (only ? only.has(image.key) : suggest)) {
      await client.patch(image.id).set({ [image.path]: true }).commit();
      ticked++;
    }
  } catch (err) {
    console.error(`${image.name}: FAILED ${(err as Error).message}`);
  }
}
console.log(`${images.length} images: ${suggested} suggested to invert${write ? `, ${ticked} ticked now` : " (run with --write to tick them)"}`);
if (only) for (const name of only) if (!images.some((image) => image.key === name)) console.error(`--only: no club or badge called ${name}`);
