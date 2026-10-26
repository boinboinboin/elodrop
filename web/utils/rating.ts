// Rating maths shared with the pipeline (pipeline/rules.mjs)
import type { GenderGapFit } from "@/types";

/** The top level start rating, as P0 in pipeline/rules.mjs */
export const P0 = 1150;
/** The base K-factor, as KAPPA in pipeline/rules.mjs */
export const KAPPA = 59;
/** Rating difference scale of the expected score, as SCALE in pipeline/rules.mjs */
const SCALE = 300;
/** The scale for doubles sides (average ratings): scaleOf in pipeline/rules.mjs, SCALE · DOUBLES_UNIT / 2 */
export const DOUBLES_SCALE = (SCALE * 1.6) / 2;
/** A's chance of beating B (in doubles, with `DOUBLES_SCALE`) */
export const expectedScore = (ra: number, rb: number, scale = SCALE) => 1 / (1 + 10 ** ((rb - ra) / scale));

/** m(r), bigger rating changes below P0 and smaller above, as ratingMultiplier in pipeline/rules.mjs (singles) */
export const ratingMultiplier = (r: number) => 1 + 2 / (1 + 2 ** ((r - P0) / 90));

/** A doubles pair's rating: the average of its players' ratings, as sideRating in pipeline/rules.mjs */
export const pairRating = (a: number, b: number) => (a + b) / 2;

/** A's chance of beating B in doubles with equally rated partners: the pairs differ by half as much as the players */
export const equalPartnersChance = (ra: number, rb: number) => expectedScore(ra / 2, rb / 2, DOUBLES_SCALE);

/** A woman's rating in her own discipline on the men's scale: w + a + b·(w − p0) */
export const onMensScale = (w: number, fit: GenderGapFit, p0 = fit.p0) => w + fit.a + fit.b * (w - p0);
