// The ranking lists and their URLs. Each list is its own static page, so it is rendered once per
// data update and served from the cache: "/" is men's singles, "/rankings/<list>" the others and
// "/rankings/<list>/inactive" a list with the players who haven't played in the last 12 months.
// The strongest clubs likewise: "/clubs" combined, "/clubs/strongest/<pool>" per discipline.
// (The old "/?pool=...&gender=...&inactive=1" and "/clubs?pool=..." links redirect here, see next.config.ts.)
import { t } from "@/messages/i18n";
import type { Gender, Pool } from "@/types";
import { POOLS } from "./pools";

export interface RankingList {
  pool: Pool;
  /** Mixed doubles ranks men and women separately */
  gender: Gender | null;
}

export const RANKING_LISTS: Record<string, RankingList> = {
  men: { pool: "men", gender: null },
  women: { pool: "women", gender: null },
  mensDoubles: { pool: "mensDoubles", gender: null },
  womensDoubles: { pool: "womensDoubles", gender: null },
  mixedDoubles: { pool: "mixedDoubles", gender: "M" },
  "mixedDoubles-women": { pool: "mixedDoubles", gender: "K" },
};

export const rankingSlug = (pool: Pool, gender: Gender | null = null) => (pool === "mixedDoubles" && gender === "K" ? "mixedDoubles-women" : pool);

export function rankingHref(pool: Pool, gender: Gender | null = null, inactive = false): string {
  const slug = rankingSlug(pool, gender);
  if (slug === "men" && !inactive) return "/";
  return `/rankings/${slug}${inactive ? "/inactive" : ""}`;
}

export const strongestClubsHref = (pool: Pool | "combined") => (pool === "combined" ? "/clubs" : `/clubs/strongest/${pool}`);

/** A list's name: "Men's singles", "Mixed doubles, women" (the pages' titles) */
export const rankingListTitle = (list: RankingList | undefined) =>
  !list ? t("rankings.metadata.title") : list.gender ? t("rankings.metadata.withGender", { pool: POOLS[list.pool], gender: t(list.gender === "K" ? "rankings.genders.women" : "rankings.genders.men") }) : POOLS[list.pool];
