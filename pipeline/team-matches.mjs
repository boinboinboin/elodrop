// Team matches (league ties) in every division and age group, for the site's team match pages: each
// tie's individual matches with the players' ratings before and after, each match's win chance and
// whether it was an upset, and the tie's win chance from the lineups that actually played.
// Usage: node team-matches.mjs   (after rate.mjs; needs data/league and data/league-games.json)
//
// Writes data/team-matches/:
//   index.json          the seasons (newest first) with their divisions (by region and age group)
//                       and weeks (Mondays, in order), and the newest week
//   weeks/<Monday>.json that week's ties (summaries), Eliteserien first, then by level, and its season
//   <matchId>.json      one tie: its summary, individual matches and golden set
//   divisions/<season>/<slug>.json  one division (or series) in a season: its groups, each with
//                       its team matches and its power ranking (the teams by the strength of the
//                       players who played for them that season, their best lineup)
//   venues.json         every hall team matches were played in (badmintonportalen's free text), most
//                       used first, with the clubs hosting there: for the site's venues in Sanity
//                       (web/scripts/import-venues.mts)
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { lowestRatings, playedOdds, playerRatings } from "./eliteserien.mjs";
import * as R from "./rules.mjs";
import { leagueLevel } from "./rules.mjs";

const DIR = new URL(".", import.meta.url).pathname;
const OUT = `${DIR}data/team-matches`;
// A tie is an upset when the winner had less than this chance of winning it with the lineups
// played (as in the Eliteserien review)
const TIE_UPSET = 0.3;
const POOL_OF = { MensSingles: "men", WomensSingles: "women", MensDoubles: "mensDoubles", WomensDoubles: "womensDoubles", MixedDoubles: "mixedDoubles" };

// The rating a player brings to a discipline: singles, doubles (men's and women's) or mixed
const powerRating = (p, pool) => (pool === "men" || pool === "women" ? p.singles : pool === "mixedDoubles" ? p.mixed : p.doubles);
const POWER_GENDER = { men: "M", women: "K", mensDoubles: "M", womensDoubles: "K" };
const sideRatingOf = (side, pool) => R.sideRating(side.map((p) => powerRating(p, pool)));

const read = (file) => JSON.parse(readFileSync(file, "utf8"));
const round3 = (x) => Math.round(x * 1000) / 1000;
// "Sandefjord 2" -> "Sandefjord": the club, for its logo and page
const clubOf = (team) => team.replace(/\s+\d+$/, "").trim();
// A hall's name without the courts badmintonportalen writes after some: their number in brackets
// and the courts used ("Oppsal Arena 3 (6) 1-2", "Karmøyhallen 1-11" -> "Oppsal Arena 3", "Karmøyhallen")
const hallOf = (venue) => venue?.replace(/\s+\d+\s*-\s*\d+$/, "").replace(/\s*\(\d+\)$/, "").trim() || null;
// Teams of several clubs as "Askøy/Stanghelle/Sotra", as most are written ("Askøy - Stanghelle - Sotra"
// too); a hyphen without spaces is part of a club's name ("Mortensrud-Aker")
const teamName = (team) => team.replace(/\s*[-–]\s+|\s+[-–]\s*/g, "/").trim();
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
// The groups' played ties as in the data, for the power ranking
const played = [];
for (const file of readdirSync(`${DIR}data/league`).filter((f) => f.endsWith(".json"))) {
  const group = read(`${DIR}data/league/${file}`);
  const rank = rankOf(group);
  for (const tie of group.ties) {
    const [homeWon, awayWon] = tie.score.split("-").map(Number);
    if (!Number.isFinite(homeWon) || !Number.isFinite(awayWon)) continue;
    const [home, away] = [teamName(tie.home), teamName(tie.away)];
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
    const winner = homeWon > awayWon ? 1 : homeWon < awayWon ? 2 : (tie.goldenSet?.winner ?? 0);
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
      home,
      away,
      homeClub: home.includes("/") ? null : clubOf(home),
      awayClub: away.includes("/") ? null : clubOf(away),
      // The hall (free text, null: not given) and the club arranging the tie when it isn't the home
      // team (Eliteserien's rounds), from badmintonportalen; missing in data fetched before them
      venue: hallOf(tie.venue),
      organiser: tie.organiser ?? null,
      score: [homeWon, awayWon],
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
    played.push({ group, tie, home, away });
  }
}

// Each division's address in its season ("1-divisjon"; with the region, then the age group, when
// two divisions in a season have the same name), in every team match's summary for its links
const slugify = (text) => text.toLowerCase().replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "a").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const divisionKey = (x) => `${x.season}|${x.ageGroup}|${x.region}|${x.division}`;
const slugs = new Map();
for (const { group } of [...played].sort((a, b) => rankOf(a.group) - rankOf(b.group) || a.group.division.localeCompare(b.group.division, "nb"))) {
  const key = divisionKey(group);
  if (slugs.has(key)) continue;
  const taken = new Set([...slugs].filter(([k]) => k.startsWith(`${group.season}|`)).map(([, v]) => v));
  let slug = slugify(group.division) || "division";
  if (taken.has(slug)) slug = `${slug}-${slugify(group.region)}`;
  if (taken.has(slug)) slug = `${slug}-${slugify(group.ageGroup)}`;
  slugs.set(key, slug);
}
for (const t of ties) t.summary.divisionSlug = slugs.get(divisionKey(t.summary));

rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/weeks`, { recursive: true });
for (const t of ties) writeFileSync(`${OUT}/${t.summary.matchId}.json`, JSON.stringify({ ...t.summary, week: t.week, games: t.games, goldenSet: t.goldenSet }));
const byWeek = Map.groupBy(ties, (t) => t.week);
const weeks = [...byWeek.keys()].sort().reverse();
const weekFile = (week) => ({
  week,
  season: byWeek.get(week)[0].summary.season,
  ties: byWeek
    .get(week)
    .sort((a, b) => a.rank - b.rank || a.summary.division.localeCompare(b.summary.division, "nb") || a.summary.group.localeCompare(b.summary.group, "nb") || a.summary.time.localeCompare(b.summary.time) || a.summary.matchId - b.summary.matchId)
    .map((t) => t.summary),
});
for (const week of weeks) writeFileSync(`${OUT}/weeks/${week}.json`, JSON.stringify(weekFile(week)));
// Seasons, newest first, each with its weeks in order: the days played (first and last) and the
// number of team matches. A week's season is its team matches' (no week has two seasons' matches).
const seasons = [...Map.groupBy(weeks, (week) => byWeek.get(week)[0].summary.season)]
  .sort(([a], [b]) => b - a)
  .map(([season, list]) => ({
    season,
    weeks: list.sort().map((week) => {
      const days = byWeek.get(week).map((t) => t.summary.day).sort();
      return { week, from: days[0], to: days.at(-1), ties: days.length };
    }),
  }));
// Divisions: each season's divisions (Eliteserien first, then by level, juniors after), each with
// its groups in order, every group's team matches by time and its power ranking
const weekly = read(`${DIR}data/ratings-weekly.json`).pools;
const current = read(`${DIR}data/ratings.json`).pools;
for (const s of seasons) {
  const inSeason = played.filter((p) => p.group.season === s.season);
  const power = powerRanking(inSeason, weekly, current);
  const byDivision = Map.groupBy(inSeason, (p) => `${p.group.ageGroup}|${p.group.region}|${p.group.division}`);
  s.divisions = [...byDivision.values()]
    .map((list) => {
      const { group } = list[0];
      const slug = slugs.get(divisionKey(group));
      const groups = [...Map.groupBy(list, (p) => p.group.group)]
        .map(([name, l]) => {
          const ids = new Set(l.map((p) => p.tie.matchId));
          return {
            group: name,
            power: power.get(`${group.ageGroup}|${group.division}|${name}`) ?? null,
            ties: ties.filter((t) => ids.has(t.summary.matchId)).map((t) => t.summary).sort((a, b) => a.time.localeCompare(b.time) || a.matchId - b.matchId),
          };
        })
        .sort((a, b) => a.ties[0].time.localeCompare(b.ties[0].time) || a.group.localeCompare(b.group, "nb"));
      return { slug, rank: rankOf(group), season: s.season, ageGroup: group.ageGroup, region: group.region, division: group.division, groups };
    })
    .sort((a, b) => a.rank - b.rank || a.region.localeCompare(b.region, "nb") || a.division.localeCompare(b.division, "nb"));
  mkdirSync(`${OUT}/divisions/${s.season}`, { recursive: true });
  for (const { rank, ...d } of s.divisions) writeFileSync(`${OUT}/divisions/${s.season}/${d.slug}.json`, JSON.stringify(d));
  s.divisions = s.divisions.map((d) => ({
    slug: d.slug,
    ageGroup: d.ageGroup,
    region: d.region,
    division: d.division,
    groups: d.groups.length,
    teams: new Set(d.groups.flatMap((g) => g.ties.flatMap((t) => [t.home, t.away]))).size,
    ties: d.groups.reduce((n, g) => n + g.ties.length, 0),
  }));
}
writeFileSync(`${OUT}/index.json`, JSON.stringify({ generatedAt: new Date().toISOString(), seasons, latest: weeks.length ? weekFile(weeks[0]) : null }));

// The halls: { name, ties, hosts: { club: ties } } (the host: the arranging club, else the home team's)
const halls = new Map();
for (const { summary: s } of ties) {
  if (!s.venue) continue;
  const hall = halls.get(s.venue) ?? { name: s.venue, ties: 0, hosts: {} };
  hall.ties++;
  const host = s.organiser ?? s.homeClub;
  if (host) hall.hosts[host] = (hall.hosts[host] ?? 0) + 1;
  halls.set(s.venue, hall);
}
writeFileSync(`${OUT}/venues.json`, JSON.stringify([...halls.values()].sort((a, b) => b.ties - a.ties || a.name.localeCompare(b.name, "nb"))));
const years = [...new Set(weeks.map((w) => w.slice(0, 4)))];

const upsets = ties.filter((t) => t.summary.upset).length;
console.log(`Wrote ${ties.length} team matches in ${weeks.length} weeks (${years.at(-1)}–${years[0]}): ${upsets} upsets, ${ties.filter((t) => !t.summary.winChance).length} without a rated match.`);

// A season's power ranking, group by group: each team's roster is everyone who played for it that
// season (in any of its groups), at their ratings at the end of the week of the group's last team
// match (missing ones as for Eliteserien, playerRatings). Each team
// fields its best lineup in the group's format (the format of most of its ties) against the group's
// average opponent, and the teams meet lineup against lineup, match by match: a team's power is its
// expected matches won per tie against the group's other teams.
function powerRanking(inSeason, weekly, pools) {
  const byId = Object.fromEntries(Object.entries(pools).map(([pool, list]) => [pool, new Map(list.map((p) => [p.id, p]))]));
  // A player's rating at the end of the week of `day` (today's when the history doesn't reach it)
  const ratingAt = (id, pool, day) => {
    const now = byId[pool].get(id)?.rating ?? null;
    const h = weekly[pool]?.[id];
    if (!h) return now;
    const week = Math.floor((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${h.from}T00:00:00Z`)) / DAY_MS / 7);
    return week < 0 ? null : week < h.ratings.length ? h.ratings[week] : now;
  };
  const sourceAt = (day) => ({ rating: (id, pool) => ratingAt(id, pool, day), name: () => null, club: () => null, points: () => 0, replacement: lowestRatings(pools) });
  const GENDER_OF = { MensSingles: "M", MensDoubles: "M", WomensSingles: "K", WomensDoubles: "K" };
  const genderOf = (id) => Object.values(byId).map((m) => m.get(id)?.gender).find(Boolean);

  // Rosters: age group and team -> players (with the gender seen in their matches when not rated)
  const rosters = new Map();
  for (const { group, tie, home, away } of inSeason) {
    for (const g of tie.games) {
      for (const [n, team] of [[1, home], [2, away]]) {
        const key = `${group.ageGroup}|${team}`;
        if (!rosters.has(key)) rosters.set(key, new Map());
        const roster = rosters.get(key);
        for (const p of g[`side${n}`] ?? []) {
          if (!p.id) continue;
          const seen = roster.get(p.id) ?? { id: p.id, name: p.name, gender: genderOf(p.id) ?? null };
          seen.gender ??= GENDER_OF[g.discipline] ?? null;
          roster.set(p.id, seen);
        }
      }
    }
  }

  const groups = new Map();
  for (const list of Map.groupBy(inSeason, (p) => `${p.group.ageGroup}|${p.group.division}|${p.group.group}`).values()) {
    const { group } = list[0];
    // The format: how many matches of each discipline, from the group's most common list of matches
    const formats = Map.groupBy(list, (p) => p.tie.games.map((g) => POOL_OF[g.discipline]).filter(Boolean).sort().join(","));
    const format = [...formats.keys()].reduce((a, b) => (formats.get(b).length > formats.get(a).length ? b : a)).split(",").filter(Boolean);
    if (!format.length) continue;
    const slots = Object.entries(Object.groupBy(format, (pool) => pool)).map(([pool, l]) => ({ pool, count: l.length }));
    const names = [...new Set(list.flatMap((p) => [p.home, p.away]))];
    const day = list.map((p) => p.tie.time.slice(0, 10)).sort().at(-1);
    const source = sourceAt(day);
    const teams = names.map((team) => ({
      team,
      players: [...(rosters.get(`${group.ageGroup}|${team}`)?.values() ?? [])].filter((p) => p.gender).map((p) => playerRatings({ ...p, listName: p.name }, source)),
    }));
    const ref = powerReferences(teams, slots);
    for (const t of teams) t.lineup = powerLineup(t.players, slots, ref);
    for (const a of teams) {
      const odds = teams.filter((b) => b !== a).map((b) => {
        const chances = [];
        const walkovers = [0, 0];
        for (const { pool, count } of slots) {
          for (let i = 0; i < count; i++) {
            const [x, y] = [a.lineup[pool][i], b.lineup[pool][i]];
            if (x != null && y != null) chances.push(R.expectedScore(x, y, pool));
            else if (x != null) walkovers[0]++;
            else if (y != null) walkovers[1]++;
          }
        }
        return playedOdds(chances, walkovers);
      });
      const mean = (key) => (odds.length ? odds.reduce((sum, o) => sum + o[key], 0) / odds.length : 0);
      a.power = { expected: mean("expected"), win: mean("win"), draw: mean("draw") };
    }
    // What actually happened in the group: matches won per team match (the official scores)
    for (const t of teams) {
      const won = list.flatMap((p) => {
        const [h, a] = p.tie.score.split("-").map(Number);
        return p.home === t.team ? [h] : p.away === t.team ? [a] : [];
      });
      t.actual = won.length ? { matches: won.reduce((x, y) => x + y, 0) / won.length, ties: won.length } : null;
    }
    teams.sort((a, b) => b.power.expected - a.power.expected || b.power.win - a.power.win);
    groups.set(`${group.ageGroup}|${group.division}|${group.group}`, {
      ratingsDay: day,
      matches: format.length,
      teams: teams.map((t, i) => ({
        rank: i + 1,
        team: t.team,
        club: t.team.includes("/") ? null : clubOf(t.team),
        expected: Math.round(t.power.expected * 100) / 100,
        win: round3(t.power.win),
        draw: round3(t.power.draw),
        players: t.players.length,
        // Matches actually won per team match in the group, and its team matches played
        actual: t.actual && { matches: Math.round(t.actual.matches * 100) / 100, ties: t.actual.ties },
      })),
    });
  }
  return groups;
}

// The average opponent in each match of the format, as for Eliteserien (references): the average of
// the best players over the group's teams, the n best for the first match of a discipline, the next n
// for the second, and so on (doubles from the 2n best, as pair averages; mixed from men and women apart)
function powerReferences(teams, slots) {
  const n = teams.length;
  const all = teams.flatMap((t) => t.players);
  const avg = (l) => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : null);
  const top = (gender, pool) => all.filter((p) => p.gender === gender).map((p) => powerRating(p, pool)).sort((a, b) => b - a);
  const ref = {};
  for (const { pool, count } of slots) {
    ref[pool] = Array.from({ length: count }, (_, i) => {
      if (pool === "mixedDoubles") {
        const [m, k] = [avg(top("M", pool).slice(i * n, (i + 1) * n)), avg(top("K", pool).slice(i * n, (i + 1) * n))];
        return m != null && k != null ? R.sideRating([m, k]) : null;
      }
      const size = pool === "men" || pool === "women" ? 1 : 2;
      return avg(top(POWER_GENDER[pool], pool).slice(i * size * n, (i + 1) * size * n));
    });
  }
  return ref;
}

// A team's best lineup, picked greedily: again and again, of the matches not yet filled (each
// discipline's in order), the player or pair with the best chance against the average opponent there,
// with each player in at most 2 matches and one per discipline. Each discipline's sides, strongest
// first (null: no one to field). A greedy pick, not every lineup as for Eliteserien: formats vary,
// and the official ranking points that order the matches aren't known below Eliteserien.
function powerLineup(players, slots, ref) {
  const uses = new Map(players.map((p) => [p, new Set()]));
  const free = (p, pool) => uses.get(p).size < 2 && !uses.get(p).has(pool);
  const sides = (pool) => {
    const ok = players.filter((p) => free(p, pool));
    if (pool === "men" || pool === "women") return ok.filter((p) => p.gender === POWER_GENDER[pool]).map((p) => [p]);
    const pairs = ok.flatMap((a, i) => ok.slice(i + 1).map((b) => [a, b]));
    return pool === "mixedDoubles" ? pairs.filter(([a, b]) => a.gender !== b.gender) : pairs.filter(([a, b]) => a.gender === POWER_GENDER[pool] && b.gender === POWER_GENDER[pool]);
  };
  const lineup = Object.fromEntries(slots.map(({ pool }) => [pool, []]));
  const open = new Map(slots.map(({ pool, count }) => [pool, count]));
  while ([...open.values()].some((c) => c > 0)) {
    let best = null;
    for (const [pool, left] of open) {
      if (!left) continue;
      const opponent = ref[pool][lineup[pool].length] ?? ref[pool].find((r) => r != null);
      for (const side of sides(pool)) {
        const rating = sideRatingOf(side, pool);
        const value = opponent != null ? R.expectedScore(rating, opponent, pool) : rating;
        if (!best || value > best.value) best = { pool, side, rating, value };
      }
    }
    if (!best) break;
    for (const p of best.side) uses.get(p).add(best.pool);
    lineup[best.pool].push(best.rating);
    open.set(best.pool, open.get(best.pool) - 1);
  }
  for (const { pool, count } of slots) {
    lineup[pool].sort((a, b) => b - a);
    while (lineup[pool].length < count) lineup[pool].push(null);
  }
  return lineup;
}
