// Rating maths shared with the pipeline (pipeline/rules.mjs)
import type { GenderGapFit } from "@/types";

/** The top level start rating, as P0 in pipeline/rules.mjs */
export const P0 = 1150;
/** The base K-factor, as KAPPA in pipeline/rules.mjs */
export const KAPPA = 59;
/** How far doubles ratings spread compared with the half-size scale, as DOUBLES_UNIT in pipeline/rules.mjs */
export const DOUBLES_UNIT = 1.6;
/** The doubles base K-factor, as DOUBLES_KAPPA in pipeline/rules.mjs */
export const DOUBLES_KAPPA = KAPPA * DOUBLES_UNIT;
/** No rating goes below this, at the start or after a match: minRatingOf in pipeline/rules.mjs */
export const minRating = (doubles = false) => P0 - (doubles ? 375 * DOUBLES_UNIT : 750);
/** Rating difference scale of the expected score, as SCALE in pipeline/rules.mjs */
const SCALE = 300;
/** The scale for doubles sides (average ratings): scaleOf in pipeline/rules.mjs, SCALE · DOUBLES_UNIT / 2 */
export const DOUBLES_SCALE = (SCALE * DOUBLES_UNIT) / 2;
/** A's chance of beating B (in doubles, with `DOUBLES_SCALE`) */
export const expectedScore = (ra: number, rb: number, scale = SCALE) => 1 / (1 + 10 ** ((rb - ra) / scale));

/** m(r), bigger rating changes below P0 and smaller above, as ratingMultiplier in pipeline/rules.mjs (in doubles over DOUBLES_UNIT times the width) */
export const ratingMultiplier = (r: number, doubles = false) => 1 + 2 / (1 + 2 ** ((r - P0) / (90 * (doubles ? DOUBLES_UNIT : 1))));

/** A doubles pair's rating: the average of its players' ratings, as sideRating in pipeline/rules.mjs */
export const pairRating = (a: number, b: number) => (a + b) / 2;

/** A's chance of beating B in doubles with equally rated partners: the pairs differ by half as much as the players */
export const equalPartnersChance = (ra: number, rb: number) => expectedScore(ra / 2, rb / 2, DOUBLES_SCALE);

/** A woman's rating in her own discipline on the men's scale: w + a + b·(w − p0) */
export const onMensScale = (w: number, fit: GenderGapFit, p0 = fit.p0) => w + fit.a + fit.b * (w - p0);

/** A set's points, [side A, side B] */
export type SetScore = [number, number];

/**
 * The margin of victory weight w_m, as marginWeight in pipeline/rules.mjs: d = |points A − points B|
 * / total points; a typical margin (d = 0.2, e.g. 15-11, 15-10) counts 1, close matches less,
 * blowouts more (at most 3)
 */
export function marginWeight(sets: SetScore[]) {
  const [a, b] = sets.reduce(([x, y], [p, q]) => [x + p, y + q], [0, 0]);
  if (!a && !b) return 1;
  return Math.min(3, (Math.max(0.02, Math.abs(a - b) / (a + b)) / 0.2) ** 0.75);
}

/** A player in a hypothetical match: their rating and its deviation (RD, which shares a doubles side's change) */
export interface MatchPlayer {
  rating: number;
  rd: number;
}

export type HypotheticalMatch =
  | { walkover: true }
  | {
      walkover: false;
      winner: 0 | 1;
      /** Side A's chance of winning */
      chance: number;
      /** The margin of victory weight w_m */
      margin: number;
      /** Per side, per player: the rating change and the rating after */
      changes: number[][];
      after: number[][];
    };

/**
 * What a best-of-three match would do to the players' ratings, rated as in pipeline/rate.mjs at the
 * top level (SEN A, class weight 100%), between clubs in the same region: a side's change is
 * K · (S − E) with K = κ · w_m, and each player's is that times their own m(r). In doubles (sides of
 * two) a side plays at its players' average and its change is shared between them by RD², so a less
 * established player takes more of it. (The pull of doubles ratings towards singles after a match,
 * for players with few doubles matches, is left out.) Null until the score decides the match (a side
 * has won two sets); 15-0, 15-0 (21-0, 21-0) is a walkover entered as a score, which isn't rated
 * (isWalkover in pipeline/rules.mjs).
 */
export function hypotheticalMatch(sides: [MatchPlayer[], MatchPlayer[]], sets: SetScore[]): HypotheticalMatch | null {
  const won = [0, 0];
  for (const [a, b] of sets) {
    if (a === b) return null;
    won[a > b ? 0 : 1]++;
  }
  if (Math.max(...won) !== 2 || sets.length !== won[0] + won[1]) return null;
  if (sets.length === 2 && sets.every(([a, b]) => Math.min(a, b) === 0 && [15, 21].includes(Math.max(a, b)))) return { walkover: true };
  const winner: 0 | 1 = won[0] === 2 ? 0 : 1;
  const doubles = sides[0].length > 1;
  const [ra, rb] = sides.map((side) => side.reduce((sum, p) => sum + p.rating, 0) / side.length);
  const chance = expectedScore(ra, rb, doubles ? DOUBLES_SCALE : SCALE);
  const margin = marginWeight(sets);
  const k = (doubles ? DOUBLES_KAPPA : KAPPA) * margin;
  const results = sides.map((side, i) => {
    const s = (i === winner ? 1 : 0) - (i === 0 ? chance : 1 - chance);
    const variance = side.reduce((sum, p) => sum + p.rd ** 2, 0);
    return side.map((p) => {
      const share = doubles ? p.rd ** 2 / variance : 1;
      // Not below the minimum: a player on it loses less than their opponents gain
      const after = Math.max(minRating(doubles), p.rating + k * share * ratingMultiplier(p.rating, doubles) * s);
      return { change: after - p.rating, after };
    });
  });
  return { walkover: false, winner, chance, margin, changes: results.map((side) => side.map((p) => p.change)), after: results.map((side) => side.map((p) => p.after)) };
}
