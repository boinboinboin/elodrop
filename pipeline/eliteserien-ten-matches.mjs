// What if an Eliteserien tie were 10 matches instead of 8: a 3rd men's singles and a 2nd men's
// doubles. This season's teams, with the same players and rules, compared with today's format.
// Usage: node eliteserien-ten-matches.mjs   (after rate.mjs; reads the same files as eliteserien.mjs)
//
// A tie of 10: 3 men's singles, 2 women's singles, 2 men's doubles, 1 women's doubles and 2 mixed
// doubles. As today, a player plays at most 2 matches and at most one in each discipline, the
// singles players play in order of singles ranking points, and the first pair in order of combined
// ranking points (men's doubles points for the two men's doubles). A tie is won with 6 matches and
// drawn at 5-5; table points are by the same margins as today: 4-0 for 7-3 or better, 3-1 for 6-4
// and 2-2 for 5-5.
//
// 9 men's places need at least 5 men: Haugerud's list has 4, so one man is added for the test
// (ADDED). Both formats are worked out with the same players, so the difference is the format's.
// Writes data/eliteserien-ten-matches.json.
import { writeFileSync } from "node:fs";
import * as R from "./rules.mjs";
import { SEASON, SLOTS, SLOT_POOL, bestLineup, currentSource, playerRatings, readRoster, references, tieOdds, win } from "./eliteserien.mjs";

const DIR = new URL(".", import.meta.url).pathname;
const MAX_MATCHES = 2;
// Players added to a team's list for the test, because it couldn't fill a 10-match lineup
const ADDED = [{ team: "Haugerud", gender: "M", id: 17711, listName: "Advait Mital", reason: "Haugerud's list has 4 men, and a tie of 10 matches has 9 men's places" }];

export const SLOTS_TEN = [
  { key: "MS1", label: "1. Men's singles", type: "MS" },
  { key: "MS2", label: "2. Men's singles", type: "MS" },
  { key: "MS3", label: "3. Men's singles", type: "MS", added: true },
  { key: "WS1", label: "1. Women's singles", type: "WS" },
  { key: "WS2", label: "2. Women's singles", type: "WS" },
  { key: "MD1", label: "1. Men's doubles", type: "MD" },
  { key: "MD2", label: "2. Men's doubles", type: "MD", added: true },
  { key: "WD", label: "Women's doubles", type: "WD" },
  { key: "XD1", label: "1. Mixed doubles", type: "XD" },
  { key: "XD2", label: "2. Mixed doubles", type: "XD" },
];
// The 8-match slot a 10-match slot compares with (none for the added ones)
const SAME_SLOT = { MS1: "MS1", MS2: "MS2", WS1: "WS1", WS2: "WS2", MD1: "MD", WD: "WD", XD1: "XD1", XD2: "XD2" };

const combinations = (list, k) => (k === 0 ? [[]] : list.flatMap((a, i) => combinations(list.slice(i + 1), k - 1).map((rest) => [a, ...rest])));
const permutations = (list) => (list.length <= 1 ? [list] : list.flatMap((a, i) => permutations([...list.slice(0, i), ...list.slice(i + 1)]).map((rest) => [a, ...rest])));
// Orders allowed by the rules: never fewer ranking points before more
const allowed = (order, pointsOf) => order.every((x, i) => i === 0 || pointsOf(order[i - 1]) >= pointsOf(x));
const best = (options, valueOf) => options.reduce((x, y) => (valueOf(y) > valueOf(x) ? y : x));

// The average opponent in each slot, as in references(): for three slots the 8 best, the next 8 and
// the 8 after; for two men's doubles the 16 best and the next 16 doubles ratings
function referencesTen(teams) {
  const ref = references(teams);
  const n = teams.length;
  const all = teams.flatMap((t) => t.players).filter((p) => p.gender === "M");
  const avg = (list) => list.reduce((a, b) => a + b, 0) / list.length;
  const ms = all.map((p) => p.singles).sort((a, b) => b - a);
  const md = all.map((p) => p.doubles).sort((a, b) => b - a);
  return { ...ref, MS: [...ref.MS, avg(ms.slice(2 * n, 3 * n))], MD: [avg(md.slice(0, 2 * n)), avg(md.slice(2 * n, 4 * n))] };
}

// The best singles and doubles for one gender, for each possible mixed doubles pair: `singles`
// players and `doubles` pairs against the references, within the rules
function bestSide(players, singlesCount, doublesCount, singlesRef, doublesRef, pool) {
  const singlesOptions = combinations(players, singlesCount).map((group) => {
    const order = best(permutations(group).filter((o) => allowed(o, (p) => p.points.singles)), (o) => o.reduce((sum, p, i) => sum + win(p.singles, singlesRef[i]), 0));
    return { order, value: order.reduce((sum, p, i) => sum + win(p.singles, singlesRef[i]), 0) };
  });
  const pairRating = (pair) => R.sideRating(pair.map((p) => p.doubles));
  const pairPoints = (pair) => pair[0].points.doubles + pair[1].points.doubles;
  const doublesValue = (pairs) => pairs.reduce((sum, pair, i) => sum + win(pairRating(pair), [doublesRef].flat()[i], pool), 0);
  // Disjoint pairs from 2 × doublesCount players, in every allowed order
  const splits = (group) => (group.length === 2 ? [[group]] : group.slice(1).map((b) => [[group[0], b], group.filter((p) => p !== group[0] && p !== b)]));
  const doublesOptions = combinations(players, 2 * doublesCount).map((group) => {
    const orders = splits(group).flatMap(permutations).filter((o) => allowed(o, pairPoints));
    const order = best(orders, doublesValue);
    return { order, value: doublesValue(order) };
  });
  const bestByMixed = new Map();
  const mixedPairs = combinations(players, 2);
  for (const s of singlesOptions) {
    for (const d of doublesOptions) {
      const count = new Map();
      for (const p of [...s.order, ...d.order.flat()]) count.set(p, (count.get(p) ?? 0) + 1);
      if ([...count.values()].some((c) => c > MAX_MATCHES)) continue;
      const value = s.value + d.value;
      for (const mixed of mixedPairs) {
        if (mixed.some((p) => (count.get(p) ?? 0) >= MAX_MATCHES)) continue;
        const key = mixed.map((p) => p.listName).join("|");
        if (!bestByMixed.has(key) || bestByMixed.get(key).value < value) bestByMixed.set(key, { value, singles: s.order, doubles: d.order, mixed });
      }
    }
  }
  return [...bestByMixed.values()];
}

// The 10-match lineup with the most expected match wins against the reference opponent in each slot
function bestLineupTen(men, women, ref) {
  const menSides = bestSide(men, 3, 2, ref.MS, ref.MD, "mensDoubles");
  const womenSides = bestSide(women, 2, 1, ref.WS, ref.WD, "womensDoubles");
  let top = null;
  for (const m of menSides) {
    for (const w of womenSides) {
      for (const order of [[0, 1], [1, 0]]) {
        const twoPairs = [[m.mixed[0], w.mixed[order[0]]], [m.mixed[1], w.mixed[order[1]]]].map((pair) => ({
          players: pair,
          rating: R.sideRating([pair[0].mixed, pair[1].mixed]),
          points: pair[0].points.mixed + pair[1].points.mixed,
        }));
        for (const mixed of permutations(twoPairs).filter((o) => allowed(o, (pair) => pair.points))) {
          const value = m.value + w.value + win(mixed[0].rating, ref.XD[0], "mixedDoubles") + win(mixed[1].rating, ref.XD[1], "mixedDoubles");
          if (!top || value > top.value) top = { value, men: m, women: w, mixed };
        }
      }
    }
  }
  if (!top) return null;
  const single = (p) => ({ players: [p], rating: p.singles });
  const double = (pair) => ({ players: pair, rating: R.sideRating([pair[0].doubles, pair[1].doubles]) });
  return {
    MS1: single(top.men.singles[0]),
    MS2: single(top.men.singles[1]),
    MS3: single(top.men.singles[2]),
    WS1: single(top.women.singles[0]),
    WS2: single(top.women.singles[1]),
    MD1: double(top.men.doubles[0]),
    MD2: double(top.men.doubles[1]),
    WD: double(top.women.doubles[0]),
    XD1: top.mixed[0],
    XD2: top.mixed[1],
  };
}

const round = (x, d = 3) => Math.round(x * 10 ** d) / 10 ** d;

// Head to head and each team's strength in one format
function format(teams, slots, lineupKey) {
  const headToHead = {};
  for (const a of teams) {
    headToHead[a.team] = {};
    for (const b of teams) {
      if (a === b) continue;
      const chances = slots.map((s) => win(a[lineupKey][s.key].rating, b[lineupKey][s.key].rating, SLOT_POOL[s.type]));
      headToHead[a.team][b.team] = { ...Object.fromEntries(Object.entries(tieOdds(chances)).map(([k, v]) => [k, round(v)])), matches: chances.map((c) => round(c)) };
    }
  }
  const strength = {};
  for (const t of teams) {
    const games = Object.values(headToHead[t.team]);
    const mean = (key) => games.reduce((sum, g) => sum + g[key], 0) / games.length;
    strength[t.team] = {
      expected: round(mean("expected"), 2), win: round(mean("win")), draw: round(mean("draw")), loss: round(mean("loss")),
      points: round(mean("points"), 2), tablePoints: round(mean("points") * games.length, 1),
    };
  }
  // Predicted table: by expected table points, then expected matches won
  const order = [...teams].sort((a, b) => strength[b.team].tablePoints - strength[a.team].tablePoints || strength[b.team].expected - strength[a.team].expected);
  const rank = Object.fromEntries(order.map((t, i) => [t.team, i + 1]));
  return { headToHead, strength, rank };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const source = currentSource();
  // Ranking points as in playerRatings, with doubles points for the order of the two men's doubles
  const pointsOf = (p) => {
    const male = p.gender === "M";
    const points = (list) => (p.id ? source.points(p.id, list) : 0);
    return { singles: points(male ? "men" : "women"), doubles: points(male ? "mensDoubles" : "womensDoubles"), mixed: points(male ? "mixedMen" : "mixedWomen") };
  };
  const teams = readRoster().map((t) => {
    const added = ADDED.filter((a) => a.team === t.team).map(({ gender, id, listName }) => ({ gender, id, listName, loanFrom: null, added: true }));
    return { ...t, players: [...t.players, ...added].map((p) => ({ ...playerRatings(p, source), added: p.added ?? false, points: pointsOf(p) })) };
  });
  const men = (t) => t.players.filter((p) => p.gender === "M");
  const women = (t) => t.players.filter((p) => p.gender === "K");
  const ref8 = references(teams);
  const ref10 = referencesTen(teams);
  for (const t of teams) {
    t.lineup8 = bestLineup(men(t), women(t), ref8);
    t.lineup10 = bestLineupTen(men(t), women(t), ref10);
    if (!t.lineup10) throw new Error(`${t.team} can't field a lineup of 10 matches`);
  }
  const eight = format(teams, SLOTS, "lineup8");
  const ten = format(teams, SLOTS_TEN, "lineup10");

  const key = (p) => p.id ?? p.listName;
  const lineupOut = (lineup, slots) => Object.fromEntries(slots.map((s) => [s.key, { rating: Math.round(lineup[s.key].rating), players: lineup[s.key].players.map(key) }]));
  // How each player's matches change: the slots they play in each format
  const slotsOf = (lineup, slots, p) => slots.filter((s) => lineup[s.key].players.includes(p)).map((s) => s.key);
  const playerOut = (t) => (p) => ({
    id: p.id, name: p.name, gender: p.gender, loanFrom: p.loanFrom, added: p.added, rated: p.rated,
    singles: Math.round(p.singles), doubles: Math.round(p.doubles), mixed: Math.round(p.mixed), estimated: p.estimated, points: p.points,
    eight: slotsOf(t.lineup8, SLOTS, p), ten: slotsOf(t.lineup10, SLOTS_TEN, p),
  });
  const out = {
    season: SEASON,
    rankingPeriod: source.period,
    generatedAt: new Date().toISOString(),
    added: ADDED.map(({ team, id, listName, reason }) => ({ team, id, name: source.name(id) ?? listName, club: source.club(id), reason })),
    slots: { eight: SLOTS, ten: SLOTS_TEN },
    sameSlot: SAME_SLOT,
    references: {
      eight: Object.fromEntries(Object.entries(ref8).map(([k, v]) => [k, [v].flat().map(Math.round)])),
      ten: Object.fromEntries(Object.entries(ref10).map(([k, v]) => [k, [v].flat().map(Math.round)])),
    },
    teams: [...teams]
      .sort((a, b) => ten.rank[a.team] - ten.rank[b.team])
      .map((t) => ({
        team: t.team,
        rank: { eight: eight.rank[t.team], ten: ten.rank[t.team] },
        strength: { eight: eight.strength[t.team], ten: ten.strength[t.team] },
        lineup: { eight: lineupOut(t.lineup8, SLOTS), ten: lineupOut(t.lineup10, SLOTS_TEN) },
        players: t.players.map(playerOut(t)).sort((a, b) => a.gender.localeCompare(b.gender) || b.singles - a.singles),
      })),
    headToHead: { eight: eight.headToHead, ten: ten.headToHead },
  };
  writeFileSync(`${DIR}data/eliteserien-ten-matches.json`, JSON.stringify(out, null, 1));

  console.log(`Eliteserien ${SEASON} with 10 matches a tie: predicted table (expected table points of 28, 8 matches → 10), matches won per tie, chance of winning a tie:`);
  for (const t of out.teams) {
    const [a, b] = [t.strength.eight, t.strength.ten];
    console.log(
      `${String(t.rank.ten).padStart(2)}. (${t.rank.eight}) ${t.team.padEnd(13)} ${a.tablePoints.toFixed(1).padStart(4)} → ${b.tablePoints.toFixed(1).padStart(4)}  ` +
        `${a.expected.toFixed(2)}/8 → ${b.expected.toFixed(2)}/10  win ${Math.round(a.win * 100)}% → ${Math.round(b.win * 100)}%`,
    );
  }
  for (const t of out.teams) {
    const fmt = (l, slots) => slots.map((s) => `${s.key} ${l[s.key].players.map((k) => t.players.find((p) => key(p) === k).name.split(" ").at(-1)).join("/")} ${l[s.key].rating}`).join(", ");
    console.log(`\n${t.team}\n  8:  ${fmt(t.lineup.eight, SLOTS)}\n  10: ${fmt(t.lineup.ten, SLOTS_TEN)}`);
  }
}
