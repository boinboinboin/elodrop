// Club content: short name, full name, region, website, NBF id and logo; the clubs' home halls; the halls; and the
// tournaments checked in the Studio. From Sanity once it is set up (NEXT_PUBLIC_SANITY_PROJECT_ID), else the clubs from
// content/clubs.json (exported from the old Craft site, also the source for importing into Sanity:
// scripts/import-clubs.mts), which has no halls or tournaments.
//
// Cache tags: every entry has `sanity` (all of it) and the tags of what it reads, so a change in the Studio refreshes
// only the pages using it (app/api/revalidate picks the tag from the Sanity webhook's changed document). Clubs (names,
// logos) are on nearly every page; halls (with the clubs' home halls) only on tournament and team match pages; a
// tournament's approval only on its own pages. Every ISR page a tag reaches is written again when next visited, so the
// clubs', the earned badges' and the halls' tags are left for the nightly run, which refreshes each only when one of
// them has changed (pipeline/sanity-revisions.mjs), not the webhook. A written page (About, Help & support) is on its
// own page in each language, and a badge given by hand or a match's story on its players' pages alone (a tag per player), so the webhook
// refreshes those at once. Cached until a tag is revalidated ("max"), not by time.
import { cacheLife, cacheTag } from "next/cache";
import { draftMode } from "next/headers";
import clubsJson from "@/content/clubs.json";
import type { Language } from "@/messages/i18n";
import type { Badge, ClubEntry, MatchStory, PageBlock, StorySpan, Venue, WrittenPage } from "@/types";
import { parseMatchKey } from "@/utils/matchKey";
import { sanityImageUrl } from "@/utils/sanityImage";
import { BADGES_TAG, CLUBS_TAG, HAND_BADGES_TAG, PAGES_TAG, pageTag, playerBadgesTag, playerStoriesTag, SANITY_TAG, STORIES_TAG, tournamentTag, TOURNAMENTS_TAG, VENUES_TAG, WRITTEN_PAGES, type WrittenPageKey } from "./sanityTags";

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

type BadgeText = { title: string | null; titleEn: string | null; description: string | null; descriptionEn: string | null };
type BadgeRow = BadgeText & { id: string; key: string | null; about: string | null; aboutEn: string | null; art: SanityLogo | null; players: number[] | null; listed: boolean; levels: (BadgeText & { level: number | null; art: SanityLogo | null })[] | null };
const badgeArt = (field: string) => `select(defined(${field}.asset) => { "url": ${field}.asset->url, "width": ${field}.asset->metadata.dimensions.width, "height": ${field}.asset->metadata.dimensions.height, "crop": ${field}.crop, "invert": ${field}.invertInDark })`;

/** The published badges that `filter` (GROQ) picks, both languages, by title: the query */
const badgesQuery = (filter: string) =>
  `*[_type == "badge" && !(_id in path("drafts.**")) && ${filter}] | order(title asc) { "id": _id, key, "listed": listed != false, title, titleEn, description, descriptionEn, about, aboutEn, players, "art": ${badgeArt("art")}, "levels": levels[]{ level, title, titleEn, description, descriptionEn, "art": ${badgeArt("art")} } }`;

/** The published badges that `filter` (GROQ) picks, both languages, by title */
async function badgeRows(projectId: string, filter: string): Promise<BadgeRow[]> {
  return query<BadgeRow[]>(projectId, badgesQuery(filter));
}

/** Badges in the page's language (else the other's), without the ones with no title */
function toBadges(rows: BadgeRow[], lang: Language): Badge[] {
  const pick = (no: string | null, en: string | null) => (lang === "en" ? en || no : no || en) ?? null;
  return rows.flatMap((b) => {
    const title = pick(b.title, b.titleEn);
    if (!title) return [];
    const levels = (b.levels ?? [])
      .filter((l): l is typeof l & { level: number } => typeof l.level === "number")
      .map((l) => ({ level: l.level, title: pick(l.title, l.titleEn), description: pick(l.description, l.descriptionEn), art: logoUrl(l.art), ...inverted(l.art, "artInvert") }))
      .sort((x, y) => x.level - y.level);
    return [{ id: b.id, key: b.key ?? null, title, description: pick(b.description, b.descriptionEn), about: pick(b.about, b.aboutEn), art: logoUrl(b.art), ...inverted(b.art, "artInvert"), players: b.players ?? [], listed: b.listed, levels }];
  });
}

/**
 * The badges earned by the pipeline's rules (sanity/schemas/badge.ts with a `key`: pipeline/achievements.mjs), their
 * text in the page's language (else the other's) and their art, cropped as set in the Studio (none without Sanity).
 * On every player page, so refreshed by the nightly run when one changed (BADGES_TAG), not the Sanity webhook
 */
export async function getBadges(lang: Language): Promise<Badge[]> {
  "use cache";
  cacheTag(SANITY_TAG, BADGES_TAG);
  cacheLife("max");
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  return projectId ? toBadges(await badgeRows(projectId, "defined(key)"), lang) : [];
}

/** Every badge given by hand (no `key`: to the players listed in the Studio), for the achievements page (HAND_BADGES_TAG) */
export async function getHandGivenBadges(lang: Language): Promise<Badge[]> {
  "use cache";
  cacheTag(SANITY_TAG, HAND_BADGES_TAG);
  cacheLife("max");
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  return projectId ? toBadges(await badgeRows(projectId, "!defined(key)"), lang) : [];
}

/** A story's text as the Studio keeps it (Portable Text: paragraphs of spans, links in markDefs) */
type StoryBlock = { _type?: string; children?: { _type?: string; text?: string; marks?: string[] }[]; markDefs?: { _key: string; _type?: string; href?: string }[] };
type StoryRow = {
  id: string;
  createdAt: string;
  match: string | null;
  title: string | null;
  titleEn: string | null;
  story: StoryBlock[] | string | null;
  storyEn: StoryBlock[] | string | null;
  source: { name?: string; url?: string } | null;
  teller: string | null;
};
/** The published stories' fields, raw (a span's spaces next to a bold part are part of the text) */
const STORIES_QUERY = `*[_type == "matchStory" && !(_id in path("drafts.**"))] | order(_createdAt asc) { "id": _id, "createdAt": _createdAt, match, title, titleEn, story, storyEn, source, teller }`;

/**
 * What the Studio gives one player by hand, both languages, in one query: their hand-given badges and the stories behind
 * their matches. One entry per player, with a tag per player for each (playerBadgesTag, playerStoriesTag), so a badge
 * given or taken, or a story told, refreshes only its players' pages at once. The stories are few, so all of them are
 * read and the player's picked here (a match key isn't something GROQ can take apart).
 */
async function playerRowsOf(id: number): Promise<{ badges: BadgeRow[]; stories: (StoryRow & { key: string })[] }> {
  "use cache";
  cacheTag(SANITY_TAG, playerBadgesTag(id), playerStoriesTag(id));
  cacheLife("max");
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  if (!projectId || !Number.isInteger(id)) return { badges: [], stories: [] };
  // Raw, for the stories' text; the badges are cleaned as usual
  const rows = await query<{ badges: BadgeRow[]; stories: StoryRow[] }>(projectId, `{ "badges": ${badgesQuery(`!defined(key) && ${id} in players`)}, "stories": ${STORIES_QUERY} }`, { raw: true });
  const stories = (rows.stories ?? []).flatMap((s) => {
    const match = s.match ? parseMatchKey(s.match) : null;
    return match?.players.includes(id) ? [{ ...s, key: match.key }] : [];
  });
  return { badges: clean(rows.badges ?? []) as BadgeRow[], stories };
}

/** The badges given by hand to one player, in the page's language (with each badge's players, for its rarity) */
export async function getPlayerHandBadges(id: number, lang: Language): Promise<Badge[]> {
  return toBadges((await playerRowsOf(id)).badges, lang);
}

/** A link the site follows: a path on it, or a web address (nothing else, such as javascript:) */
const safeHref = (href: string | undefined) => (href && (/^\/(?!\/)/.test(href) || /^https?:\/\//i.test(href)) ? href : undefined);

/**
 * A story's paragraphs as plain spans (no Portable Text in the browser): runs of spaces made one, each paragraph
 * trimmed. Plain text too (the first stories', before the text had links): its paragraphs parted by empty lines.
 */
function storySpans(blocks: StoryBlock[] | string | null): StorySpan[][] {
  if (typeof blocks === "string") {
    return blocks
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .map((text) => [{ text }]);
  }
  return (Array.isArray(blocks) ? blocks : []).flatMap((block) => {
    if (block._type !== "block") return [];
    const links = new Map((block.markDefs ?? []).filter((d) => d._type === "link").map((d) => [d._key, safeHref(d.href)]));
    const spans = (block.children ?? []).flatMap((child): StorySpan[] => {
      const text = (child.text ?? "").replace(/\s+/g, " ");
      if (!text) return [];
      const marks = child.marks ?? [];
      const href = marks.map((m) => links.get(m)).find(Boolean);
      return [{ text, ...(href ? { href } : {}), ...(marks.includes("strong") ? { strong: true as const } : {}), ...(marks.includes("em") ? { em: true as const } : {}) }];
    });
    // The paragraph's ends trimmed
    if (spans.length) {
      spans[0] = { ...spans[0], text: spans[0].text.trimStart() };
      spans[spans.length - 1] = { ...spans[spans.length - 1], text: spans[spans.length - 1].text.trimEnd() };
    }
    const kept = spans.filter((span) => span.text);
    return kept.length ? [kept] : [];
  });
}

/** A story in the page's language (each field falling back to the other language's), or null without text */
function toStory(s: StoryRow & { key: string }, lang: Language): MatchStory | null {
  const pick = (no: string | null | undefined, en: string | null | undefined) => (lang === "en" ? en?.trim() || no?.trim() : no?.trim() || en?.trim()) || null;
  const no = storySpans(s.story);
  const en = storySpans(s.storyEn);
  const story = lang === "en" ? (en.length ? en : no) : no.length ? no : en;
  if (!story.length) return null;
  const url = safeHref(s.source?.url?.trim());
  const name = s.source?.name?.trim() || null;
  return { key: s.key, title: pick(s.title, s.titleEn), story, source: name || url ? { name, url: url ?? null } : null, teller: s.teller?.trim() || null };
}

/** The stories behind one player's matches, in the page's language (else the other's), oldest written first */
export async function getPlayerStories(id: number, lang: Language): Promise<MatchStory[]> {
  return (await playerRowsOf(id)).stories.flatMap((s) => toStory(s, lang) ?? []);
}

/** Every published story, both languages (STORIES_TAG: the stories page and app/api/stories) */
async function storyRows(): Promise<(StoryRow & { key: string; players: number[] })[]> {
  "use cache";
  cacheTag(SANITY_TAG, STORIES_TAG);
  cacheLife("max");
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  if (!projectId) return [];
  return (await query<StoryRow[]>(projectId, STORIES_QUERY, { raw: true })).flatMap((s) => {
    const match = s.match ? parseMatchKey(s.match) : null;
    return match ? [{ ...s, key: match.key, players: match.players }] : [];
  });
}

/** Every published story in the page's language, newest first, with its match's players and when it was published */
export async function getStories(lang: Language): Promise<(MatchStory & { id: string; players: number[]; createdAt: string })[]> {
  return (await storyRows())
    .flatMap((s) => {
      const story = toStory(s, lang);
      return story ? [{ ...story, id: s.id, players: s.players, createdAt: s.createdAt }] : [];
    })
    .reverse();
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
