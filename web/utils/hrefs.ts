// The site's URLs, built in one place (the ranking lists' and the strongest clubs' are in
// utils/rankings.ts, a tournament event's in utils/tournament.ts)
export const playerHref = (id: number) => `/players/${id}`;
export const clubHref = (slug: string) => `/clubs/${slug}`;
export const tournamentHref = (cup2000Id: number, view?: "summary") => `/tournaments/${cup2000Id}${view ? `/${view}` : ""}`;
/** A week's upsets (its Monday, "2026-10-12"), or a year's newest week ("2026") */
export const upsetsHref = (period: string) => `/upsets/${period}`;
/** An Eliteserien season in review ("2024-25") */
export const eliteserienHref = (season: string) => `/eliteserien/${season}`;

/** Two players head to head (B left to be picked when not given) */
export const headToHeadHref = (a: number, b?: number) => `/head-to-head?a=${a}${b !== undefined ? `&b=${b}` : ""}`;
/** Two pairs head to head: A1 and A2 against B1 and B2 */
export const doublesHeadToHeadHref = ([a1, a2]: number[], [b1, b2]: number[]) => `/head-to-head/doubles?a1=${a1}&a2=${a2}&b1=${b1}&b2=${b2}`;

/** The site's code on GitHub, or a file in it ("pipeline/README.md") */
export const REPO_URL = "https://github.com/boinboinboin/elodrop";
export const repoHref = (path: string) => `${REPO_URL}/blob/main/${path}`;
