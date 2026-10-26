// The rating rules from README.md, as data and small pure functions.
// Keep this file in sync with the README: it is the spec.

// Top level start rating, in singles and doubles alike: the reference point of m(r) and the not
// playing penalty. Only rating differences decide the expected score, so where the scale starts is a
// choice, not a change in predictions.
export const P0 = 1150;
// The doubles model was tuned on per-player ratings where a side plays at the sum of its two
// players' ratings (the "half-size" scale). Doubles ratings are DOUBLES_UNIT times that, measured
// from P0, so they read like singles ratings, and a side plays at the average of its two players'.
// Everything doubles measures in rating points is DOUBLES_UNIT times its half-size value (K, the class
// start ratings below P0, the singles seed, the minimum, m(r)'s width, the rating deviation), and the
// expected score's scale for an average is SCALE · DOUBLES_UNIT / 2. So every expected score and
// rating change is the same for any DOUBLES_UNIT: it only sets how far doubles ratings spread. 1.6
// puts the top doubles ratings about level with the top singles ratings.
export const DOUBLES_UNIT = 1.6;
const DOUBLES_POOLS = new Set(["mensDoubles", "womensDoubles", "mixedDoubles"]);
export const unitOf = (pool) => (DOUBLES_POOLS.has(pool) ? DOUBLES_UNIT : 1);
// A side's rating: its player's, or in doubles the average of the two
export const sideRating = (ratings) => ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
// No rating goes below this, at the start or after a match: 750 below P0 in singles (375 on the
// half-size doubles scale): the weakest players' ratings, mostly in doubles, otherwise sink further
// than their results justify. Tested in BENCHMARK.md: this predicted best without costing on settled
// players.
export const minRatingOf = (pool) => P0 - (DOUBLES_POOLS.has(pool) ? 375 * DOUBLES_UNIT : 750);
// Bump when the ratings move to a new scale: tournament draw analyses locked on another scale are
// analysed again (upcoming.mjs), so they don't mix ratings from two scales.
export const RATING_SCALE = 6;
export const KAPPA = 59; // base K-factor
// Doubles: base K-factor for a side, and how its rating change is shared between the partners:
// "rd" by each partner's uncertainty (RD²), so a new player takes most of it; "equal" half each.
// Doubles uses the singles κ (on the doubled scale): tuned on doubles games before 2023, and again in
// BENCHMARK.md. "rd" and "equal" tied before 2023, "rd" better on 2023+.
export const DOUBLES_KAPPA = KAPPA * DOUBLES_UNIT;
export const DOUBLES_SPLIT = "rd";
// A doubles player's start rating comes from their singles rating when they have played singles:
// P0 + DOUBLES_SINGLES_SEED · DOUBLES_UNIT · (singles rating − P0).
export const DOUBLES_SINGLES_SEED = 0.7;
export const doublesSeed = (singles) => Math.max(minRatingOf("mensDoubles"), P0 + DOUBLES_SINGLES_SEED * DOUBLES_UNIT * (singles - P0));
// After each doubles match, a player with fewer than `matches` doubles matches who has played
// singles moves a share `share` of the way towards the doubles rating their singles rating gives
// (doublesSeed, from the singles discipline they have played most): a doubles rating otherwise lags
// behind the player's level for a long time. The biggest gain in BENCHMARK.md (rounds 4-7).
export const DOUBLES_PULL = { share: 0.03, matches: 200 };
// K-factor multiplier for matches in junior classes and leagues, in every discipline: juniors
// improve faster than the junior class weights let their ratings follow. But no junior class counts
// more than U19A, which counts like SEN B (tier 1, no junior weight): junior results shouldn't count
// more than the senior top level, and capping cost nothing (BENCHMARK.md).
export const JUNIOR_K = 1.5;
export const juniorWeight = (level) =>
  !level.junior || level.tier <= 1 ? 1 : Math.min(JUNIOR_K, TIERS[1].weight / TIERS[level.tier].weight);
// Rating difference scale of the expected score: a difference of SCALE points means a 91% win chance.
export const SCALE = 300;

// Level tiers, from the "Class levels" table: K weight, and start rating below the top level
// (in doubles DOUBLES_START_SPREAD times as far).
// A player's start rating is the start of the tier of their first rated match. The weights are the
// original 100/85/60/40/25/10/5% to the power 0.6, which lets lower classes count more.
const CLASS_POWER = 0.6;
export const TIERS = [
  { weight: 1.0, below: 0 }, // 0: SEN X/E/A, Eliteserien, 1st div 1. HS/DS
  { weight: 0.85 ** CLASS_POWER, below: 75 }, // 1: U19A/X, SEN B, O35-O45, 1st div other games, Junior NM for lag (91%)
  { weight: 0.6 ** CLASS_POWER, below: 150 }, // 2: U17A/X, SEN C, O50-O55, 2nd div, U17 leagues (74%)
  { weight: 0.4 ** CLASS_POWER, below: 225 }, // 3: U15A/X, SEN D, O60+, 3rd div, U15 leagues (58%)
  { weight: 0.25 ** CLASS_POWER, below: 300 }, // 4: U13A/X, U19B, U17B, U13 leagues (44%)
  { weight: 0.1 ** CLASS_POWER, below: 375 }, // 5: U11A, U15B, U13B, 4th div, other senior series (25%)
  { weight: 0.05 ** CLASS_POWER, below: 450 }, // 6: other (17%)
];
// Doubles start ratings are this many times as far below P0 as singles ones (1.25 on the half-size scale)
export const DOUBLES_START_SPREAD = 1.25 * DOUBLES_UNIT;

export const startRating = ({ tier }, pool) =>
  Math.max(minRatingOf(pool), P0 - TIERS[tier].below * (DOUBLES_POOLS.has(pool) ? DOUBLES_START_SPREAD : 1));
// Players from foreign clubs (no Norwegian region) start this many points (in doubles DOUBLES_UNIT
// times as many) above their class's start rating, at most at P0: their first class says less about
// them, and they were underrated.
export const FOREIGN_START_BONUS = 100;

// Games between players from clubs in different regional associations (kretser) count
// this many times more, so isolated regions are calibrated against the rest faster.
export const CROSS_REGION_K = 1.5;

// Tournament class, e.g. "SEN A", "U15 X", "O45 A", "Åpen HC".
export function tournamentLevel(className) {
  const [age, letter = ""] = className.trim().split(/\s+/);
  const junior = /^U\d+$/.test(age);
  const ax = letter === "A" || letter === "X";
  let tier = 6;
  if (age === "SEN") tier = { X: 0, E: 0, A: 0, B: 1, C: 2, D: 3 }[letter] ?? 6;
  else if (/^O\d+$/.test(age)) {
    const years = +age.slice(1);
    tier = years <= 45 ? 1 : years <= 55 ? 2 : 3;
  } else if (age === "U19") tier = ax ? 1 : letter === "B" ? 4 : 6;
  else if (age === "U17") tier = ax ? 2 : letter === "B" ? 4 : 6;
  else if (age === "U15") tier = ax ? 3 : letter === "B" ? 5 : 6;
  else if (age === "U13") tier = ax ? 4 : letter === "B" ? 5 : 6;
  else if (age === "U11") tier = letter === "A" ? 5 : 6;
  return { tier, junior };
}

// Team league game: age group, division name (free text) and game code ("1. HS", "2. DS", ...).
export function leagueLevel(ageGroup, division, game) {
  const d = division.toLowerCase();
  if (ageGroup === "SEN") {
    const firstGame = /^1\./.test(game);
    let tier = 5; // other senior series
    if (/elite?se?rie/.test(d)) tier = 0; // incl. typos like "Elitesrien" and qualification
    else if (/kvalifikasjon 1\.? ?div/.test(d)) tier = 2; // qualification for the 1st div
    else if (/2\.? og 3\.? ?div/.test(d)) tier = 3; // combined 2nd/3rd div
    else if (/(^|[^\d])1\.? ?div/.test(d)) tier = firstGame ? 0 : 1;
    else if (/(^|[^\d])2\.? ?div/.test(d)) tier = 2;
    else if (/(^|[^\d])3\.? ?div/.test(d)) tier = 3;
    else if (/(^|[^\d])4\.? ?div/.test(d)) tier = 5;
    return { tier, junior: false };
  }
  if (ageGroup === "U19") return { tier: /\bnm\b/.test(d) ? 1 : 2, junior: true }; // else U17/U19 singles series
  if (ageGroup === "U17") return { tier: 2, junior: true };
  if (ageGroup === "U15") {
    if (/nybegynner/.test(d)) return { tier: 6, junior: true };
    if (/singelserie/.test(d)) return { tier: 4, junior: true }; // U13/U15 singles series
    return { tier: 3, junior: true };
  }
  if (ageGroup === "U13") return { tier: 4, junior: true };
  return { tier: 6, junior: /^U\d+$/.test(ageGroup) }; // Åpen (internal club events) and anything unknown
}

// "21/18,15/21,21/9" -> [[21, 18], [15, 21], [21, 9]]
export const parseSets = (score) =>
  score
    .split(",")
    .filter((s) => /^\d+\/\d+$/.test(s))
    .map((s) => s.split("/").map(Number));

// 21-0, 21-0 (15-0, 15-0 from the 2026/2027 season, with sets to 15) is a walkover entered as a score.
export const isWalkover = (match, sets, day = "") => {
  const target = day >= SCORING_15_FROM ? 15 : 21;
  return match.walkover || (sets.length === 2 && sets.every(([a, b]) => Math.min(a, b) === 0 && Math.max(a, b) === target));
};

// Set formats: [points to win, cap]. A set is won by 2 points up to the cap, where one point wins.
// From the 2026/2027 season sets go to 15 (cap 21) instead of 21 (cap 30); some junior classes
// play to 11 (cap 15). A score that fits none of the formats of its season is probably a typo or a
// placeholder (e.g. 21-1 for a no-show) and is listed in data/suspicious-scores.txt for review.
export const SCORING_15_FROM = "2026-07-01";
const SET_FORMATS = { old: [[21, 30], [15, 21], [11, 15]], new: [[15, 21], [11, 15]] };
const fitsFormat = ([a, b], [target, cap]) => {
  const [w, l] = a > b ? [a, b] : [b, a];
  return (w === target && l <= target - 2) || (w > target && w < cap && l === w - 2) || (w === cap && l >= cap - 2 && l < cap);
};
export const scoreFitsSeason = (sets, day) =>
  sets.every((set) => SET_FORMATS[day >= SCORING_15_FROM ? "new" : "old"].some((format) => fitsFormat(set, format)));

// Edit distance between two strings, counting a swap of neighbouring characters as one edit
// (optimal string alignment): "12" -> "21" is one typo.
function editDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

// Every valid (winner, loser) score of a set format
function validSets([target, cap]) {
  const sets = [];
  for (let l = 0; l <= target - 2; l++) sets.push([target, l]);
  for (let w = target + 1; w < cap; w++) sets.push([w, w - 2]);
  sets.push([cap, cap - 2], [cap, cap - 1]);
  return sets;
}

// The most likely intended score for a score that breaks the season's set formats, assuming a
// single typo per wrong set, or null if there is no clear fix. The match's format is the one most
// of its sets fit. Each wrong set becomes the valid score of that format with the same set winner
// that is one typo away (a digit changed, added, removed or two digits swapped), preferring the
// smallest change in points and then keeping the winner's score. Sets as [side 1, side 2].
export function suggestScore(sets, day) {
  const formats = SET_FORMATS[day >= SCORING_15_FROM ? "new" : "old"];
  const fitting = formats.map((format) => sets.filter((set) => fitsFormat(set, format)).length);
  const most = Math.max(...fitting);
  if (most === 0) return null; // no set fits any format: the match was played some other way
  const format = formats[fitting.indexOf(most)];
  const fixed = [];
  for (const [a, b] of sets) {
    if (fitsFormat([a, b], format)) {
      fixed.push([a, b]);
      continue;
    }
    if (a === b) return null;
    const [w, l] = a > b ? [a, b] : [b, a];
    const ranked = validSets(format)
      .map(([cw, cl]) => ({
        set: [cw, cl],
        cost: [editDistance(String(w), String(cw)) + editDistance(String(l), String(cl)), Math.abs(w - cw) + Math.abs(l - cl), cw === w ? 0 : 1],
      }))
      .sort((x, y) => x.cost[0] - y.cost[0] || x.cost[1] - y.cost[1] || x.cost[2] - y.cost[2]);
    const [best, next] = ranked;
    if (best.cost[0] !== 1) return null; // not a single typo
    if (next && next.cost.every((c, i) => c === best.cost[i])) return null; // two equally likely fixes
    fixed.push(a > b ? best.set : [best.set[1], best.set[0]]);
  }
  return fixed;
}

// Score for side 1 (1, 0.5 or 0), or null if the match can't be rated.
export function result(match, sets) {
  if (match.winner === 1) return 1;
  if (match.winner === 2) return 0;
  const won1 = sets.filter(([a, b]) => a > b).length;
  const won2 = sets.filter(([a, b]) => b > a).length;
  if (sets.length === 2 && won1 === 1 && won2 === 1) return 0.5; // two-set leagues can end 1-1
  return null; // unplayed
}

// Margin of victory: K scales with the point difference d = |points A - points B| / total points.
// A typical margin (d = 0.2, e.g. 21-15, 21-13) keeps K; close matches count less, blowouts more,
// to the power 0.75 so neither extreme counts as much as a linear weight would.
const MARGIN = { reference: 0.2, min: 0.02, cap: 3, power: 0.75 };
export function marginWeight(sets, s) {
  const d = pointMargin(sets);
  if (s === 0.5 || d === null) return 1;
  return Math.min(MARGIN.cap, (Math.max(MARGIN.min, d) / MARGIN.reference) ** MARGIN.power);
}

// d = |points A - points B| / total points, or null without a score.
export function pointMargin(sets) {
  const [a, b] = sets.reduce(([x, y], [p, q]) => [x + p, y + q], [0, 0]);
  return a + b ? Math.abs(a - b) / (a + b) : null;
}

// m(r): bigger rating changes below P0, smaller above (in doubles over DOUBLES_UNIT times the width).
export const ratingMultiplier = (r, pool) => 1 + 2 / (1 + 2 ** ((r - P0) / (90 * unitOf(pool))));

// The expected score's scale: SCALE, and for the average ratings of doubles sides SCALE · DOUBLES_UNIT / 2
export const scaleOf = (pool) => (DOUBLES_POOLS.has(pool) ? (SCALE * DOUBLES_UNIT) / 2 : SCALE);
export const expectedScore = (ra, rb, pool) => 1 / (1 + 10 ** ((rb - ra) / scaleOf(pool)));

// Rating uncertainty (Glicko-1 rating deviation, RD). Shown as rating ± 2·RD; in singles it doesn't
// affect how ratings change (in doubles it splits a side's change). New players start at RD_MAX; matches shrink RD, time without
// playing grows it back to RD_MAX over about RD_RETURN_DAYS (from an RD of 40).
// Fitted on the data: with these values, predictions widened by RD fit best unscaled.
export const RD_MAX = 260;
export const DOUBLES_RD_MAX = 130 * DOUBLES_UNIT; // calibrated on doubles (block performance check, see README)
const RD_RETURN_DAYS = 10 * 365;
const RD_GROWTH = Math.sqrt((RD_MAX ** 2 - 40 ** 2) / RD_RETURN_DAYS); // c in Glicko, per day

// max: the pool's RD_MAX (doubles may use a smaller one); growth scales with it.
export const rdAfterTime = (rd, days, max = RD_MAX) =>
  Math.min(max, Math.sqrt(rd ** 2 + (RD_GROWTH * max / RD_MAX) ** 2 * days));

// RD after one match: the player's side rated ra against an opposing side rated rb with deviation
// rdb, in the pool's expected score scale. In doubles the sides are averages, and a player's rating
// moves their side's by half, so the match tells a quarter as much about it.
export function rdAfterMatch(ra, rd, rb, rdb, pool) {
  const q = Math.LN10 / scaleOf(pool);
  const g = 1 / Math.sqrt(1 + (3 * q ** 2 * rdb ** 2) / Math.PI ** 2);
  const e = 1 / (1 + 10 ** ((-g * (ra - rb)) / scaleOf(pool)));
  const share = DOUBLES_POOLS.has(pool) ? 0.5 : 1;
  const information = (share * q) ** 2 * g ** 2 * e * (1 - e); // 1 / d^2 in Glicko
  return Math.sqrt(1 / (1 / rd ** 2 + information));
}

// Covid-19 periods (inclusive dates, ISO strings compare correctly).
const COVID = [
  { from: "2020-03-18", to: "2020-10-10", penalty: 0, k: 0.5 },
  { from: "2020-10-11", to: "2021-02-01", penalty: 0.5, k: 0.5 },
  { from: "2021-02-02", to: "2021-07-24", penalty: 0.5, k: 1 },
  { from: "2021-07-25", to: "2021-11-15", penalty: 0.7, k: 1 },
  { from: "2021-11-16", to: "2022-03-08", penalty: 0.9, k: 1 },
];
const covidPeriod = (day) => COVID.find((p) => day >= p.from && day <= p.to);
export const covidK = (day) => covidPeriod(day)?.k ?? 1;
export const covidPenalty = (day) => covidPeriod(day)?.penalty ?? 1;

// Days between two ISO dates (from inclusive, to exclusive), with Covid periods
// counting at their reduced not playing penalty rate.
const DAY_MS = 86_400_000;
const dayNumber = (day) => Date.parse(`${day}T00:00:00Z`) / DAY_MS;
function weightedDays(from, to, periods, rateOf) {
  let days = Math.max(0, dayNumber(to) - dayNumber(from));
  for (const p of periods) {
    const overlap = Math.min(dayNumber(to), dayNumber(p.to) + 1) - Math.max(dayNumber(from), dayNumber(p.from));
    if (overlap > 0) days -= overlap * (1 - rateOf(p));
  }
  return days;
}
export const penaltyDays = (from, to) => weightedDays(from, to, COVID, (p) => p.penalty);

// Not playing penalty. After `graceDays` without playing, the part of the rating above
// `floor` (P0) decays: it halves every `halfLifeDays` (null = no penalty). Ratings at or
// below the floor are not affected. Off: ratings without it predicted better than with any
// half-life tested (BENCHMARK.md, rounds 4-7); a half-life of 3 years was used before.
export const INACTIVITY = { graceDays: 365, halfLifeDays: null, floor: P0 };

// A player is active (ranked, and counted for their club's strength) while they have played within
// this many days. During Covid-19 the time without playing counts slower: not at all from 2020-03-18
// to 2020-10-10, when hardly anything was played, and at half speed until 2021-07-24. Without this,
// most players went inactive at once and club strengths dropped through 2020 and 2021.
export const RANKING_ACTIVE_DAYS = 365;

// Who is ranked in a pool, by gender: men's singles and doubles rank men, women's rank women
// (women mostly play men's singles when there are too few entries for women's singles, so their
// ranks there say little; they keep their rating). Mixed doubles ranks men and women separately,
// and players of unknown gender only where their gender doesn't matter.
export const rankedIn = (pool, gender) =>
  pool === "men" || pool === "mensDoubles" ? gender !== "K" : pool === "women" || pool === "womensDoubles" ? gender !== "M" : gender != null;
const COVID_ACTIVITY = [
  { from: "2020-03-18", to: "2020-10-10", rate: 0 },
  { from: "2020-10-11", to: "2021-07-24", rate: 0.5 },
];
// Days without playing between two ISO dates (from inclusive, to exclusive), Covid-adjusted
export const inactiveDays = (from, to) => weightedDays(from, to, COVID_ACTIVITY, (p) => p.rate);
// Whether a player who last played on `lastPlayed` is still active on `day`
export const isActive = (lastPlayed, day) => inactiveDays(lastPlayed, day) <= RANKING_ACTIVE_DAYS;
