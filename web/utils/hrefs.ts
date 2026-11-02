// The site's URLs, built in one place (the ranking lists' and the strongest clubs' are in
// utils/rankings.ts, a tournament event's in utils/tournament.ts)
/** The production address (sitemap.xml, robots.txt): Vercel's production domain, or elodrop.no outside Vercel */
export const SITE_URL = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "elodrop.no"}`;

export const playerHref = (id: number) => `/players/${id}`;
export const clubHref = (slug: string) => `/clubs/${slug}`;
export const tournamentHref = (cup2000Id: number, view?: "summary") => `/tournaments/${cup2000Id}${view ? `/${view}` : ""}`;
/** A week's upsets (its Monday, "2026-10-12"), or a year's newest week ("2026") */
export const upsetsHref = (period: string) => `/upsets/${period}`;
/** The newest week's team matches, a week's (its Monday, "2025-11-10") or a season's newest week ("2025-26") */
export const teamMatchesHref = (period?: string) => `/team-matches${period ? `/${period}` : ""}`;
/** A league season (2025, for 2025/26) in team match URLs: "2025-26" */
export const seasonSlug = (season: number) => `${season}-${String((season + 1) % 100).padStart(2, "0")}`;
/** One team match (its badmintonportalen match id) */
export const teamMatchHref = (matchId: number) => `/team-matches/match/${matchId}`;
/** Eliteserien this season, and what if a tie were 10 matches */
export const ELITESERIEN_HREF = "/eliteserien";
export const ELITESERIEN_TEN_MATCHES_HREF = "/eliteserien/ten-matches";
/** An Eliteserien season in review ("2024-25") */
export const eliteserienHref = (season: string) => `/eliteserien/${season}`;

/** Two players head to head (B left to be picked when not given) */
export const headToHeadHref = (a: number, b?: number) => `/head-to-head?a=${a}${b !== undefined ? `&b=${b}` : ""}`;
/** Two pairs head to head: A1 and A2 against B1 and B2 */
export const doublesHeadToHeadHref = ([a1, a2]: number[], [b1, b2]: number[]) => `/head-to-head/doubles?a1=${a1}&a2=${a2}&b1=${b1}&b2=${b2}`;

/** The site's code on GitHub, or a file in it ("pipeline/README.md") */
export const REPO_URL = "https://github.com/boinboinboin/elodrop";
export const repoHref = (path: string) => `${REPO_URL}/blob/main/${path}`;
