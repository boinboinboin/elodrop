// Club content: short name, full name, region, website, NBF id and logo; the clubs' home halls; the halls; and the
// tournaments checked in the Studio. From Sanity once it is set up (NEXT_PUBLIC_SANITY_PROJECT_ID), else the clubs from
// content/clubs.json (exported from the old Craft site, also the source for importing into Sanity:
// scripts/import-clubs.mts), which has no halls or tournaments.
//
// Cache tags: every entry has `sanity` (all of it) and the tags of what it reads, so a change in the Studio refreshes
// only the pages using it (app/api/revalidate picks the tag from the Sanity webhook's changed document). Clubs (names,
// logos) are on nearly every page; halls (with the clubs' home halls) only on tournament and team match pages; a
// tournament's approval only on its own pages. Every ISR page a tag reaches is written again when next visited, so the
// clubs', the badges' and the halls' tags are left for the nightly run, which refreshes each only when one of them has
// changed (pipeline/sanity-revisions.mjs), not the webhook. A written page (About, Help & support) is on its own page in
// each language, so the webhook refreshes it at once. Cached until a tag is revalidated ("max"), not by time.
import { cacheLife, cacheTag } from "next/cache";
import { draftMode } from "next/headers";
import clubsJson from "@/content/clubs.json";
import type { Language } from "@/messages/i18n";
import type { Badge, ClubEntry, PageBlock, Venue, WrittenPage } from "@/types";
import { sanityImageUrl } from "@/utils/sanityImage";
import { BADGES_TAG, CLUBS_TAG, PAGES_TAG, pageTag, SANITY_TAG, tournamentTag, TOURNAMENTS_TAG, VENUES_TAG, WRITTEN_PAGES, type WrittenPageKey } from "./sanityTags";

const fromJson = (): ClubEntry[] => (clubsJson as ClubEntry[]).map((c) => ({ ...c, logo: c.logo ? `/club-logos/${encodeURIComponent(c.logo)}` : null }));

interface SanityLogo {
  url: string;
  width: number;
  height: number;
  /** The fraction cut off each side (scripts/trim-logos.mts, or set by hand in the Studio) */
  crop: { left: number; top: number; right: number; bottom: number } | null;
  /** Inverted in the dark theme (the Studio's "Invert in dark mode", sanity/schemas/invertInDark.ts) */
  invert: boolean | null;
}

/** `{ [key]: true }` for an image inverted in the dark theme, else nothing, so pages carry it only for those */
const inverted = <K extends string>(image: SanityLogo | null, key: K) => (image?.invert ? ({ [key]: true } as Record<K, true>) : {});

/** A logo's URL, cropped (rect=left,top,width,height in pixels) when it has a crop; Sanity's image servers do the cropping */
const logoUrl = (logo: SanityLogo | null): string | null => (logo ? sanityImageUrl(logo) : null);

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

/**
 * A GROQ query's result from the Sanity project's CDN, its text cleaned; `raw`: as it is (rich text, whose spaces
 * between bold and plain parts are part of the text). `drafts`: the unpublished drafts over the published documents,
 * from the API itself with the read token (the Studio's preview, in draft mode: app/api/draft-mode)
 */
async function query<T>(projectId: string, groq: string, { raw = false, drafts = false } = {}): Promise<T> {
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
  const token = drafts ? process.env.SANITY_READ_TOKEN : undefined;
  const url = token
    ? `https://${projectId}.api.sanity.io/v2025-02-19/data/query/${dataset}?perspective=drafts&query=${encodeURIComponent(groq)}`
    : `https://${projectId}.apicdn.sanity.io/v2025-02-19/data/query/${dataset}?query=${encodeURIComponent(groq)}`;
  const res = await fetch(url, token ? { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" } : undefined);
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status}`);
  const result = (await res.json()).result;
  return (raw ? result : clean(result)) as T;
}

async function fromSanity(projectId: string): Promise<ClubEntry[]> {
  const result = await query<(Omit<ClubEntry, "logo"> & { logo: SanityLogo | null })[]>(
    projectId,
    `*[_type == "club"] | order(title asc) { title, "slug": slug.current, fullName, region, website, nbfClubId, "logo": select(defined(logo.asset) => { "url": logo.asset->url, "width": logo.asset->metadata.dimensions.width, "height": logo.asset->metadata.dimensions.height, "crop": logo.crop, "invert": logo.invertInDark }) }`,
  );
  return result.map((c) => ({ ...c, logo: logoUrl(c.logo), ...inverted(c.logo, "logoInvert") }));
}

/** Every club entry, by title (without their home halls: getClubHomeVenues, so a home hall added doesn't refresh every page) */
export async function getClubEntries(): Promise<ClubEntry[]> {
  "use cache";
  cacheTag(SANITY_TAG, CLUBS_TAG);
  cacheLife("max");
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
  cacheLife("max");
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
  cacheLife("max");
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
  cacheLife("max");
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
  cacheLife("max");
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  if (!projectId) return [];
  type Text = { title: string | null; titleEn: string | null; description: string | null; descriptionEn: string | null };
  type Row = Text & { id: string; key: string | null; about: string | null; aboutEn: string | null; art: SanityLogo | null; players: number[] | null; listed: boolean; levels: (Text & { level: number | null; art: SanityLogo | null })[] | null };
  const art = (field: string) => `select(defined(${field}.asset) => { "url": ${field}.asset->url, "width": ${field}.asset->metadata.dimensions.width, "height": ${field}.asset->metadata.dimensions.height, "crop": ${field}.crop, "invert": ${field}.invertInDark })`;
  const result = await query<Row[]>(
    projectId,
    `*[_type == "badge" && !(_id in path("drafts.**"))] | order(title asc) { "id": _id, key, "listed": listed != false, title, titleEn, description, descriptionEn, about, aboutEn, players, "art": ${art("art")}, "levels": levels[]{ level, title, titleEn, description, descriptionEn, "art": ${art("art")} } }`,
  );
  // The page's language, else the other's
  const pick = (no: string | null, en: string | null) => (lang === "en" ? en || no : no || en) ?? null;
  return result.flatMap((b) => {
    const title = pick(b.title, b.titleEn);
    if (!title) return [];
    const levels = (b.levels ?? [])
      .filter((l): l is typeof l & { level: number } => typeof l.level === "number")
      .map((l) => ({ level: l.level, title: pick(l.title, l.titleEn), description: pick(l.description, l.descriptionEn), art: logoUrl(l.art), ...inverted(l.art, "artInvert") }))
      .sort((x, y) => x.level - y.level);
    return [{ id: b.id, key: b.key ?? null, title, description: pick(b.description, b.descriptionEn), about: pick(b.about, b.aboutEn), art: logoUrl(b.art), ...inverted(b.art, "artInvert"), players: b.players ?? [], listed: b.listed, levels }];
  });
}

/** The images in a written page: address, size, crop and description */
const pageImage = (field: string) => `${field}{ alt, crop, "url": asset->url, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height }`;

/**
 * A page written in the Studio (sanity/schemas/page.ts: "about" or "support") in the page's language, else the
 * Norwegian one; null when neither is published (or without Sanity). Refreshed when either is published (the Sanity
 * webhook, app/api/revalidate: pageTag)
 */
export async function getPage(key: string, lang: Language): Promise<WrittenPage | null> {
  "use cache";
  cacheTag(SANITY_TAG, PAGES_TAG, pageTag(key));
  cacheLife("max");
  // The Studio's preview (draft mode, app/api/draft-mode): the drafts, read fresh (draft mode skips this cache for
  // that browser alone; everyone else gets the published page from the cache)
  const { isEnabled: drafts } = await draftMode();
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  if (!projectId || !/^[a-z]+$/.test(key)) return null;
  type Row ={ id: string; title: string | null; lead: string | null; description: string | null; updatedAt: string; content: PageBlock[] | null };
  const rows = await query<Row[]>(
    projectId,
    `*[_id in ["page-${key}-${lang}", "page-${key}-nb"]]{ "id": _id, title, lead, description, "updatedAt": _updatedAt, "content": content[]{ ..., _type == "figure" => { "image": ${pageImage("image")} }, _type == "person" => { "photo": ${pageImage("photo")} } } }`,
    { raw: true, drafts },
  );
  const row = rows.find((r) => r.id === `page-${key}-${lang}` && r.title) ?? rows.find((r) => r.id === `page-${key}-nb` && r.title);
  if (!row?.title) return null;
  // The plain text cleaned as everywhere (clean), the rich text as written
  const text = (value: string | null) => (clean(value) as string | null) ?? null;
  return { lang: row.id.endsWith("-en") ? "en" : "nb", title: text(row.title)!, lead: text(row.lead), description: text(row.description), updatedAt: row.updatedAt, content: row.content ?? [] };
}

/**
 * Which written pages are published (in either language: the English site shows the Norwegian one), for the links to
 * them (app/api/pages, loaded in the browser by the menu and the footer, so the site's pages don't depend on it) and
 * the sitemap. Refreshed with each page (pageTag); false for all without Sanity
 */
export async function getPublishedPages(): Promise<Record<WrittenPageKey, boolean>> {
  "use cache";
  cacheTag(SANITY_TAG, PAGES_TAG, ...WRITTEN_PAGES.map(pageTag));
  cacheLife("max");
  const none = Object.fromEntries(WRITTEN_PAGES.map((key) => [key, false])) as Record<WrittenPageKey, boolean>;
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  if (!projectId) return none;
  const ids = WRITTEN_PAGES.flatMap((key) => [`"page-${key}-nb"`, `"page-${key}-en"`]).join(", ");
  const published = await query<string[]>(projectId, `*[_id in [${ids}] && defined(title)]._id`);
  return Object.fromEntries(WRITTEN_PAGES.map((key) => [key, published.some((id) => id.startsWith(`page-${key}-`))])) as Record<WrittenPageKey, boolean>;
}

/** Club entries keyed by short name (the name the ratings use) */
export async function getClubMap(): Promise<Record<string, ClubEntry>> {
  return Object.fromEntries((await getClubEntries()).map((c) => [c.title, c]));
}

export async function getClubBySlug(slug: string): Promise<ClubEntry | null> {
  return (await getClubEntries()).find((c) => c.slug === slug) ?? null;
}
