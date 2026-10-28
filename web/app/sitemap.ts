// sitemap.xml: every page search engines should find, from the same data as the pages, so it's
// rebuilt with them (the elo-data and sanity tags). Head to head is left out (a page for every pair,
// and kept out in robots.ts), as are the lists with inactive players (the same players as the
// ranked list, and more) and a tournament's single events.
import type { MetadataRoute } from "next";
import { getMeta } from "@/data/meta";
import { getSearchIndex } from "@/data/players";
import { getClubEntries } from "@/data/sanity";
import { getTournamentsIndex } from "@/data/tournaments";
import { getUpsetsIndex } from "@/data/upsets";
import { clubHref, ELITESERIEN_HREF, ELITESERIEN_TEN_MATCHES_HREF, eliteserienHref, playerHref, SITE_URL, tournamentHref, upsetsHref } from "@/utils/hrefs";
import { POOL_KEYS } from "@/utils/pools";
import { combinedRankingHref, juniorRankingHref, RANKING_LISTS, rankingHref, strongestClubsHref } from "@/utils/rankings";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [meta, players, clubs, tournaments, upsets] = await Promise.all([getMeta(), getSearchIndex(), getClubEntries(), getTournamentsIndex(), getUpsetsIndex()]);
  const lists = Object.values(RANKING_LISTS);
  const paths = [
    "/",
    ...lists.map((l) => rankingHref(l.pool, l.gender)),
    ...lists.map((l) => juniorRankingHref(l.pool, l.gender)),
    ...(["M", "K"] as const).flatMap((g) => [combinedRankingHref(g), combinedRankingHref(g, true)]),
    strongestClubsHref("combined"),
    ...POOL_KEYS.map((pool) => strongestClubsHref(pool)),
    ...clubs.map((c) => clubHref(c.slug)),
    "/tournaments",
    ...(tournaments?.tournaments ?? []).flatMap((tour) => [tournamentHref(tour.cup2000Id), tournamentHref(tour.cup2000Id, "summary")]),
    ELITESERIEN_HREF,
    ELITESERIEN_TEN_MATCHES_HREF,
    ...(meta?.eliteserien.seasons ?? []).map(eliteserienHref),
    "/upsets",
    ...(upsets?.years ?? []).map(upsetsHref),
    "/how-it-works",
    "/whats-new",
    ...players.map(([id]) => playerHref(id)),
  ];
  // Everything changes with the nightly data, so the last update is every page's
  const lastModified = meta?.updatedAt ? new Date(meta.updatedAt) : undefined;
  // Escaped, as the sitemap format asks (club slugs like "bodø")
  return [...new Set(paths)].map((path) => ({ url: `${SITE_URL}${path === "/" ? "" : encodeURI(path)}`, lastModified }));
}
