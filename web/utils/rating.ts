// Rating maths shared with the pipeline (pipeline/rules.mjs)
import type { GenderGapFit } from "@/types";

/** Rating difference scale of the expected score, as SCALE in pipeline/rules.mjs */
const SCALE = 300;
/** A's chance of beating B */
export const expectedScore = (ra: number, rb: number) => 1 / (1 + 10 ** ((rb - ra) / SCALE));

/** A woman's rating in her own discipline on the men's scale: w + a + b·(w − p0) */
export const onMensScale = (w: number, fit: GenderGapFit, p0 = fit.p0) => w + fit.a + fit.b * (w - p0);
