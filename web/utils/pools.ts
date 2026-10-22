// The five pools (disciplines) and helpers about them
import { t } from "@/messages/i18n";
import type { PairKind, Pool } from "@/types";

export const POOL_KEYS: Pool[] = ["men", "women", "mensDoubles", "womensDoubles", "mixedDoubles"];
/** Each pool's name ("Men's singles") */
export const POOLS = Object.fromEntries(POOL_KEYS.map((pool) => [pool, t(`common.pools.${pool}`)])) as Record<Pool, string>;
/** Each pool's short code ("MS"), where five names don't fit in a row */
export const POOL_CODES = Object.fromEntries(POOL_KEYS.map((pool) => [pool, t(`common.poolCodes.${pool}`)])) as Record<Pool, string>;
export const isPool = (value: unknown): value is Pool => typeof value === "string" && value in POOLS;

/** The doubles pools */
export const DOUBLES_POOLS: Pool[] = ["mensDoubles", "womensDoubles", "mixedDoubles"];
/** Singles: one player per side (the others are pairs) */
export const isSingles = (pool: Pool) => pool === "men" || pool === "women";

/** The doubles pool each kind of pair plays in */
export const KIND_POOLS: Record<PairKind, Pool> = { men: "mensDoubles", women: "womensDoubles", mixed: "mixedDoubles" };
