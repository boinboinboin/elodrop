// The search bar on every page: ?q=<text> → { players, clubs, tournaments, eliteserien }, each
// [{ name, detail?, club?, url, logo? }]. Every word of the query must match (accents and case
// ignored): players as in the player search, clubs by short or full name, tournaments with a draw,
// and Eliteserien's team strengths and each season in review (e.g. "elite 2024").
import { getClubEntries } from "@/lib/clubs";
import { getMeta, getTournamentsIndex, searchPlayers } from "@/lib/data";
import { date, normalize, words as splitWords } from "@/lib/format";

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").slice(0, 60);
  const words = splitWords(q);
  if (!words.length) return Response.json({ players: [], clubs: [], tournaments: [], eliteserien: [] });
  const matches = (text: string) => {
    const t = normalize(text);
    return words.every((w) => t.includes(w));
  };

  const [players, clubs, meta, tournaments] = await Promise.all([searchPlayers(q, 6), getClubEntries(), getMeta(), getTournamentsIndex()]);

  const clubResults = clubs
    .filter((c) => matches(`${c.title} ${c.fullName ?? ""}`))
    .slice(0, 6)
    .map((c) => ({ name: c.title, detail: c.fullName && c.fullName !== c.title ? c.fullName : (c.region ?? ""), url: `/clubs/${c.slug}`, logo: c.logo }));

  const pages: { name: string; detail: string; url: string; terms: string }[] = [];
  if (meta?.eliteserien.current) pages.push({ name: `Eliteserien ${meta.eliteserien.current}`, detail: "Team strengths", url: "/eliteserien", terms: "team strengths lineups" });
  for (const season of meta?.eliteserien.seasons ?? []) {
    const year = +season.slice(0, 4);
    pages.push({ name: `Eliteserien ${year}/${year + 1}`, detail: "Season in review", url: `/eliteserien/${season}`, terms: `${season} review results` });
  }

  return Response.json({
    players: players.map((p) => ({ ...p, url: `/players/${p.id}` })),
    clubs: clubResults,
    tournaments: (tournaments?.tournaments ?? [])
      .filter((t) => matches(`${t.name} turnering tournament draw`))
      .slice(0, 6)
      .map((t) => ({ name: t.name, detail: `${t.startDate ? `${date(t.startDate)} · ` : ""}Draw luck`, url: `/tournaments/${t.cup2000Id}` })),
    eliteserien: pages.filter((p) => matches(`eliteserie ${p.name} ${p.terms}`)).map(({ name, detail, url }) => ({ name, detail, url })),
  });
}
