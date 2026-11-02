// Team matches (league ties) in every division and age group, for the site's team match pages: each
// tie's individual matches with the players' ratings before and after, each match's win chance and
// whether it was an upset, and the tie's win chance from the lineups that actually played.
// Usage: node team-matches.mjs   (after rate.mjs; needs data/league and data/league-games.json)
//
// Writes data/team-matches/:
//   index.json          years, weeks (Mondays, newest first) and the newest week
//   weeks/<Monday>.json that week's ties (summaries), Eliteserien first, then by level
//   <matchId>.json      one tie: its summary, individual matches and golden set
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { playedOdds } from "./eliteserien.mjs";
import { leagueLevel } from "./rules.mjs";

const DIR = new URL(".", import.meta.url).pathname;
const OUT = `${DIR}data/team-matches`;
// A tie is an upset when the winner had less than this chance of winning it with the lineups
// played (as in the Eliteserien review)
const TIE_UPSET = 0.3;
const POOL_OF = { MensSingles: "men", WomensSingles: "women", MensDoubles: "mensDoubles", WomensDoubles: "womensDoubles", MixedDoubles: "mixedDoubles" };

const read = (file) => JSON.parse(readFileSync(file, "utf8"));
const round3 = (x) => Math.round(x * 1000) / 1000;
// "Sandefjord 2" -> "Sandefjord": the club, for its logo and page
const clubOf = (team) => team.replace(/\s+\d+$/, "").trim();
const DAY_MS = 86_400_000;
const monday = (day) => {
  const t = Date.parse(`${day}T00:00:00Z`);
  return new Date(t - ((new Date(t).getUTCDay() + 6) % 7) * DAY_MS).toISOString().slice(0, 10);
};
// Eliteserien first, then senior divisions by level, then juniors, then anything else
function rankOf(group) {
  const { tier, junior } = leagueLevel(group.ageGroup, group.division, "1. HS");
  const elite = /elite?se?rie/i.test(group.division) && group.ageGroup === "SEN";
  return (group.ageGroup === "SEN" ? 0 : junior ? 100 : 200) + (elite ? -1 : tier);
}

const { ties: rated } = read(`${DIR}data/league-games.json`);
const ties = [];
for (const file of readdirSync(`${DIR}data/league`).filter((f) => f.endsWith(".json"))) {
  const group = read(`${DIR}data/league/${file}`);
  const rank = rankOf(group);
  for (const tie of group.ties) {
    const [home, away] = tie.score.split("-").map(Number);
    if (!Number.isFinite(home) || !Number.isFinite(away)) continue;
    const ratedGames = rated[tie.matchId] ?? {};
    const games = tie.games.map((g, i) => {
      const r = ratedGames[i];
      const side = (players, n) => players.map((p) => {
        const info = r?.[`side${n}`].find((x) => x.id === p.id);
        return { id: p.id, name: p.name, ...(info && { rating: info.rating, change: info.change }) };
      });
      return {
        game: g.game,
        pool: POOL_OF[g.discipline] ?? null,
        side1: side(g.side1, 1),
        side2: side(g.side2, 2),
        winner: g.winner ?? 0,
        score: g.score ?? null,
        walkover: !!g.walkover,
        winChance: r?.winChance ?? null,
        upset: r?.upset ?? false,
      };
    });
    // The tie's odds with the lineups played: rated matches with their win chances, walkovers as
    // certain wins for the side given them; a draw settled by a golden set, when one was played,
    // with the chance of that discipline's first match
    const walkovers = [1, 2].map((side) => games.filter((g) => g.walkover && g.winner === side).length);
    const chances = games.filter((g) => g.winChance != null).map((g) => g.winChance);
    let odds = chances.length ? playedOdds(chances, walkovers) : null;
    if (odds && tie.goldenSet) {
      const chance = games.find((g) => g.pool === POOL_OF[tie.goldenSet.discipline] && g.winChance != null)?.winChance ?? 0.5;
      odds = { ...odds, win: odds.win + odds.draw * chance, loss: odds.loss + odds.draw * (1 - chance), draw: 0 };
    }
    const winner = home > away ? 1 : home < away ? 2 : (tie.goldenSet?.winner ?? 0);
    const upset = !!odds && ((winner === 1 && odds.win < TIE_UPSET) || (winner === 2 && odds.loss < TIE_UPSET));
    const day = tie.time.slice(0, 10);
    const summary = {
      matchId: tie.matchId,
      day,
      time: tie.time,
      season: group.season,
      ageGroup: group.ageGroup,
      region: group.region,
      division: group.division,
      group: group.group,
      home: tie.home,
      away: tie.away,
      homeClub: tie.home.includes("/") ? null : clubOf(tie.home),
      awayClub: tie.away.includes("/") ? null : clubOf(tie.away),
      score: [home, away],
      winner, // 1 home, 2 away, 0 draw
      // The home team's chances with the lineups played (null: no rated match)
      winChance: odds && { win: round3(odds.win), draw: round3(odds.draw), loss: round3(odds.loss) },
      upset,
      upsets: games.filter((g) => g.upset).length,
    };
    const goldenSet = tie.goldenSet
      ? { pool: POOL_OF[tie.goldenSet.discipline] ?? null, side1: tie.goldenSet.side1.map(({ id, name }) => ({ id, name })), side2: tie.goldenSet.side2.map(({ id, name }) => ({ id, name })), winner: tie.goldenSet.winner, score: tie.goldenSet.score }
      : null;
    ties.push({ summary, games, goldenSet, rank, week: monday(day) });
  }
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/weeks`, { recursive: true });
for (const t of ties) writeFileSync(`${OUT}/${t.summary.matchId}.json`, JSON.stringify({ ...t.summary, week: t.week, games: t.games, goldenSet: t.goldenSet }));
const byWeek = Map.groupBy(ties, (t) => t.week);
const weeks = [...byWeek.keys()].sort().reverse();
const weekFile = (week) => ({
  week,
  ties: byWeek
    .get(week)
    .sort((a, b) => a.rank - b.rank || a.summary.division.localeCompare(b.summary.division, "nb") || a.summary.group.localeCompare(b.summary.group, "nb") || a.summary.time.localeCompare(b.summary.time) || a.summary.matchId - b.summary.matchId)
    .map((t) => t.summary),
});
for (const week of weeks) writeFileSync(`${OUT}/weeks/${week}.json`, JSON.stringify(weekFile(week)));
const years = [...new Set(weeks.map((w) => w.slice(0, 4)))];
writeFileSync(`${OUT}/index.json`, JSON.stringify({ generatedAt: new Date().toISOString(), years, weeks, latest: weeks.length ? weekFile(weeks[0]) : null }));

const upsets = ties.filter((t) => t.summary.upset).length;
console.log(`Wrote ${ties.length} team matches in ${weeks.length} weeks (${years.at(-1)}–${years[0]}): ${upsets} upsets, ${ties.filter((t) => !t.summary.winChance).length} without a rated match.`);
