// Club content: short name, full name, region, website, NBF id and logo. From Sanity once it is set
// up (NEXT_PUBLIC_SANITY_PROJECT_ID), else from content/clubs.json (exported from the old Craft
// site, also the source for importing into Sanity: scripts/import-clubs.mts).
import { cacheLife, cacheTag } from "next/cache";
import clubsJson from "@/content/clubs.json";
import type { ClubEntry } from "./types";

const fromJson = (): ClubEntry[] =>
  (clubsJson as ClubEntry[]).map((c) => ({ ...c, logo: c.logo ? `/club-logos/${encodeURIComponent(c.logo)}` : null }));

async function fromSanity(projectId: string): Promise<ClubEntry[]> {
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
  const query = `*[_type == "club"] | order(title asc) { title, "slug": slug.current, fullName, region, website, nbfClubId, "logo": logo.asset->url }`;
  const url = `https://${projectId}.apicdn.sanity.io/v2025-02-19/data/query/${dataset}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status}`);
  return (await res.json()).result as ClubEntry[];
}

/** Every club entry, by title */
export async function getClubEntries(): Promise<ClubEntry[]> {
  "use cache";
  cacheTag("sanity");
  cacheLife("days");
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  return projectId ? fromSanity(projectId) : fromJson();
}

/** Club entries keyed by short name (the name the ratings use) */
export async function getClubMap(): Promise<Record<string, ClubEntry>> {
  return Object.fromEntries((await getClubEntries()).map((c) => [c.title, c]));
}

export async function getClubBySlug(slug: string): Promise<ClubEntry | null> {
  return (await getClubEntries()).find((c) => c.slug === slug) ?? null;
}
