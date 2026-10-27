// The search bar on every page: ?q=<text> → { players, clubs, tournaments, eliteserien }, each
// [{ name, detail?, club?, url, logo? }]. Every word of the query must match (accents and case
// ignored): players as in the player search, clubs by short or full name, tournaments with a draw,
// and Eliteserien's team strengths and each season in review (e.g. "elite 2024").
import { getClubEntries } from "@/data/sanity";
import { getMeta } from "@/data/meta";
import { getTournamentsIndex } from "@/data/tournaments";
import { searchPlayers } from "@/data/players";
import { t } from "@/messages/i18n";
import { date, normalize, seasonLabel, words as splitWords } from "@/utils/format";
import { clubHref, ELITESERIEN_HREF, ELITESERIEN_TEN_MATCHES_HREF, eliteserienHref, playerHref, tournamentHref } from "@/utils/hrefs";

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").slice(0, 60);
  const words = splitWords(q);
  if (!words.length) return Response.json({ players: [], clubs: [], tournaments: [], eliteserien: [] });
  const matches = (text: string) => {
    const normalized = normalize(text);
    return words.every((w) => normalized.includes(w));
  };

  const [players, clubs, meta, tournaments] = await Promise.all([searchPlayers(q, 6), getClubEntries(), getMeta(), getTournamentsIndex()]);

  const clubResults = clubs
    .filter((c) => matches(`${c.title} ${c.fullName ?? ""}`))
    .slice(0, 6)
    .map((c) => ({ name: c.title, detail: c.fullName && c.fullName !== c.title ? c.fullName : (c.region ?? ""), url: clubHref(c.slug), logo: c.logo }));

  const pages: { name: string; detail: string; url: string; terms: string }[] = [];
  // The terms are searched too, not shown
  if (meta?.eliteserien.current) pages.push({ name: t("layout.search.eliteserien", { season: meta.eliteserien.current }), detail: t("layout.search.teamStrengths"), url: ELITESERIEN_HREF, terms: "team strengths lineups" });
  if (meta?.eliteserien.current) pages.push({ name: t("layout.search.eliteserien", { season: meta.eliteserien.current }), detail: t("layout.search.tenMatches"), url: ELITESERIEN_TEN_MATCHES_HREF, terms: "10 ten matches what if format" });
  for (const season of meta?.eliteserien.seasons ?? []) {
    const name = t("layout.search.eliteserien", { season: seasonLabel(+season.slice(0, 4)) });
    pages.push({ name, detail: t("layout.search.seasonInReview"), url: eliteserienHref(season), terms: `${season} review results` });
  }

  return Response.json({
    players: players.map((p) => ({ ...p, url: playerHref(p.id) })),
    clubs: clubResults,
    tournaments: (tournaments?.tournaments ?? [])
      .filter((tour) => matches(`${tour.name} turnering tournament draw`))
      .slice(0, 6)
      .map((tour) => ({ name: tour.name, detail: [tour.startDate && date(tour.startDate), t("layout.search.drawLuck")].filter(Boolean).join(" · "), url: tournamentHref(tour.cup2000Id) })),
    eliteserien: pages.filter((p) => matches(`eliteserie ${p.name} ${p.terms}`)).map(({ name, detail, url }) => ({ name, detail, url })),
  });
}
