// The site's numbers (components/content/SiteStats.tsx): players with a rating, matches rated, team matches and the
// seasons with rated matches, from meta.json and the team matches' index. A page showing them is refreshed when either changes (after
// each run): the front page and the written pages with a numbers block.
import { getMeta } from "./meta";
import { getTeamMatchesIndex } from "./teamMatches";

export type SiteNumber = "players" | "matches" | "teamMatches" | "seasons";
export type SiteNumbers = Partial<Record<SiteNumber, number>>;
/** Every number, in the order shown (and listed in the Studio: sanity/schemas/page.ts SITE_STATS) */
export const SITE_NUMBERS: SiteNumber[] = ["players", "matches", "teamMatches", "seasons"];

export async function getSiteNumbers(): Promise<SiteNumbers> {
  const [meta, index] = await Promise.all([getMeta(), getTeamMatchesIndex()]);
  return {
    players: meta?.players,
    // Not in exports from before it was added: left out until the next run
    matches: meta?.matches,
    teamMatches: index?.seasons.reduce((n, s) => n + s.weeks.reduce((m, w) => m + w.ties, 0), 0),
    // The seasons with rated matches (2009/10 on); older exports: the team matches' seasons (2013/14 on)
    seasons: meta?.seasons ?? index?.seasons.length,
  };
}
