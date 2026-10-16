// Import the clubs into Sanity from content/clubs.json (exported from the old Craft site) and their
// logos from public/club-logos. Existing clubs are updated (document id club-<slug>), so it can be
// run again.
// Usage: SANITY_WRITE_TOKEN=... NEXT_PUBLIC_SANITY_PROJECT_ID=... pnpm --filter web import-clubs
import { createReadStream, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@sanity/client";
import clubs from "../content/clubs.json" with { type: "json" };

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const token = process.env.SANITY_WRITE_TOKEN;
if (!projectId || !token) throw new Error("Set NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_WRITE_TOKEN");
const client = createClient({ projectId, dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production", token, apiVersion: "2025-02-19", useCdn: false });

const idFor = (slug: string) => `club-${slug.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9-]+/g, "-")}`;

let logos = 0;
for (const c of clubs as { title: string; slug: string; fullName: string | null; region: string | null; website: string | null; nbfClubId: number | null; logo: string | null }[]) {
  let logo;
  const file = c.logo ? join(import.meta.dirname, "../public/club-logos", c.logo) : null;
  if (file && existsSync(file)) {
    const asset = await client.assets.upload("image", createReadStream(file), { filename: c.logo! });
    logo = { _type: "image", asset: { _type: "reference", _ref: asset._id } };
    logos++;
  }
  await client.createOrReplace({
    _id: idFor(c.slug),
    _type: "club",
    title: c.title,
    slug: { _type: "slug", current: c.slug },
    fullName: c.fullName ?? undefined,
    region: c.region ?? undefined,
    website: c.website ?? undefined,
    nbfClubId: c.nbfClubId ?? undefined,
    ...(logo ? { logo } : {}),
  });
}
console.log(`Imported ${clubs.length} clubs (${logos} logos).`);
