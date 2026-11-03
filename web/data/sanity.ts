// Club content: short name, full name, region, website, NBF id, logo and home hall, and the halls. From
// Sanity once it is set up (NEXT_PUBLIC_SANITY_PROJECT_ID), else from content/clubs.json (exported
// from the old Craft site, also the source for importing into Sanity: scripts/import-clubs.mts),
// which has no halls.
import { cacheLife, cacheTag } from "next/cache";
import clubsJson from "@/content/clubs.json";
import type { ClubEntry, Venue } from "@/types";

const fromJson = (): ClubEntry[] =>
  (clubsJson as Omit<ClubEntry, "homeVenue">[]).map((c) => ({ ...c, logo: c.logo ? `/club-logos/${encodeURIComponent(c.logo)}` : null, homeVenue: null }));

interface SanityLogo {
  url: string;
  width: number;
  height: number;
  /** The fraction cut off each side (scripts/trim-logos.mts, or set by hand in the Studio) */
  crop: { left: number; top: number; right: number; bottom: number } | null;
}

/** A logo's URL, cropped (rect=left,top,width,height in pixels) when it has a crop; Sanity's image servers do the cropping */
function logoUrl(logo: SanityLogo | null): string | null {
  if (!logo) return null;
  const c = logo.crop;
  if (!c || !logo.width || !logo.height) return logo.url;
  const left = Math.round(c.left * logo.width);
  const top = Math.round(c.top * logo.height);
  const width = Math.round((1 - c.left - c.right) * logo.width);
  const height = Math.round((1 - c.top - c.bottom) * logo.height);
  return `${logo.url}?rect=${left},${top},${width},${height}`;
}

// A hall's fields, in the club query and the halls' own
const VENUE_FIELDS = "name, aliases, streetAddress, postalCode, town";

/** A GROQ query's result from the Sanity project's CDN */
async function query<T>(projectId: string, groq: string): Promise<T> {
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
  const url = `https://${projectId}.apicdn.sanity.io/v2025-02-19/data/query/${dataset}?query=${encodeURIComponent(groq)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status}`);
  return (await res.json()).result as T;
}

async function fromSanity(projectId: string): Promise<ClubEntry[]> {
  const result = await query<(Omit<ClubEntry, "logo" | "homeVenue"> & { logo: SanityLogo | null; homeVenue?: Venue | null })[]>(
    projectId,
    `*[_type == "club"] | order(title asc) { title, "slug": slug.current, fullName, region, website, nbfClubId, "logo": select(defined(logo.asset) => { "url": logo.asset->url, "width": logo.asset->metadata.dimensions.width, "height": logo.asset->metadata.dimensions.height, "crop": logo.crop }), "homeVenue": homeVenue->{ ${VENUE_FIELDS} } }`,
  );
  return result.map((c) => ({ ...c, logo: logoUrl(c.logo), homeVenue: c.homeVenue ?? null }));
}

/** Every club entry, by title */
export async function getClubEntries(): Promise<ClubEntry[]> {
  "use cache";
  cacheTag("sanity");
  cacheLife("days");
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  return projectId ? fromSanity(projectId) : fromJson();
}

/** Every hall (none without Sanity) */
export async function getVenues(): Promise<Venue[]> {
  "use cache";
  cacheTag("sanity");
  cacheLife("days");
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  return projectId ? query<Venue[]>(projectId, `*[_type == "venue"] | order(name asc) { ${VENUE_FIELDS} }`) : [];
}

/** Club entries keyed by short name (the name the ratings use) */
export async function getClubMap(): Promise<Record<string, ClubEntry>> {
  return Object.fromEntries((await getClubEntries()).map((c) => [c.title, c]));
}

export async function getClubBySlug(slug: string): Promise<ClubEntry | null> {
  return (await getClubEntries()).find((c) => c.slug === slug) ?? null;
}
