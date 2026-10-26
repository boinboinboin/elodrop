// Benchmark of alternative Elo settings against the current rules (see BENCHMARK.md).
// Usage: node benchmark.mjs [name filter ...]
//
// Every config rates the full match history; only the games in the benchmark windows are scored
// (decisive games, before the rating update), so each config is judged by how well its ratings
// predicted those games. Prints markdown tables.
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

// New scale: everyone starts at 800 in singles and 400 per player in doubles (a new pair is 800).
const START = { singles: 800, doubles: 400 };
const startOf = (pool) => START[kind(pool)];

// Start ratings without levels: flat, or doubles from the singles rating on the new scale
// (400 + factor · (singles − 800), the singles discipline played most in mixed doubles).
const SINGLES_OF = { mensDoubles: ["men"], womensDoubles: ["women"], mixedDoubles: ["men", "women"] };
const flatSeed = (pool) => startOf(pool);
const singlesSeed = (factor) => (pool, side, _level, players) => {
  if (!DOUBLES.has(pool)) return START.singles;
  const singles = SINGLES_OF[pool].map((sp) => players[sp].get(side.id)).filter(Boolean).sort((a, b) => b.matches - a.matches)[0];
  return singles ? START.doubles + factor * (singles.rating - START.singles) : START.doubles;
};

// m(r) anchored at the pool's start rating instead of P0
const anchoredM = (p, g) => R.ratingMultiplier(p.rating - startOf(g.pool) + R.P0);

// Margin of victory weights. d = point difference / total points; a typical match is d = 0.2.
const margin = (f) => (sets, s) => {
  const d = R.pointMargin(sets);
  return s === 0.5 || d === null ? 1 : f(Math.max(d, 0.02) / 0.2);
};
const MARGINS = {
  current: R.marginWeight, // min(3, x)
  "pow 0.5": margin((x) => Math.min(3, Math.sqrt(x))),
  "pow 0.75": margin((x) => Math.min(3, x ** 0.75)),
  "pow 0.33": margin((x) => Math.min(3, x ** (1 / 3))),
  "damped 0.5": margin((x) => Math.min(1.5, Math.max(0.5, 1 + 0.5 * (x - 1)))),
  none: () => 1,
};

// Chess-style expected score on the standard 400 scale
const expected400 = (ra, rb) => 1 / (1 + 10 ** ((rb - ra) / 400));

// Glicko-1 K, as chess.com rates: each player's change is q·g/(1/RD² + 1/d²)·(S − E), so it
// follows their own uncertainty (large for newcomers, ~10–20 for settled players). Used with
// kappa 1 and an equal doubles split, doubled back: in the pair-sum model a partner's rating
// moves the side's rating one for one, so each partner gets the full Glicko change.
const Q = Math.LN10 / R.SCALE;
const glickoG = (rd) => 1 / Math.sqrt(1 + (3 * Q ** 2 * rd ** 2) / Math.PI ** 2);
let gameExpected = 0.5; // the current game's expected score, set by onGame (E(1 − E) is the same for both sides)
const glickoK = (p, _g, opponents) => {
  const gg = glickoG(Math.sqrt(opponents.reduce((sum, o) => sum + o.rd ** 2, 0)));
  const e = gameExpected;
  return (opponents.length * Q * gg) / (1 / p.rd ** 2 + Q ** 2 * gg ** 2 * e * (1 - e));
};

// The settings the owner wants tested: flat start 800 / 400, no levels, cross-region ×2,
// junior ×1.5, a softer margin weight, m(r) anchored at the start.
const NEW = {
  seedRating: singlesSeed(0.6),
  levelWeight: () => 1,
  juniorK: R.JUNIOR_K,
  crossRegionK: R.CROSS_REGION_K,
  marginWeight: MARGINS["pow 0.5"],
  ratingMultiplier: () => 1,
  playerMultiplier: anchoredM,
  floor: startOf,
};
const CHESS = { ...NEW, playerMultiplier: undefined, expectedScore: expected400 };
// Round 2: the new settings with the junior and cross-region weights that did best in round 1
const BEST = { ...NEW, juniorK: 1, crossRegionK: 1 };
// Round 3, on the current rules. Hybrid: the current K (κ · m(r)) for a player's first `after`
// singles matches, then Glicko's K from their own RD, times `scale` (the class, margin and other
// weights still apply). Doubles keep the current K: there the side's change is shared by RD already.
const hybrid = (after, scale = 1) => ({
  ratingMultiplier: () => 1,
  playerMultiplier: (p, g, opponents) =>
    DOUBLES.has(g.pool) || p.matches < after ? R.ratingMultiplier(p.rating) : (scale * glickoK(p, g, opponents)) / R.KAPPA,
});
// Milder class weights: the class start ratings stay, the K weights are raised to a power < 1
// (0.05 -> 0.22 with the square root, 0.4 -> 0.63), or juniors play at full weight.
const tierWeight = (level) => R.TIERS[level.tier].weight;
const milder = (power) => ({ levelWeight: (level) => tierWeight(level) ** power });
// Round 3: the class weight with the junior weight built in, so each junior class can be set on
// its own. weight(tier, junior) is the whole factor (juniorK 1); the base is the better method from
// round 2 (class weights ^0.75, junior ×1.25, margin pow 0.75).
const classes = (weight) => ({ levelWeight: (level) => weight(level.tier, level.junior), juniorK: 1, marginWeight: MARGINS["pow 0.75"] });
const milderWeight = (tier) => R.TIERS[tier].weight ** 0.75;
// Junior factor per tier: `top` for tier 1 (U19A), `next` for tier 2 (U17A), 1.25 below
const juniorFactors = (top, next = 1.25) => classes((tier, junior) => milderWeight(tier) * (!junior ? 1 : tier === 1 ? top : tier === 2 ? next : 1.25));
// Today's class weights with the junior weight built in the same way
const todayJuniorFactors = (top, next = 1.5) => ({
  levelWeight: (level) => tierWeight(level) * (!level.junior ? 1 : level.tier === 1 ? top : level.tier === 2 ? next : 1.5),
  juniorK: 1,
});
// The method to adopt (round 3): U19A at SEN B's weight, the rest as in round 2
const ADOPTED = juniorFactors(1);
const GLICKO = { ...NEW, playerMultiplier: glickoK, kappa: 1, doublesKappa: 1, doublesSplit: "equal" };

const CONFIGS = [
  ["current", {}],
  ...Object.keys(MARGINS).filter((m) => m !== "current").map((m) => [`current, margin ${m}`, { marginWeight: MARGINS[m] }]),
  ["new", NEW],
  ...[24, 32, 40, 70].map((k) => [`new, κ ${k}`, { ...NEW, kappa: k, doublesKappa: k }]),
  ["new, doubles seed flat", { ...NEW, seedRating: flatSeed }],
  ["new, junior ×1", { ...NEW, juniorK: 1 }],
  ["new, cross-region ×1", { ...NEW, crossRegionK: 1 }],
  ...Object.keys(MARGINS).filter((m) => m !== "pow 0.5").map((m) => [`new, margin ${m}`, { ...NEW, marginWeight: MARGINS[m] }]),
  ...[16, 24, 32, 40].map((k) => [`chess K ${k}`, { ...CHESS, kappa: k, doublesKappa: k }]),
  ...[48, 64].map((k) => [`chess K ${k}`, { ...CHESS, kappa: k, doublesKappa: k }]),
  ["glicko K", GLICKO],
  // Where the new settings lose on settled players: the class weights back (K only, starts stay flat)
  ["new, class weights back", { ...NEW, levelWeight: (level) => R.TIERS[level.tier].weight }],
  ["new, class weights back, κ 70", { ...NEW, levelWeight: (level) => R.TIERS[level.tier].weight, kappa: 70, doublesKappa: 70 }],
  ["best (new, junior ×1, cross-region ×1)", BEST],
  ...[32, 40, 64].map((k) => [`best, κ ${k}`, { ...BEST, kappa: k, doublesKappa: k }]),
  ["best, cross-region ×1.5", { ...BEST, crossRegionK: 1.5 }],
  ...["pow 0.75", "pow 0.33", "damped 0.5", "current"].map((m) => [`best, margin ${m}`, { ...BEST, marginWeight: MARGINS[m] }]),
  ["best, doubles seed flat", { ...BEST, seedRating: flatSeed }],
  // No m(r) at the 300 scale: the same K for every rating (m(r) is about 2 around the start)
  ...[80, 108, 135].map((k) => [`best, no m(r), κ ${k}`, { ...BEST, playerMultiplier: undefined, kappa: k, doublesKappa: k }]),
  ["best, κ 80", { ...BEST, kappa: 80, doublesKappa: 80 }],
  ...[[10, 1], [10, 1.5], [10, 2], [30, 1.5]].map(([after, scale]) => [`hybrid glicko after ${after}, ×${scale}`, hybrid(after, scale)]),
  ["milder levels √", milder(0.5)],
  ["milder levels √, junior ×1", { ...milder(0.5), juniorK: 1 }],
  ["milder levels ^0.75", milder(0.75)],
  ["milder levels ^0.75, junior ×1", { ...milder(0.75), juniorK: 1 }],
  ["milder levels √, junior ×1, margin pow 0.75", { ...milder(0.5), juniorK: 1, marginWeight: MARGINS["pow 0.75"] }],
  ["milder levels √, junior ×1.25, margin pow 0.75", { ...milder(0.5), juniorK: 1.25, marginWeight: MARGINS["pow 0.75"] }],
  ["milder levels ^0.75, margin pow 0.75", { ...milder(0.75), marginWeight: MARGINS["pow 0.75"] }],
  ["milder levels ^0.75, junior ×1.25, margin pow 0.75", { ...milder(0.75), juniorK: 1.25, marginWeight: MARGINS["pow 0.75"] }],
  // The hybrid on the new settings, where Glicko's K did best at the top: the anchored m(r)
  // for the first 10 singles matches, Glicko's K after
  ...[1, 1.5].map((scale) => [`hybrid glicko on best, after 10, ×${scale}`, {
    ...BEST,
    playerMultiplier: (p, g, opponents) =>
      DOUBLES.has(g.pool) || p.matches < 10 ? anchoredM(p, g) : (scale * glickoK(p, g, opponents)) / R.KAPPA,
  }]),
  // U19A at or below the senior top level: 111% in the better method, 128% today
  ["classes: U19A capped at 100%", classes((tier, junior) => Math.min(1, milderWeight(tier) * (junior ? 1.25 : 1)))],
  ["classes: U19A 100%", juniorFactors(1 / milderWeight(1))],
  ["classes: U19A 95%", juniorFactors(0.95 / milderWeight(1))],
  ["classes: U19A 89% (= SEN B)", juniorFactors(1)],
  ["classes: U19A 80%", juniorFactors(0.8 / milderWeight(1))],
  ["classes: U19A 89%, U17A 75%", juniorFactors(1, 0.75 / milderWeight(2))],
  ["classes: U19A 89%, U17A 68% (no junior weight in tiers 1-2)", juniorFactors(1, 1)],
  ["classes: no junior weight at all", classes(milderWeight)],
  ["classes, today's weights: U19A 100%", todayJuniorFactors(1 / 0.85)],
  ["classes, today's weights: U19A 85% (= SEN B)", todayJuniorFactors(1)],
  // A rating floor on the method to adopt, given on the shifted scale (top-level start 800 in
  // singles, 400 per doubles player): shifted floor f is f + 700 / f + 1100 on today's scale
  ...[0, 100, 200].map((f) => [`adopted, floor ${f} (shifted scale)`, { ...ADOPTED, minRating: (pool) => f + (DOUBLES.has(pool) ? 1100 : 700) }]),
  ["milder levels: juniors full weight, junior ×1", { levelWeight: (level) => (level.junior ? 1 : tierWeight(level)), juniorK: 1 }],
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
    gameExpected = ea;
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
