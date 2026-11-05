// Club content: short name, full name, region, website, NBF id and logo; the clubs' home halls; the halls; and the
// tournaments checked in the Studio. From Sanity once it is set up (NEXT_PUBLIC_SANITY_PROJECT_ID), else the clubs from
// content/clubs.json (exported from the old Craft site, also the source for importing into Sanity:
// scripts/import-clubs.mts), which has no halls or tournaments.
//
// Cache tags: every entry has `sanity` (all of it) and the tags of what it reads, so a change in the Studio refreshes
// only the pages using it (app/api/revalidate picks the tag from the Sanity webhook's changed document). Clubs (names,
// logos) are on nearly every page; halls (with the clubs' home halls) only on tournament and team match pages; a
// tournament's approval only on its own pages. Every ISR page a tag reaches is written again when next visited, so the
// clubs' tag is left for the full nightly run (which refreshes every page anyway), not the webhook.
import { cacheLife, cacheTag } from "next/cache";
import clubsJson from "@/content/clubs.json";
import type { Language } from "@/messages/i18n";
import type { Badge, ClubEntry, Venue } from "@/types";
import { BADGES_TAG, CLUBS_TAG, SANITY_TAG, tournamentTag, TOURNAMENTS_TAG, VENUES_TAG } from "./sanityTags";

const fromJson = (): ClubEntry[] => (clubsJson as ClubEntry[]).map((c) => ({ ...c, logo: c.logo ? `/club-logos/${encodeURIComponent(c.logo)}` : null }));

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

/**
 * A query result with its text cleaned: no spaces at the ends, single spaces between words, and
 * empty text as null (left out of lists), so a stray space typed in the Studio changes nothing (a
 * club's short name is matched exactly against the results). The Studio warns about them too
 * (sanity/schemas/spacing.ts).
 */
function clean(value: unknown): unknown {
  if (typeof value === "string") return value.replace(/\s+/g, " ").trim() || null;
  if (Array.isArray(value)) return value.map(clean).filter((v, i) => v !== null || value[i] === null);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clean(v)]));
  return value;
}

/** A GROQ query's result from the Sanity project's CDN, its text cleaned */
async function query<T>(projectId: string, groq: string): Promise<T> {
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
  const url = `https://${projectId}.apicdn.sanity.io/v2025-02-19/data/query/${dataset}?query=${encodeURIComponent(groq)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status}`);
  return clean((await res.json()).result) as T;
}

async function fromSanity(projectId: string): Promise<ClubEntry[]> {
  const result = await query<(Omit<ClubEntry, "logo"> & { logo: SanityLogo | null })[]>(
    projectId,
    `*[_type == "club"] | order(title asc) { title, "slug": slug.current, fullName, region, website, nbfClubId, "logo": select(defined(logo.asset) => { "url": logo.asset->url, "width": logo.asset->metadata.dimensions.width, "height": logo.asset->metadata.dimensions.height, "crop": logo.crop }) }`,
  );
  return result.map((c) => ({ ...c, logo: logoUrl(c.logo) }));
}

/** Every club entry, by title (without their home halls: getClubHomeVenues, so a home hall added doesn't refresh every page) */
export async function getClubEntries(): Promise<ClubEntry[]> {
  "use cache";
  cacheTag(SANITY_TAG, CLUBS_TAG);
  cacheLife("days");
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  return projectId ? fromSanity(projectId) : fromJson();
}

/**
 * Each club's home halls, by its short name, the first being its tournaments' usual hall (none without Sanity). Also the
 * single home hall (homeVenue) clubs had before, until scripts/import-venues.mts has moved it (a reference to a deleted
 * hall comes back null)
 */
export async function getClubHomeVenues(): Promise<Record<string, Venue[]>> {
  "use cache";
  cacheTag(SANITY_TAG, CLUBS_TAG, VENUES_TAG);
  cacheLife("days");
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  if (!projectId) return {};
  const result = await query<{ title: string | null; homeVenues: (Venue | null)[] | null }[]>(
    projectId,
    `*[_type == "club"]{ title, "homeVenues": coalesce(homeVenues[]->{ ${VENUE_FIELDS} }, [homeVenue->{ ${VENUE_FIELDS} }]) }`,
  );
  return Object.fromEntries(result.filter((c) => c.title).map((c) => [c.title, (c.homeVenues ?? []).filter((v): v is Venue => v !== null)]));
}

/** Every hall (none without Sanity) */
export async function getVenues(): Promise<Venue[]> {
  "use cache";
  cacheTag(SANITY_TAG, VENUES_TAG);
  cacheLife("days");
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  return projectId ? query<Venue[]>(projectId, `*[_type == "venue"] | order(name asc) { ${VENUE_FIELDS} }`) : [];
}

/** A tournament's organiser (the club's short name) and hall, as checked and approved in the Studio (sanity/schemas/tournament.ts) */
export interface TournamentPlace {
  organiser: string | null;
  venue: Venue | null;
}

/**
 * A tournament's organiser and hall, by its Cup2000 id, once approved (else null; null without Sanity). Only its own
 * pages read it, so approving one refreshes just those; also the organiser's name (a club) and the hall's address
 */
export async function getApprovedTournament(cup2000Id: number): Promise<TournamentPlace | null> {
  "use cache";
  cacheTag(SANITY_TAG, TOURNAMENTS_TAG, tournamentTag(cup2000Id), CLUBS_TAG, VENUES_TAG);
  cacheLife("days");
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  if (!projectId || !Number.isInteger(cup2000Id)) return null;
  const result = await query<TournamentPlace | null>(
    projectId,
    `*[_type == "tournament" && cup2000Id == ${cup2000Id} && approved == true][0]{ "organiser": organiser->title, "venue": venue->{ ${VENUE_FIELDS} } }`,
  );
  return result ? { organiser: result.organiser ?? null, venue: result.venue ?? null } : null;
}

/**
 * The players' badges (sanity/schemas/badge.ts): each with its rule's key (pipeline/achievements.mjs; null: given by
 * hand to `players`), its text in the page's language (else the other's) and its art, cropped as set in the Studio
 * (none without Sanity). Only the player pages read them
 */
export async function getBadges(lang: Language): Promise<Badge[]> {
  "use cache";
  cacheTag(SANITY_TAG, BADGES_TAG);
  cacheLife("days");
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  if (!projectId) return [];
  const result = await query<{ id: string; key: string | null; title: string | null; titleEn: string | null; description: string | null; descriptionEn: string | null; about: string | null; aboutEn: string | null; art: SanityLogo | null; players: number[] | null }[]>(
    projectId,
    `*[_type == "badge" && !(_id in path("drafts.**"))] | order(title asc) { "id": _id, key, title, titleEn, description, descriptionEn, about, aboutEn, players, "art": select(defined(art.asset) => { "url": art.asset->url, "width": art.asset->metadata.dimensions.width, "height": art.asset->metadata.dimensions.height, "crop": art.crop }) }`,
  );
  const en = lang === "en";
  return result.flatMap((b) => {
    const title = (en ? b.titleEn || b.title : b.title || b.titleEn) ?? null;
    if (!title) return [];
    const description = (en ? b.descriptionEn || b.description : b.description || b.descriptionEn) ?? null;
    const about = (en ? b.aboutEn || b.about : b.about || b.aboutEn) ?? null;
    return [{ id: b.id, key: b.key ?? null, title, description, about, art: logoUrl(b.art), players: b.players ?? [] }];
  });
}

/** Club entries keyed by short name (the name the ratings use) */
export async function getClubMap(): Promise<Record<string, ClubEntry>> {
  return Object.fromEntries((await getClubEntries()).map((c) => [c.title, c]));
}

export async function getClubBySlug(slug: string): Promise<ClubEntry | null> {
  return (await getClubEntries()).find((c) => c.slug === slug) ?? null;
}
