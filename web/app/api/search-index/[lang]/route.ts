// Everything the search bar and the player pickers search, in one file per language
// (/api/search-index/nb, /api/search-index/en) the browser loads once and searches itself
// (utils/search.ts), so typing needs no request. Built from cached data only, so the responses are
// prerendered and refreshed with the data (the elo-data and sanity tags). The addresses are without
// a language (the search bar puts the page's in front); the searched terms are in both languages.
// → { players: [id, name, club][] (ranked first, then most matches), clubs, tournaments, eliteserien },
// the last three [{ name, detail, url, logo?, terms }], where terms is the text searched.
import { getMeta } from "@/data/meta";
import { getSearchIndex } from "@/data/players";
import { getClubEntries } from "@/data/sanity";
import { getTournamentsIndex } from "@/data/tournaments";
import { createI18n, isLanguage, LANGUAGES } from "@/messages/i18n";
import { seasonLabel } from "@/utils/format";
import { clubHref, ELITESERIEN_HREF, ELITESERIEN_TEN_MATCHES_HREF, eliteserienHref, tournamentHref } from "@/utils/hrefs";
import type { SearchIndex, SearchPage, SearchPlayer } from "@/utils/search";

export const generateStaticParams = async () => LANGUAGES.map((lang) => ({ lang }));

export async function GET(_request: Request, { params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLanguage(lang)) return new Response(null, { status: 404 });
  const { t, date } = createI18n(lang);
  const [players, clubs, meta, tournaments] = await Promise.all([getSearchIndex(), getClubEntries(), getMeta(), getTournamentsIndex()]);

  const eliteserien: SearchPage[] = [];
  if (meta?.eliteserien.current) {
    const name = t("layout.search.eliteserien", { season: meta.eliteserien.current });
    eliteserien.push({ name, detail: t("layout.search.teamStrengths"), url: ELITESERIEN_HREF, terms: `eliteserie ${name} team strengths lineups lagstyrke oppstilling` });
    eliteserien.push({ name, detail: t("layout.search.tenMatches"), url: ELITESERIEN_TEN_MATCHES_HREF, terms: `eliteserie ${name} 10 ten matches what if format ti kamper` });
  }
  for (const season of meta?.eliteserien.seasons ?? []) {
    const name = t("layout.search.eliteserien", { season: seasonLabel(+season.slice(0, 4)) });
    eliteserien.push({ name, detail: t("layout.search.seasonInReview"), url: eliteserienHref(season), terms: `eliteserie ${name} ${season} review results sesong oppsummering resultater` });
  }

  const index: SearchIndex = {
    players: [...players].sort((a, b) => b[3] - a[3] || b[4] - a[4]).map(([id, name, club]): SearchPlayer => [id, name, club]),
    clubs: clubs.map((c) => ({
      name: c.title,
      detail: c.fullName && c.fullName !== c.title ? c.fullName : (c.region ?? ""),
      url: clubHref(c.slug),
      logo: c.logo,
      terms: `${c.title} ${c.fullName ?? ""}`,
    })),
    tournaments: (tournaments?.tournaments ?? []).map((tour) => ({
      name: tour.name,
      detail: [tour.startDate && date(tour.startDate), t("layout.search.drawLuck")].filter(Boolean).join(" · "),
      url: tournamentHref(tour.cup2000Id),
      terms: `${tour.name} turnering tournament draw trekning`,
    })),
    eliteserien,
  };
  return Response.json(index);
}
