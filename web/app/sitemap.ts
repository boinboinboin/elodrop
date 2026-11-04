// sitemap.xml: every page search engines should find, in both languages, from the same data as the pages, so it's
// rebuilt with them (the elo-data and sanity tags). Head to head is left out (a page for every pair,
// and kept out in robots.ts), as are the lists with inactive players (the same players as the
// ranked list, and more) and a tournament's single events. Each page has the day it last changed
// where the data has it (players, tournaments, team matches), else the last data update.
// About 36,200 addresses with the team matches (2026-11), under the 50,000 one sitemap may hold;
// past that it needs splitting (generateSitemaps).
import type { MetadataRoute } from "next";
import { getMeta } from "@/data/meta";
import { getSearchIndex } from "@/data/players";
import { getClubEntries } from "@/data/sanity";
import { getTournamentsIndex } from "@/data/tournaments";
import { getTeamMatchesIndex, getTeamMatchWeek, seasonWeeks } from "@/data/teamMatches";
import { getUpsetsIndex } from "@/data/upsets";
import { clubHref, ELITESERIEN_HREF, ELITESERIEN_TEN_MATCHES_HREF, eliteserienHref, playerHref, seasonSlug, SITE_URL, teamDivisionHref, teamMatchesHref, teamMatchHref, tournamentHref, upsetsHref } from "@/utils/hrefs";
import { POOL_KEYS } from "@/utils/pools";
import { combinedRankingHref, juniorRankingHref, RANKING_LISTS, rankingHref, strongestClubsHref } from "@/utils/rankings";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [meta, players, clubs, tournaments, upsets, teamMatches] = await Promise.all([getMeta(), getSearchIndex(), getClubEntries(), getTournamentsIndex(), getUpsetsIndex(), getTeamMatchesIndex()]);
  // Each team match is listed from its week's file, the one place that has every team match's id
  const weeks = (teamMatches?.seasons ?? []).flatMap((s) => s.weeks.map((w) => w.week));
  const weekFiles = await Promise.all(weeks.map(getTeamMatchWeek));
  const lists = Object.values(RANKING_LISTS);
  // A season's last day played: its season and division pages' date
  const seasonEnd = (s: { weeks: { to: string }[] }) => s.weeks.map((w) => w.to).sort().at(-1);
  // Each page with the day it last changed, where that's known: a player's last match, when a
  // tournament's draw was last fetched (it changes until the tournament is over), the day of a team
  // match, the last day of a weekend or season. The rest change with the nightly data.
  const pages: [path: string, changed?: string | null][] = [
    ["/"],
    ...lists.map((l): [string] => [rankingHref(l.pool, l.gender)]),
    ...lists.map((l): [string] => [juniorRankingHref(l.pool, l.gender)]),
    ...(["M", "K"] as const).flatMap((g): [string][] => [[combinedRankingHref(g)], [combinedRankingHref(g, true)]]),
    [strongestClubsHref("combined")],
    ...POOL_KEYS.map((pool): [string] => [strongestClubsHref(pool)]),
    ...clubs.map((c): [string] => [clubHref(c.slug)]),
    ["/tournaments"],
    ...(tournaments?.tournaments ?? []).flatMap((tour): [string, string][] => [
      [tournamentHref(tour.cup2000Id), tour.fetchedAt],
      [tournamentHref(tour.cup2000Id, "summary"), tour.fetchedAt],
    ]),
    [ELITESERIEN_HREF],
    [ELITESERIEN_TEN_MATCHES_HREF],
    ...(meta?.eliteserien.seasons ?? []).map((season): [string] => [eliteserienHref(season)]),
    ["/upsets"],
    ...(upsets?.years ?? []).map((year): [string] => [upsetsHref(year)]),
    // The senior and the junior team matches: each one's seasons and weeks
    ...[false, true].flatMap((junior): [string, string?][] => [
      [teamMatchesHref(null, junior)],
      ...(teamMatches?.seasons ?? []).filter((s) => seasonWeeks(s, junior).length).map((s): [string, string | undefined] => [teamMatchesHref(seasonSlug(s.season), junior), seasonEnd(s)]),
      ...(teamMatches?.seasons ?? []).flatMap((s) => seasonWeeks(s, junior).map((w): [string, string] => [teamMatchesHref(w.week, junior), w.to])),
    ]),
    ...(teamMatches?.seasons ?? []).flatMap((s) => (s.divisions ?? []).map((d): [string, string | undefined] => [teamDivisionHref(s.season, d.slug), seasonEnd(s)])),
    ...weekFiles.flatMap((w) => (w?.ties ?? []).map((tie): [string, string] => [teamMatchHref(tie.matchId), tie.day])),
    ["/how-it-works"],
    ["/whats-new"],
    ...players.map(([id, , , , , lastPlayed]): [string, string | null | undefined] => [playerHref(id), lastPlayed]),
  ];
  const updated = meta?.updatedAt ?? meta?.generatedAt;
  // Each page in both languages, Norwegian at the root and English under /en, each listing the
  // other (hreflang); escaped, as the sitemap format asks (club slugs like "bodø")
  const url = (path: string) => `${SITE_URL}${path === "/" ? "" : encodeURI(path)}`;
  const seen = new Set<string>();
  return pages.flatMap(([path, changed]) => {
    if (seen.has(path)) return [];
    seen.add(path);
    const lastModified = changed ?? updated;
    const languages = { nb: url(path), en: url(path === "/" ? "/en" : `/en${path}`) };
    return [languages.nb, languages.en].map((address) => ({ url: address, ...(lastModified ? { lastModified } : {}), alternates: { languages } }));
  });
}
