// Players' genders and which pools compare them
import type { Gender, PairKind, Player, Pool } from "@/types";

/** A player's gender, from their pool entries (null when unknown) */
export const playerGender = (player: Player): Gender | null => Object.values(player.pools).find((p) => p?.gender)?.gender ?? null;

/**
 * Whether players of these genders are compared in a pool: singles and same-gender doubles only
 * between players of that gender (women who play men's singles mostly do so when there are too
 * few for women's singles), mixed doubles between anyone. An unknown gender rules nothing out.
 */
export function comparableIn(pool: Pool, genders: (Gender | null)[]): boolean {
  if (pool === "men" || pool === "mensDoubles") return !genders.includes("K");
  if (pool === "women" || pool === "womensDoubles") return !genders.includes("M");
  return true;
}

/** A doubles pair's kind from its players' genders (null when one is unknown) */
export const pairKind = ([g1, g2]: (Gender | null)[]): PairKind | null =>
  !g1 || !g2 ? null : g1 !== g2 ? "mixed" : g1 === "M" ? "men" : "women";

/** Whether a pair of these genders plays in a doubles pool (an unknown gender rules nothing out) */
export function pairPlaysIn(pool: Pool, genders: (Gender | null)[]): boolean {
  if (pool === "mixedDoubles") return !(genders[0] && genders[0] === genders[1]);
  return comparableIn(pool, genders);
}
