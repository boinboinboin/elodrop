// The cache tags of Sanity's content (data/sanity.ts), also used by app/api/revalidate to refresh only what a change in
// the Studio reaches. Apart from data/sanity.ts: a file with 'use cache' functions can't share plain values with a route.

/** All of Sanity's content */
export const SANITY_TAG = "sanity";
/** The clubs (names, slugs, logos, home halls): on nearly every page, so refreshed by the nightly run when they changed (pipeline/sanity-revisions.mjs), not the Sanity webhook */
export const CLUBS_TAG = "sanity:clubs";
/** The halls, and the clubs' home halls: tournament and every team match page, so refreshed by the nightly run when they changed, not the Sanity webhook */
export const VENUES_TAG = "sanity:venues";
/** Every tournament checked in the Studio */
export const TOURNAMENTS_TAG = "sanity:tournaments";
/** One tournament checked in the Studio, by its Cup2000 id: its own pages */
export const tournamentTag = (cup2000Id: number) => `${TOURNAMENTS_TAG}:${cup2000Id}`;
/** The badges earned by the pipeline's rules (title, description, art): every player page, so refreshed by the nightly run when they changed, not the Sanity webhook */
export const BADGES_TAG = "sanity:badges";
/** The badges given by hand, all of them: the achievements page */
export const HAND_BADGES_TAG = "sanity:badges:given";
/** One player's badges given by hand: their own page, so the Sanity webhook refreshes a hand-given badge's players at once */
export const playerBadgesTag = (id: number) => `${BADGES_TAG}:player:${id}`;
/** The stories behind matches, all of them: the stories page (/stories) and app/api/stories (the upset cards) */
export const STORIES_TAG = "sanity:stories";
/** The stories behind one player's matches: their own page, so the Sanity webhook refreshes a story's players at once */
export const playerStoriesTag = (id: number) => `${STORIES_TAG}:player:${id}`;
/** The pages written in the Studio (About, Help & support, Privacy) */
export const PAGES_TAG = "sanity:pages";
/** Their keys: their addresses on the site (/about) and their documents' ids (page-about-nb) */
export const WRITTEN_PAGES = ["about", "support", "privacy"] as const;
export type WrittenPageKey = (typeof WRITTEN_PAGES)[number];
/** One written page ("about", "support"), both languages: its own two pages, so the Sanity webhook refreshes it at once */
export const pageTag = (key: string) => `${PAGES_TAG}:${key}`;
/** The written page a document is ("page-about-en" → "about"), or null (another document) */
export const pageKeyOf = (id: string) => /^page-([a-z]+)-(?:nb|en)$/.exec(id)?.[1] ?? null;
