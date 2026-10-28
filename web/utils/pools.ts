// The five pools (disciplines) and helpers about them
import type { PairKind, Pool } from "@/types";

export const POOL_KEYS: Pool[] = ["men", "women", "mensDoubles", "womensDoubles", "mixedDoubles"];
// Their names and short codes are in each language's text: i18n.pools, i18n.poolCodes (messages/i18n.ts)
export const isPool = (value: unknown): value is Pool => typeof value === "string" && (POOL_KEYS as string[]).includes(value);

/** The doubles pools */
export const DOUBLES_POOLS: Pool[] = ["mensDoubles", "womensDoubles", "mixedDoubles"];
/** Singles: one player per side (the others are pairs) */
export const isSingles = (pool: Pool) => pool === "men" || pool === "women";

/** The doubles pool each kind of pair plays in */
export const KIND_POOLS: Record<PairKind, Pool> = { men: "mensDoubles", women: "womensDoubles", mixed: "mixedDoubles" };
