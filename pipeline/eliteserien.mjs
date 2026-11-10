// Eliteserien team strengths: each team's best lineup and its chances against the other teams, and the season so far
// with a forecast of the rest (eliteserien-forecast.mjs, from the season's ties in data/league).
// Usage: node eliteserien.mjs   (after rate.mjs; reads data/ratings.json and eliteserien-2026-27.txt)
//        node eliteserien.mjs --season 2025-26 --until 2026-01-24   (a test: an earlier season as it stood after a day)
//
// A tie is 8 matches: 2 men's singles, 2 women's singles, 1 men's doubles, 1 women's doubles and
// 2 mixed doubles. A player plays at most 2 matches, and at most one in each discipline. The first
// singles player must have more official ranking points (badmintonportalen) than the second, and
// the first mixed pair more combined mixed doubles points than the second (on equal points either
// order is allowed). Reads the points from data/ranking/<season>.json (fetch-ranking.mjs).
// Writes data/eliteserien.json, and keeps the forecast's history and the pre-season copy (data/eliteserien-forecast-
// and eliteserien-preseason-2026-27.json).
//
// The model is exported for eliteserien-review.mjs, which runs it on last season with the ratings
// and ranking points from right before each round.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
// (The season and forecast modules import this one too: only functions are used across, so the cycle is harmless)
import { forecastSeason, random } from "./eliteserien-forecast.mjs";
import { applyPlayed, currentPlayers, loggedGame, seasonTies, sourceAt } from "./eliteserien-season.mjs";
import * as R from "./rules.mjs";

const DIR = new URL(".", import.meta.url).pathname;
export const SEASON = "2026/2027";
const CURRENT_KEY = "2026-27";
const ROSTER = `${DIR}eliteserien-${CURRENT_KEY}.txt`;
export const SOURCE = "https://www.badminton.no/siteassets/spillere-i-eliteserien-2026-27.pdf";
const MAX_MATCHES = 2;
export const RANKING = `${DIR}data/ranking/2002026.json`; // official ranking lists for the season
// Slots in the order they are listed, and the pools their ratings come from
export const SLOTS = [
  { key: "MS1", label: "1. Men's singles", type: "MS" },
  { key: "MS2", label: "2. Men's singles", type: "MS" },
  { key: "WS1", label: "1. Women's singles", type: "WS" },
  { key: "WS2", label: "2. Women's singles", type: "WS" },
  { key: "MD", label: "Men's doubles", type: "MD" },
  { key: "WD", label: "Women's doubles", type: "WD" },
  { key: "XD1", label: "1. Mixed doubles", type: "XD" },
  { key: "XD2", label: "2. Mixed doubles", type: "XD" },
];

// Where ratings and ranking points come from: { rating(id, pool) -> rating or null, name(id),
// club(id), points(id, list) -> points, replacement: lowest ratings }. The current one uses today's
// ratings (data/ratings.json) and ranking list.
export function lowestRatings(pools) {
  const lowest = (list) => Math.min(...list.filter((p) => p.rank !== null).map((p) => p.rating));
  return {
    men: lowest(pools.men),
    women: lowest(pools.women),
    mensDoubles: lowest(pools.mensDoubles),
    womensDoubles: lowest(pools.womensDoubles),
    mixedM: lowest(pools.mixedDoubles.filter((p) => p.gender === "M")),
    mixedK: lowest(pools.mixedDoubles.filter((p) => p.gender === "K")),
  };
}
// Official ranking points by player id, per list (players not on a list have 0)
export function rankingPoints(file) {
  const ranking = JSON.parse(readFileSync(file, "utf8"));
  const lists = Object.fromEntries(["men", "women", "mensDoubles", "womensDoubles", "mixedMen", "mixedWomen"].map((list) => [list, new Map((ranking[list] ?? []).map((r) => [r.id, r.points]))]));
  return { period: ranking.period, points: (id, list) => lists[list].get(id) ?? 0 };
}
export function currentSource(rankingFile = RANKING) {
  const { pools } = JSON.parse(readFileSync(`${DIR}data/ratings.json`, "utf8"));
  const byId = Object.fromEntries(Object.entries(pools).map(([pool, list]) => [pool, new Map(list.map((p) => [p.id, p]))]));
  const find = (id) => Object.values(byId).map((m) => m.get(id)).find(Boolean);
  const { period, points } = rankingPoints(rankingFile);
  return {
    rating: (id, pool) => byId[pool].get(id)?.rating ?? null,
    name: (id) => find(id)?.name ?? null,
    club: (id) => find(id)?.club ?? null,
    points,
    period,
    replacement: lowestRatings(pools),
  };
}

// The roster file: [Team] sections of "M|K <id or -> <name> [| loan <club>]"
export function readRoster(file = ROSTER) {
  const teams = [];
  for (const raw of readFileSync(file, "utf8").split("\n")) {
    const line = raw.replace(/#.*/, "").trim();
    const team = line.match(/^\[(.+)\]$/);
    if (team) teams.push({ team: team[1], players: [] });
    const m = line.match(/^([MK])\s+(\d+|-)\s+(.+?)(?:\s*\|\s*loan\s+(.+))?$/);
    if (m) teams.at(-1).players.push({ gender: m[1], id: m[2] === "-" ? null : +m[2], listName: m[3], loanFrom: m[4] ?? null });
  }
  return teams;
}

// A player's ratings for the three kinds of match. Missing doubles ratings come from the singles
// rating, as for a new doubles player (R.doublesSeed); anything else missing counts at
// the lowest rating among ranked players.
export function playerRatings(p, source) {
  const male = p.gender === "M";
  const { replacement } = source;
  const singles = p.id ? source.rating(p.id, male ? "men" : "women") : null;
  const doubles = p.id ? source.rating(p.id, male ? "mensDoubles" : "womensDoubles") : null;
  const mixed = p.id ? source.rating(p.id, "mixedDoubles") : null;
  const seed = singles !== null ? R.doublesSeed(singles) : null;
  return {
    ...p,
    name: (p.id && source.name(p.id)) || p.listName,
    club: (p.id && source.club(p.id)) || null,
    singles: singles ?? replacement[male ? "men" : "women"],
    doubles: doubles ?? seed ?? replacement[male ? "mensDoubles" : "womensDoubles"],
    mixed: mixed ?? seed ?? replacement[male ? "mixedM" : "mixedK"],
    estimated: { singles: singles === null, doubles: doubles === null, mixed: mixed === null },
    points: {
      singles: p.id ? source.points(p.id, male ? "men" : "women") : 0,
      mixed: p.id ? source.points(p.id, male ? "mixedMen" : "mixedWomen") : 0,
    },
    rated: singles !== null || doubles !== null || mixed !== null,
  };
}

const pairs = (list) => list.flatMap((a, i) => list.slice(i + 1).map((b) => [a, b]));
// The orders two players or pairs may play in: more ranking points first; either on equal points
const allowedOrders = ([a, b], pointsOf) =>
  pointsOf(a) > pointsOf(b) ? [[a, b]] : pointsOf(a) < pointsOf(b) ? [[b, a]] : [[a, b], [b, a]];
// The pool of each slot type, for the expected score's scale
export const SLOT_POOL = { MS: "men", WS: "women", MD: "mensDoubles", WD: "womensDoubles", XD: "mixedDoubles" };
export const win = (side, opponent, pool) => R.expectedScore(side, opponent, pool);

// The lineup with the most expected match wins against the reference (average) opponent in each
// slot. Men and women are chosen separately (singles and their doubles) for each possible mixed
// doubles pair of men and of women, then the best combination with mixed pairs is taken.
export function bestLineup(men, women, ref) {
  function bestSide(players, singlesRef, doublesRef) {
    const best = new Map(); // mixed pair key -> { value, singles, doubles }
    const mixedPairs = pairs(players);
    for (const unordered of pairs(players)) {
      // First singles: the player with more singles ranking points (the better order on equal points)
      const singlesValue = (pair) => win(pair[0].singles, singlesRef[0]) + win(pair[1].singles, singlesRef[1]);
      const singles = allowedOrders(unordered, (p) => p.points.singles).reduce((x, y) => (singlesValue(y) > singlesValue(x) ? y : x));
      for (const doubles of pairs(players)) {
        const value = singlesValue(singles) + win(R.sideRating([doubles[0].doubles, doubles[1].doubles]), doublesRef, "mensDoubles");
        for (const mixed of mixedPairs) {
          const used = [...singles, ...doubles, ...mixed];
          if (players.some((p) => used.filter((u) => u === p).length > MAX_MATCHES)) continue;
          const key = mixed.map((p) => p.listName).join("|");
          if (!best.has(key) || best.get(key).value < value) best.set(key, { value, singles, doubles, mixed });
        }
      }
    }
    return [...best.values()];
  }
  const menSides = bestSide(men, ref.MS, ref.MD);
  const womenSides = bestSide(women, ref.WS, ref.WD);
  let best = null;
  for (const m of menSides) {
    for (const w of womenSides) {
      for (const order of [[0, 1], [1, 0]]) {
        const twoPairs = [[m.mixed[0], w.mixed[order[0]]], [m.mixed[1], w.mixed[order[1]]]].map((pair) => ({
          players: pair,
          rating: R.sideRating([pair[0].mixed, pair[1].mixed]),
          points: pair[0].points.mixed + pair[1].points.mixed,
        }));
        // First mixed: the pair with more combined mixed doubles points (the better order on equal points)
        for (const mixed of allowedOrders(twoPairs, (pair) => pair.points)) {
          const value = m.value + w.value + win(mixed[0].rating, ref.XD[0], "mixedDoubles") + win(mixed[1].rating, ref.XD[1], "mixedDoubles");
          if (!best || value > best.value) best = { value, men: m, women: w, mixed };
        }
      }
    }
  }
  if (!best) return null;
  const single = (p) => ({ players: [p], rating: p.singles });
  const double = (pair) => ({ players: pair, rating: R.sideRating([pair[0].doubles, pair[1].doubles]) });
  return {
    MS1: single(best.men.singles[0]),
    MS2: single(best.men.singles[1]),
    WS1: single(best.women.singles[0]),
    WS2: single(best.women.singles[1]),
    MD: double(best.men.doubles),
    WD: double(best.women.doubles),
    XD1: best.mixed[0],
    XD2: best.mixed[1],
  };
}

// The average opponent in each slot: the average rating of the best players across all teams
// (for two slots, the 8 best and the next 8; doubles and mixed as pair averages, R.sideRating).
export function references(teams) {
  const all = teams.flatMap((t) => t.players);
  const top = (list, key) => list.map((p) => p[key]).sort((a, b) => b - a);
  const avg = (list) => list.reduce((a, b) => a + b, 0) / list.length;
  const n = teams.length;
  const men = all.filter((p) => p.gender === "M");
  const women = all.filter((p) => p.gender === "K");
  const ms = top(men, "singles"), ws = top(women, "singles");
  const md = top(men, "doubles"), wd = top(women, "doubles");
  const xm = top(men, "mixed"), xk = top(women, "mixed");
  return {
    MS: [avg(ms.slice(0, n)), avg(ms.slice(n, 2 * n))],
    WS: [avg(ws.slice(0, n)), avg(ws.slice(n, 2 * n))],
    MD: avg(md.slice(0, 2 * n)),
    WD: avg(wd.slice(0, 2 * n)),
    XD: [R.sideRating([avg(xm.slice(0, n)), avg(xk.slice(0, n))]), R.sideRating([avg(xm.slice(n, 2 * n)), avg(xk.slice(n, 2 * n))])],
  };
}

// Table points for a tie by matches won, from the winning margin: 6-2 or better 4, 5-3 3, 4-4 2,
// 3-5 1, otherwise 0 (in a tie of 10 matches, eliteserien-ten-matches.mjs: 7-3 or better 4, 6-4 3, 5-5 2)
export const tablePoints = (won, matches = 8) => {
  const margin = 2 * won - matches;
  return margin >= 4 ? 4 : margin >= 2 ? 3 : margin === 0 ? 2 : margin >= -2 ? 1 : 0;
};

// Chances of winning, drawing (4-4) and losing a tie from the match win chances, the expected
// matches won and the expected table points
export function tieOdds(chances) {
  let dist = [1];
  for (const p of chances) {
    const next = Array(dist.length + 1).fill(0);
    dist.forEach((q, k) => {
      next[k] += q * (1 - p);
      next[k + 1] += q * p;
    });
    dist = next;
  }
  const half = chances.length / 2;
  const sum = (from, to) => dist.slice(from, to).reduce((a, b) => a + b, 0);
  return {
    dist,
    win: sum(half + 1, dist.length),
    draw: dist[half],
    loss: sum(0, half),
    expected: chances.reduce((a, b) => a + b, 0),
    points: dist.reduce((total, p, won) => total + p * tablePoints(won, chances.length), 0),
  };
}

// A tie's odds from the lineups played (eliteserien-review.mjs, team-matches.mjs): the matches played with their win chances for the home
// team, plus walkovers as certain wins for the side given them (as in the actual result); matches
// not played count for neither side.
export function playedOdds(chances, walkovers) {
  let dist = [1]; // dist[k]: chance the home team wins k of the matches played
  for (const p of chances) {
    const next = Array(dist.length + 1).fill(0);
    dist.forEach((q, k) => {
      next[k] += q * (1 - p);
      next[k + 1] += q * p;
    });
    dist = next;
  }
  const odds = { win: 0, draw: 0, loss: 0, expected: walkovers[0], points: 0 };
  dist.forEach((q, k) => {
    const home = walkovers[0] + k;
    const away = walkovers[1] + chances.length - k;
    odds[home > away ? "win" : home < away ? "loss" : "draw"] += q;
    odds.expected += q * k;
    odds.points += q * tablePoints(home);
  });
  return odds;
}
const slugify = (text) => text.toLowerCase().replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "a").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// A team's strength from its odds against each other team: averages per tie, and the expected table points
// over the regular season (one tie against each other team)
export function strengthOf(oddsByOpponent) {
  const games = Object.values(oddsByOpponent);
  const mean = (key) => games.reduce((sum, g) => sum + g[key], 0) / games.length;
  const round = (x, d = 3) => Math.round(x * 10 ** d) / 10 ** d;
  return {
    expected: round(mean("expected"), 2), win: round(mean("win")), draw: round(mean("draw")), loss: round(mean("loss")),
    points: round(mean("points"), 2), tablePoints: round(mean("points") * games.length, 1),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
  // Test runs: another season's teams and ties (--season 2025-26, its ties as the schedule), or only the ties up to a
  // day (--until 2026-01-24); written to --out (default test-runs/eliteserien-test.json), keeping no snapshots
  const KEY = opt("--season") ?? CURRENT_KEY;
  const UNTIL = opt("--until");
  const test = KEY !== CURRENT_KEY || !!UNTIL;
  const year = KEY.slice(0, 4);
  const seasonLabel = `${year}/${+year + 1}`;
  const rankingFile = KEY === CURRENT_KEY ? RANKING : `${DIR}data/ranking/200${year}.json`;
  const outDir = test ? `${DIR}test-runs/` : `${DIR}data/`;
  if (test) mkdirSync(outDir, { recursive: true });
  const players0 = currentPlayers();
  const source = currentSource(rankingFile);
  const round = (x, d = 3) => Math.round(x * 10 ** d) / 10 ** d;

  // The teams with their players' ratings and best lineups (`from`: a player's first match, for those not on the list)
  const rosterTeams = () => readRoster(`${DIR}eliteserien-${KEY}.txt`).map((t) => ({ ...t, players: t.players.map((p) => ({ ...p, from: null })) }));
  const rate = (list, src) => {
    const teams = list.map((t) => ({ team: t.team, players: t.players.map((p) => ({ ...playerRatings(p, src), added: p.added ?? false, movedFrom: p.movedFrom ?? null })) }));
    const ref = references(teams);
    for (const t of teams) t.lineup = bestLineup(t.players.filter((p) => p.gender === "M"), t.players.filter((p) => p.gender === "K"), ref);
    return { teams, ref };
  };

  let { groups, ties } = seasonTies(year);
  // Without a schedule (an earlier season), the ties played are the schedule
  if (KEY !== CURRENT_KEY) groups = groups.map((g) => ({ ...g, schedule: ties.filter((t) => t.group === g.group).map((t) => ({ matchId: t.matchId, time: t.time, home: t.home, away: t.away })) }));
  if (UNTIL) ties = ties.filter((t) => t.day <= UNTIL);
  const rosters = rosterTeams();
  const changes = applyPlayed(rosters, ties, players0.current);
  const { teams, ref } = rate(rosters, source);
  // A game's win chance for side 1 from right before it, from the match logs
  const chanceOf = (tie, game) => loggedGame(tie, game)?.winChance ?? null;

  // Head to head: slot against slot
  const headToHead = {};
  for (const a of teams) {
    headToHead[a.team] = {};
    for (const b of teams) {
      if (a === b) continue;
      const chances = SLOTS.map((s) => win(a.lineup[s.key].rating, b.lineup[s.key].rating, SLOT_POOL[s.type]));
      const { dist, ...odds } = tieOdds(chances);
      headToHead[a.team][b.team] = { ...Object.fromEntries(Object.entries(odds).map(([k, v]) => [k, round(v)])), matches: chances.map((c) => round(c)) };
    }
  }
  for (const t of teams) t.strength = strengthOf(headToHead[t.team]);
  // Strongest first: by expected table points from one tie against each team, then expected matches won
  teams.sort((a, b) => b.strength.tablePoints - a.strength.tablePoints || b.strength.expected - a.strength.expected);

  // The forecast, and the chances over time: a snapshot after every tie played (and one before the season), kept in the
  // raw bucket. Each run adds the ties played since the last one, one at a time in the order they were played, each with
  // the ratings of the night (so the day's ties all with the same lineups); a result registered late, before ties
  // already in, has the snapshots from it on done again
  const historyFile = `${outDir}eliteserien-forecast-${KEY}.json`;
  const saved = test || !existsSync(historyFile) ? [] : JSON.parse(readFileSync(historyFile, "utf8"));
  const run = (played, history) => forecastSeason({ teams, ref, replacement: source.replacement, groups, ties: played, history, chanceOf, rand: random() });
  // Kept: before the season, and the snapshots of the ties up to the first one not in yet (in the order played)
  const firstNew = ties.findIndex((t, i) => saved.find((h) => h.key === String(t.matchId))?.played !== i + 1);
  const keep = new Set(["preseason", ...ties.slice(0, firstNew < 0 ? ties.length : firstNew).map((t) => String(t.matchId))]);
  let history = saved.filter((h) => keep.has(h.key));
  if (!history.some((h) => h.key === "preseason") && !ties.length) history.unshift(run([], []).snapshot);
  for (let k = firstNew < 0 ? ties.length : firstNew; k < ties.length; k++) history.push(run(ties.slice(0, k + 1), history).snapshot);
  const { forecast, eligibility } = run(ties, history);

  const playerOut = (team, p) => ({
    id: p.id, name: p.name, listName: p.listName, gender: p.gender, club: p.club, loanFrom: p.loanFrom, rated: p.rated,
    singles: Math.round(p.singles), doubles: Math.round(p.doubles), mixed: Math.round(p.mixed), estimated: p.estimated, points: p.points,
    added: p.added || undefined, movedFrom: p.movedFrom || undefined,
    eliteserien: eligibility(team, p),
  });
  const lineupOut = (lineup) => Object.fromEntries(SLOTS.map((s) => [s.key, { rating: Math.round(lineup[s.key].rating), players: lineup[s.key].players.map((p) => p.id ?? p.listName) }]));
  const out = {
    season: seasonLabel,
    source: SOURCE,
    rankingPeriod: source.period,
    generatedAt: new Date().toISOString(),
    slots: SLOTS,
    references: Object.fromEntries(Object.entries(ref).map(([k, v]) => [k, Array.isArray(v) ? v.map(Math.round) : Math.round(v)])),
    teams: teams.map((t, i) => ({
      rank: i + 1,
      team: t.team,
      strength: t.strength,
      lineup: lineupOut(t.lineup),
      // The play-off lineup, when the players who may play there change it
      playoffLineup: t.playoffLineup && t.playoffLineup !== t.lineup ? lineupOut(t.playoffLineup) : null,
      players: t.players.map((p) => playerOut(t.team, p)).sort((a, b) => (a.gender === b.gender ? 0 : a.gender === "M" ? -1 : 1) || b.singles - a.singles),
    })),
    headToHead,
    // The division's page on the team match pages (/team-matches/<season>/<slug>; team-matches.mjs names it the same
    // way: the first division of its season with that name)
    division: groups[0] ? { season: +year, slug: slugify(groups[0].division) } : null,
    changes,
    forecast,
    history: history.map(({ next, ...h }) => h),
  };

  // Before the season, kept: written while no tie has been played, then left as it is. Missing once ties have
  // been played (this came after the first round), it's rebuilt from the ratings before the first round
  const preseasonFile = `${outDir}eliteserien-preseason-${KEY}.json`;
  if (!test) {
    if (!ties.length) writeFileSync(preseasonFile, JSON.stringify({ ...out, history: undefined }, null, 1));
    else if (!existsSync(preseasonFile)) {
      const first = forecast.rounds[0]?.from ?? ties[0].day;
      const before = rate(rosterTeams(), sourceAt(first, rankingFile, players0));
      for (const t of before.teams) {
        const h = Object.fromEntries(before.teams.filter((b) => b !== t).map((b) => [b.team, tieOdds(SLOTS.map((s) => win(t.lineup[s.key].rating, b.lineup[s.key].rating, SLOT_POOL[s.type])))]));
        t.strength = strengthOf(h);
      }
      before.teams.sort((a, b) => b.strength.tablePoints - a.strength.tablePoints || b.strength.expected - a.strength.expected);
      const pre = forecastSeason({ ...before, replacement: source.replacement, groups, ties: [], chanceOf, rand: random() });
      writeFileSync(preseasonFile, JSON.stringify({ season: seasonLabel, rebuilt: `ratings before ${first}`, generatedAt: new Date().toISOString(), teams: before.teams.map((t, i) => ({ rank: i + 1, team: t.team, strength: t.strength, lineup: lineupOut(t.lineup) })), forecast: pre.forecast }, null, 1));
      if (!history.some((h) => h.key === "preseason")) history.unshift(pre.snapshot);
      out.history = history.map(({ next, ...h }) => h);
    }
    writeFileSync(historyFile, JSON.stringify(history, null, 1));
  }
  // The table before the season, for comparison
  const preseason = existsSync(preseasonFile) ? JSON.parse(readFileSync(preseasonFile, "utf8")) : null;
  out.preseason = preseason && {
    generatedAt: preseason.generatedAt,
    rebuilt: preseason.rebuilt ?? null,
    table: preseason.teams.map((t) => ({ rank: t.rank, team: t.team, tablePoints: t.strength.tablePoints, expected: t.strength.expected })),
  };
  const outFile = test ? (opt("--out") ?? `${outDir}eliteserien-test.json`) : `${outDir}eliteserien.json`;
  writeFileSync(outFile, JSON.stringify(out, null, 1));

  console.log(`Eliteserien ${seasonLabel}: ${ties.length} ties played${forecast.lastDay ? `, the last on ${forecast.lastDay}` : ""}. Table and forecast (expected points, top 4, title, 7th, 8th):`);
  for (const t of forecast.table) {
    const pct = (x) => `${Math.round(x * 100)}%`.padStart(4);
    console.log(`${t.place}. ${t.team.padEnd(13)} ${String(t.points).padStart(2)} pts (${t.played} played)  → ${t.expectedPoints.toFixed(1).padStart(4)}  ${pct(t.top4)} ${pct(t.champion)} ${pct(t.qualification)} ${pct(t.relegated)}`);
  }
  if (forecast.next) console.log(`Next: ${forecast.next.day} (${forecast.next.round}), ${forecast.next.ties.map((s) => `${s.home}–${s.away} ${Math.round(s.odds.win * 100)}%`).join(", ")}`);
  if (changes.length) console.log(`Team changes against the list: ${changes.map((c) => `${c.name} (${c.team}, ${c.change})`).join("; ")}`);
  const unrated = out.teams.flatMap((t) => t.players.filter((p) => !p.rated).map((p) => `${p.listName} (${t.team})`));
  if (unrated.length) console.log(`Without rated matches: ${unrated.join(", ")}`);
  console.log(`Written: ${outFile.slice(DIR.length)}`);
}
