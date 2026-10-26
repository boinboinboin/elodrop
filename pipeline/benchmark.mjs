// Benchmark of Elo settings against the current rules (see BENCHMARK.md).
// Usage: node benchmark.mjs [name filter ...]
//
// Every config rates the full match history; only the games in the benchmark windows are scored
// (decisive games, before the rating update), so each config is judged by how well its ratings
// predicted those games. A config overrides computeRatings' hooks (see rate.mjs); "floor" sets the
// not playing penalty floor. Prints markdown tables, with the current rules as the reference.
// The configs of the tests in BENCHMARK.md (rounds 1-3 and the rating floor) are in commit f68b101.
import * as R from "./rules.mjs";
import { collectGames, computeRatings } from "./rate.mjs";

const WINDOWS = [
  { key: "2025/26", from: "2025-07-01", to: "2026-07-01" },
  { key: "2026/27", from: "2026-07-01", to: "9999-12-31" },
  { key: "holdout 2023–25", from: "2023-07-01", to: "2025-07-01" },
];
const SETTLED_MATCHES = 10;
const DOUBLES = new Set(["mensDoubles", "womensDoubles", "mixedDoubles"]);
const kind = (pool) => (DOUBLES.has(pool) ? "doubles" : "singles");

// Margin of victory weights. d = point difference / total points; a typical match is d = 0.2.
const margin = (f) => (sets, s) => {
  const d = R.pointMargin(sets);
  return s === 0.5 || d === null ? 1 : f(Math.max(d, 0.02) / 0.2);
};

// The rules before v1.14.0: top level start 1500 in both singles and doubles, class weights
// 100/85/60/40/25/10/5%, junior ×1.5 (U19A included), a linear margin weight and no rating floor.
// Doubles on the doubled scale of today's rules (R.DOUBLES_UNIT), which predicts the same.
const OLD_P0 = 1500;
const OLD_WEIGHTS = [1, 0.85, 0.6, 0.4, 0.25, 0.1, 0.05];
const SINGLES_OF = { mensDoubles: ["men"], womensDoubles: ["women"], mixedDoubles: ["men", "women"] };
const PREVIOUS = {
  startRating: (level, pool) => R.unitOf(pool) * (OLD_P0 - R.TIERS[level.tier].below),
  // Doubles from the singles rating; null leaves it to startRating
  seedRating: (pool, side, _level, players) => {
    const singles = (SINGLES_OF[pool] ?? []).map((sp) => players[sp].get(side.id)).filter(Boolean).sort((a, b) => b.matches - a.matches)[0];
    return singles ? R.unitOf(pool) * (OLD_P0 + R.DOUBLES_SINGLES_SEED * (singles.rating - OLD_P0)) : null;
  },
  levelWeight: (level) => OLD_WEIGHTS[level.tier],
  juniorK: 1.5,
  marginWeight: margin((x) => Math.min(3, x)),
  ratingMultiplier: (r, pool) => 1 + 2 / (1 + 2 ** ((r - R.unitOf(pool) * OLD_P0) / (90 * R.unitOf(pool)))),
  floor: (pool) => R.unitOf(pool) * OLD_P0,
  minRating: () => -Infinity,
};

const CONFIGS = [
  ["current", {}],
  ["previous rules (before v1.14.0)", PREVIOUS],
];

function run(games, config) {
  const { floor, ...options } = config;
  const inactivity = floor ? { ...R.INACTIVITY, floor } : R.INACTIVITY;
  const stats = new Map(); // `${window}|${kind}|${subset}` -> { n, logLoss, brier, correct }
  const add = (key, ea, s) => {
    const x = stats.get(key) ?? { n: 0, logLoss: 0, brier: 0, correct: 0 };
    x.n++;
    x.logLoss -= Math.log(s === 1 ? ea : 1 - ea);
    x.brier += (s - ea) ** 2;
    if ((ea > 0.5) === (s === 1)) x.correct++;
    stats.set(key, x);
  };
  const onGame = (g, side1, side2, ea) => {
    if (g.s === 0.5) return;
    const w = WINDOWS.find((w) => g.day >= w.from && g.day < w.to);
    if (!w) return;
    const settled = [...side1, ...side2].every((p) => p.matches >= SETTLED_MATCHES);
    // top: SEN X/E/A, Eliteserien, 1st div (tier 0) and U19A, SEN B, O35-45 (tier 1)
    const subsets = ["all", settled && "settled", g.crossRegion && "cross-region", g.level.tier <= 1 && "top level"].filter(Boolean);
    for (const subset of subsets) {
      add(`${w.key}|${kind(g.pool)}|${subset}`, ea, g.s);
      add(`${w.key}|${g.pool}|${subset}`, ea, g.s);
    }
  };
  const { players } = computeRatings(games, inactivity, { weekly: false, onGame, ...options });
  // Average rating per pool at the end (all players), to check for drift
  const mean = Object.fromEntries(Object.entries(players).map(([pool, map]) => {
    const list = [...map.values()];
    return [pool, list.reduce((sum, p) => sum + p.rating, 0) / list.length];
  }));
  return { stats, mean };
}

const filters = process.argv.slice(2);
const games = collectGames();
const results = [];
for (const [name, config] of CONFIGS) {
  if (filters.length && !filters.some((f) => name.includes(f)) && name !== "current") continue;
  const t = Date.now();
  results.push({ name, ...run(games, config) });
  console.error(`${name}: ${((Date.now() - t) / 1000).toFixed(1)}s`);
}

const get = (r, key) => r.stats.get(key);
const ll = (x) => (x ? x.logLoss / x.n : NaN);
const base = results[0];
const delta = (r, key) => ((ll(get(r, key)) - ll(get(base, key))) * 1000).toFixed(1).replace(/^(?!-)/, "+");

// Summary: log loss per window and kind, all games and settled, the current rules in full and
// every other config as the change in thousandths (negative = better).
for (const subset of ["all", "settled", "cross-region", "top level"]) {
  const cols = WINDOWS.flatMap((w) => ["singles", "doubles"].map((k) => `${w.key}|${k}|${subset}`));
  console.log(`\n### Log loss, ${subset} games (current in full, others: change in thousandths)\n`);
  console.log(`| Config | ${WINDOWS.flatMap((w) => [`${w.key} singles`, `${w.key} doubles`]).join(" | ")} |`);
  console.log(`| --- | ${cols.map(() => "---:").join(" | ")} |`);
  for (const r of results) {
    const cells = cols.map((c) => (r === base ? ll(get(r, c)).toFixed(4) : delta(r, c)));
    console.log(`| ${r.name} | ${cells.join(" | ")} |`);
  }
  console.log(`\nGames: ${cols.map((c) => `${c.split("|").slice(0, 2).join(" ")} ${get(base, c)?.n}`).join(", ")}`);
}

// Favourite won and Brier, all games in the benchmark seasons
console.log(`\n### Favourite won and Brier score, all games\n`);
const bench = WINDOWS.slice(0, 2).flatMap((w) => ["singles", "doubles"].map((k) => `${w.key}|${k}|all`));
console.log(`| Config | ${bench.map((c) => c.split("|").slice(0, 2).join(" ")).join(" | ")} |`);
console.log(`| --- | ${bench.map(() => "---:").join(" | ")} |`);
for (const r of results) {
  const cells = bench.map((c) => {
    const x = get(r, c);
    return `${((100 * x.correct) / x.n).toFixed(1)}% · ${(x.brier / x.n).toFixed(4)}`;
  });
  console.log(`| ${r.name} | ${cells.join(" | ")} |`);
}

// Per pool, benchmark seasons together (all games), log loss
console.log(`\n### Log loss per pool, 2025/26 and 2026/27 together, all games\n`);
const POOLS = ["men", "women", "mensDoubles", "womensDoubles", "mixedDoubles"];
console.log(`| Config | ${POOLS.join(" | ")} |`);
console.log(`| --- | ${POOLS.map(() => "---:").join(" | ")} |`);
for (const r of results) {
  const cells = POOLS.map((pool) => {
    const xs = WINDOWS.slice(0, 2).map((w) => get(r, `${w.key}|${pool}|all`)).filter(Boolean);
    return (xs.reduce((s, x) => s + x.logLoss, 0) / xs.reduce((s, x) => s + x.n, 0)).toFixed(4);
  });
  console.log(`| ${r.name} | ${cells.join(" | ")} |`);
}

console.log(`\n### Average rating at the end, per pool\n`);
console.log(`| Config | ${POOLS.join(" | ")} |`);
console.log(`| --- | ${POOLS.map(() => "---:").join(" | ")} |`);
for (const r of results) console.log(`| ${r.name} | ${POOLS.map((p) => Math.round(r.mean[p])).join(" | ")} |`);
