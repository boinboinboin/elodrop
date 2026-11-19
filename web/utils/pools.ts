// The five pools (disciplines) and helpers about them
import type { PairKind, Pool } from "@/types";

export const POOL_KEYS: Pool[] = ["men", "women", "mensDoubles", "womensDoubles", "mixedDoubles"];
// Their names and short codes are in each language's text: i18n.pools, i18n.poolCodes (messages/i18n.ts)
export const isPool = (value: unknown): value is Pool => typeof value === "string" && (POOL_KEYS as string[]).includes(value);

/**
 * The pools in a player's own order (as their page, pipeline/export.mjs POOL_ORDER): their gender's singles, doubles and
 * mixed first, then the other gender's (some play them, and are rated in them too). Without a known gender, men's.
 */
export const poolsInOrder = (gender: "M" | "K" | null | undefined): Pool[] =>
  gender === "K" ? ["women", "womensDoubles", "mixedDoubles", "men", "mensDoubles"] : ["men", "mensDoubles", "mixedDoubles", "women", "womensDoubles"];

/** The doubles pools */
export const DOUBLES_POOLS: Pool[] = ["mensDoubles", "womensDoubles", "mixedDoubles"];
/** Singles: one player per side (the others are pairs) */
export const isSingles = (pool: Pool) => pool === "men" || pool === "women";

/** The discipline of an Eliteserien lineup slot's type ("MS" for MS1 and MS2; pipeline/eliteserien.mjs SLOTS) */
export const SLOT_POOLS: Record<string, Pool> = { MS: "men", WS: "women", MD: "mensDoubles", WD: "womensDoubles", XD: "mixedDoubles" };

/** The doubles pool each kind of pair plays in */
export const KIND_POOLS: Record<PairKind, Pool> = { men: "mensDoubles", women: "womensDoubles", mixed: "mixedDoubles" };
