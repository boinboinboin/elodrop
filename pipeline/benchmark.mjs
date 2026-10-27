// Benchmark of Elo settings against the current rules (see BENCHMARK.md).
// Usage: node benchmark.mjs [name filter ...] [--seasons] [--calibration] [--stability]
//
// Every config rates the full match history; only decisive games are scored, before the rating
// update, so each config is judged by how well its ratings predicted those games. A config overrides
// computeRatings' hooks (see rate.mjs); "floor" sets the not playing penalty floor and "inactivity"
// the whole not playing penalty. The current rules are the reference: the other configs show the
// change in log loss in thousandths (negative = better), with a 95% interval. Games in the same
// tournament or tie are related (the same players, ratings moving together), so the interval is
// clustered by tournament and tie rather than by game.
//   --seasons      the change on all games in every season since 2017/18
//   --calibration  predicted against actual win rates of the favourites, for the selected configs
//   --stability    how much the top 100 of each ranking moves from week to week
// The configs of the tests in BENCHMARK.md are in git history: rounds 1-3 and the rating floor in
// commit f68b101, rounds 4-8 in the commit before they were adopted.
import * as R from "./rules.mjs";
import { collectGames, computeRatings } from "./rate.mjs";

const BENCHMARK_FROM = "2025-07-01"; // 2025/26 and 2026/27
const HOLDOUT = { from: "2023-07-01", to: "2025-07-01" };
const SEASONS_FROM = 2017;
const SETTLED_MATCHES = 10;
const DOUBLES = new Set(["mensDoubles", "womensDoubles", "mixedDoubles"]);
const POOLS = ["men", "women", "mensDoubles", "womensDoubles", "mixedDoubles"];
const kind = (pool) => (DOUBLES.has(pool) ? "doubles" : "singles");
const seasonOf = (day) => (+day.slice(5, 7) >= 7 ? +day.slice(0, 4) : +day.slice(0, 4) - 1);
const unit = R.unitOf;

// Margin of victory weights. d = point difference / total points; a typical match is d = 0.2.
const margin = (f, reference = 0.2) => (sets, s) => {
  const d = R.pointMargin(sets);
  return s === 0.5 || d === null ? 1 : f(Math.max(d, 0.02) / reference);
};

// Earlier rules, rebuilt through the hooks. Doubles on today's doubled scale (R.DOUBLES_UNIT), which
// predicts the same. Neither has the foreign start or the doubles pull.
const OLD_WEIGHTS = [1, 0.85, 0.6, 0.4, 0.25, 0.1, 0.05];
const SINGLES_OF = { mensDoubles: ["men"], womensDoubles: ["women"], mixedDoubles: ["men", "women"] };
// A doubles player's singles state (the singles discipline played most), or undefined
const singlesOf = (pool, id, players) => (SINGLES_OF[pool] ?? []).map((sp) => players[sp].get(id)).filter(Boolean).sort((a, b) => b.matches - a.matches)[0];
// min: the minimum rating per pool
const earlier = ({ p0, min, classPower, junior, juniorTop, linearMargin }) => ({
  kappa: 54,
  doublesKappa: 54 * R.DOUBLES_UNIT,
  startRating: (level, pool) => Math.max(min(pool), p0 - R.TIERS[level.tier].below * unit(pool)),
  seedRating: (pool, side, _level, players) => {
    const singles = singlesOf(pool, side.id, players);
    return singles ? Math.max(min(pool), p0 + 0.6 * unit(pool) * (singles.rating - p0)) : null;
  },
  levelWeight: (level) => OLD_WEIGHTS[level.tier] ** classPower,
  juniorK: (level) => (!level.junior || (!juniorTop && level.tier <= 1) ? 1 : junior),
  marginWeight: linearMargin ? margin((x) => Math.min(3, x)) : margin((x) => Math.min(3, x ** 0.75)),
  crossRegionK: 2,
  ratingMultiplier: (r, pool) => 1 + 2 / (1 + 2 ** ((r - p0) / (90 * unit(pool)))),
  inactivity: { ...R.INACTIVITY, halfLifeDays: 1095, floor: p0 },
  minRating: min,
  foreignBonus: null,
  doublesPull: null,
});
// The rules before rounds 4-8 (start 1100, minimum 350; class weights ^0.75, junior ×1.25, a
// 3-year half-life), on today's scale; and the rules before v1.14.0 (start 1500, no minimum, the
// original class weights, junior ×1.5 including U19A, a linear margin weight)
const BEFORE_ROUND_4 = earlier({ p0: R.P0, min: R.minRatingOf, classPower: 0.75, junior: 1.25, juniorTop: false });
const PREVIOUS = earlier({ p0: 1500 * 1, min: () => -Infinity, classPower: 1, junior: 1.5, juniorTop: true, linearMargin: true });

const CONFIGS = [
  ["current", {}],
  ["before rounds 4-8 (start 1100, minimum 350)", BEFORE_ROUND_4],
  ["previous rules (before v1.14.0)", PREVIOUS],
  ["no not playing penalty (v1.14.0 to v1.16.0)", { inactivity: { ...R.INACTIVITY, halfLifeDays: null } }],
];

// Per game (by index in games): what it is, for the subsets, filled in on the first run
let meta = null;
function run(games, config, { weekly = false } = {}) {
  const { floor, inactivity: penalty, ...options } = config;
  const inactivity = penalty ?? (floor ? { ...R.INACTIVITY, floor } : R.INACTIVITY);
  const index = new Map(games.map((g, i) => [g, i]));
  const expected = new Float64Array(games.length).fill(NaN);
  const first = !meta;
  if (first) meta = { settled: new Uint8Array(games.length), sources: new Map(), source: new Int32Array(games.length) };
  const onGame = (g, side1, side2, ea) => {
    if (g.s === 0.5) return;
    const i = index.get(g);
    expected[i] = ea;
    if (first) {
      meta.settled[i] = [...side1, ...side2].every((p) => p.matches >= SETTLED_MATCHES) ? 1 : 0;
      if (!meta.sources.has(g.source)) meta.sources.set(g.source, meta.sources.size);
      meta.source[i] = meta.sources.get(g.source);
    }
  };
  const { players } = computeRatings(games, inactivity, { weekly, onGame, ...options });
  return { expected, players };
}

const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith("--")));
const filters = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const games = collectGames();
const results = [];
for (const [name, config] of CONFIGS) {
  if (filters.length && !filters.some((f) => name.includes(f)) && name !== "current") continue;
  const t = Date.now();
  results.push({ name, ...run(games, config, { weekly: flags.has("--stability") }) });
  console.error(`${name}: ${((Date.now() - t) / 1000).toFixed(1)}s`);
}
const base = results[0];

// The games of a subset: indices of scored games passing the test
const scored = games.map((g, i) => i).filter((i) => !Number.isNaN(base.expected[i]));
const loss = (ea, s) => -Math.log(s === 1 ? ea : 1 - ea);
const select = (test) => scored.filter((i) => test(games[i], i));
const inBenchmark = (g) => g.day >= BENCHMARK_FROM;
const inHoldout = (g) => g.day >= HOLDOUT.from && g.day < HOLDOUT.to;
const isKind = (k) => (g) => kind(g.pool) === k;
const SUBSETS = [
  ["All S", (g) => inBenchmark(g) && isKind("singles")(g)],
  ["All D", (g) => inBenchmark(g) && isKind("doubles")(g)],
  ["Settled S", (g, i) => inBenchmark(g) && isKind("singles")(g) && meta.settled[i]],
  ["Settled D", (g, i) => inBenchmark(g) && isKind("doubles")(g) && meta.settled[i]],
  // top: SEN X/E/A, Eliteserien, 1st div (tier 0) and U19A, SEN B, O35-45 (tier 1)
  ["Top S", (g) => inBenchmark(g) && isKind("singles")(g) && g.level.tier <= 1],
  ["Top D", (g) => inBenchmark(g) && isKind("doubles")(g) && g.level.tier <= 1],
  ["Holdout S", (g) => inHoldout(g) && isKind("singles")(g)],
  ["Holdout D", (g) => inHoldout(g) && isKind("doubles")(g)],
].map(([label, test]) => ({ label, games: select(test) }));

const meanLoss = (r, list) => list.reduce((sum, i) => sum + loss(r.expected[i], games[i].s), 0) / list.length;
// The change in log loss from the reference and its 95% interval, clustered by tournament and tie
function change(r, list) {
  const diffs = new Map(); // cluster -> [sum of differences, games]
  let total = 0;
  for (const i of list) {
    const d = loss(r.expected[i], games[i].s) - loss(base.expected[i], games[i].s);
    total += d;
    const c = diffs.get(meta.source[i]) ?? [0, 0];
    c[0] += d;
    c[1]++;
    diffs.set(meta.source[i], c);
  }
  const n = list.length;
  const mean = total / n;
  let variance = 0;
  for (const [sum, count] of diffs.values()) variance += (sum - count * mean) ** 2;
  const clusters = diffs.size;
  const se = Math.sqrt((variance * clusters) / (clusters - 1)) / n;
  return { mean: mean * 1000, ci: 1.96 * se * 1000 };
}
const signed = (x) => (x >= 0.05 ? "+" : x <= -0.05 ? "−" : "±") + Math.abs(x).toFixed(1);

console.log(`### Log loss: current rules, and the change for each config (thousandths, 95% interval)\n`);
console.log(`Benchmark: ${BENCHMARK_FROM} on (2025/26 and 2026/27); holdout: ${HOLDOUT.from} to ${HOLDOUT.to}. S singles, D doubles; settled: every player 10+ matches; top: tiers 0-1.\n`);
console.log(`| Config | ${SUBSETS.map((s) => s.label).join(" | ")} |`);
console.log(`| --- | ${SUBSETS.map(() => "---:").join(" | ")} |`);
for (const r of results) {
  const cells = SUBSETS.map((s) => {
    if (r === base) return meanLoss(r, s.games).toFixed(4);
    const { mean, ci } = change(r, s.games);
    return `${signed(mean)} ±${ci.toFixed(1)}`;
  });
  console.log(`| ${r.name} | ${cells.join(" | ")} |`);
}
console.log(`\nGames: ${SUBSETS.map((s) => `${s.label} ${s.games.length}`).join(", ")}`);

if (flags.has("--seasons")) {
  const last = seasonOf(games.at(-1).day);
  const seasons = Array.from({ length: last - SEASONS_FROM + 1 }, (_, i) => SEASONS_FROM + i);
  const cols = seasons.flatMap((y) => ["singles", "doubles"].map((k) => ({ label: `${String(y).slice(2)}/${String(y + 1).slice(2)} ${k[0].toUpperCase()}`, games: select((g) => seasonOf(g.day) === y && kind(g.pool) === k) })));
  console.log(`\n### All games per season: the change in thousandths (seasons better / worse beyond the interval)\n`);
  console.log(`| Config | ${cols.map((c) => c.label).join(" | ")} | Better | Worse |`);
  console.log(`| --- | ${cols.map(() => "---:").join(" | ")} | ---: | ---: |`);
  for (const r of results.slice(1)) {
    const changes = cols.map((c) => change(r, c.games));
    const better = changes.filter((c) => c.mean + c.ci < 0).length;
    const worse = changes.filter((c) => c.mean - c.ci > 0).length;
    console.log(`| ${r.name} | ${changes.map((c) => signed(c.mean)).join(" | ")} | ${better} | ${worse} |`);
  }
}

if (flags.has("--calibration")) {
  // The favourite's predicted chance against how often favourites won, from 2023/24 on
  const BINS = [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0001];
  const groups = [
    ["singles", (g) => isKind("singles")(g)],
    ["doubles", (g) => isKind("doubles")(g)],
    ["top singles", (g) => isKind("singles")(g) && g.level.tier <= 1],
    ["top doubles", (g) => isKind("doubles")(g) && g.level.tier <= 1],
  ];
  for (const r of results) {
    console.log(`\n### Calibration, ${r.name}: favourites' predicted and actual win rate, ${HOLDOUT.from} on\n`);
    console.log(`| Predicted | ${groups.map(([label]) => label).join(" | ")} |`);
    console.log(`| --- | ${groups.map(() => "---:").join(" | ")} |`);
    for (let b = 0; b < BINS.length - 1; b++) {
      const cells = groups.map(([, test]) => {
        let n = 0, predicted = 0, won = 0;
        for (const i of scored) {
          const g = games[i];
          if (g.day < HOLDOUT.from || !test(g)) continue;
          const ea = r.expected[i];
          const fav = Math.max(ea, 1 - ea);
          if (fav < BINS[b] || fav >= BINS[b + 1]) continue;
          n++;
          predicted += fav;
          won += (ea >= 0.5) === (g.s === 1) ? 1 : 0;
        }
        return n ? `${((100 * predicted) / n).toFixed(1)} → ${((100 * won) / n).toFixed(1)}% (${n})` : "";
      });
      console.log(`| ${Math.round(BINS[b] * 100)}–${Math.min(100, Math.round(BINS[b + 1] * 100))}% | ${cells.join(" | ")} |`);
    }
  }
}

if (flags.has("--stability")) {
  // Each week from 2023/24 on: players active then (a match in the 365 days before the week's end)
  // ranked by their rating at the end of the week; the change in rank of the top 100 from the week
  // before (players in the top 100 both weeks), averaged over the weeks
  const DAY = 86_400_000;
  const toTime = (day) => Date.parse(`${day}T00:00:00Z`);
  const start = toTime("2023-07-03");
  const end = toTime(games.at(-1).day);
  console.log(`\n### Rank stability: average change in rank per week in the top 100, 2023/24 on\n`);
  console.log(`| Config | ${POOLS.join(" | ")} | Average |`);
  console.log(`| --- | ${POOLS.map(() => "---:").join(" | ")} | ---: |`);
  for (const r of results) {
    const perPool = POOLS.map((pool) => {
      const list = [...r.players[pool].values()].map((p) => ({ from: toTime(p.firstWeek), weekly: p.weekly, days: p.log.map((l) => toTime(l.day)) }));
      let previous = null, total = 0, count = 0;
      for (let w = start; w <= end; w += 7 * DAY) {
        const weekEnd = w + 7 * DAY;
        const ranked = [];
        for (const [k, p] of list.entries()) {
          let last = -Infinity;
          for (const d of p.days) if (d < weekEnd) last = d; else break;
          if (weekEnd - last > 365 * DAY) continue;
          const at = Math.floor((w - p.from) / (7 * DAY));
          const rating = p.weekly[Math.min(at, p.weekly.length - 1)];
          if (rating != null) ranked.push([k, rating]);
        }
        ranked.sort((a, b) => b[1] - a[1]);
        const top = new Map(ranked.slice(0, 100).map(([k], i) => [k, i]));
        if (previous) for (const [k, i] of top) if (previous.has(k)) { total += Math.abs(i - previous.get(k)); count++; }
        previous = top;
      }
      return total / count;
    });
    console.log(`| ${r.name} | ${perPool.map((x) => x.toFixed(2)).join(" | ")} | ${(perPool.reduce((a, b) => a + b, 0) / POOLS.length).toFixed(2)} |`);
  }
  // Drift: the average rating of everyone, and of the players active in the last 12 months
  console.log(`\n### Average rating at the end: all players / active players\n`);
  console.log(`| Config | ${POOLS.join(" | ")} |`);
  console.log(`| --- | ${POOLS.map(() => "---:").join(" | ")} |`);
  const last = toTime(games.at(-1).day);
  for (const r of results) {
    const cells = POOLS.map((pool) => {
      const list = [...r.players[pool].values()];
      const active = list.filter((p) => last - toTime(p.lastPlayed) <= 365 * DAY);
      const avg = (l) => Math.round(l.reduce((sum, p) => sum + p.rating, 0) / l.length);
      return `${avg(list)} / ${avg(active)}`;
    });
    console.log(`| ${r.name} | ${cells.join(" | ")} |`);
  }
}
