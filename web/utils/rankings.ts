// The ranking lists and their URLs. Each list is its own static page, so it is rendered once per
// data update and served from the cache: "/rankings" is men's singles, "/rankings/<list>" the others and
// "/rankings/<list>/inactive" a list with the players who haven't played in the last 12 months, and
// "/rankings/junior" and "/rankings/junior/<list>" the junior rankings (U19); "/rankings/combined" and
// "/rankings/combined/women" the combined rankings (singles, doubles and mixed doubles), also under "/rankings/junior".
// The strongest clubs likewise: "/clubs" combined, "/clubs/strongest/<pool>" per discipline.
// (The old "/?pool=...&gender=...&inactive=1" and "/clubs?pool=..." links redirect here, and "/ranking"
// and "/rankings/men" to "/rankings", see next.config.ts.)
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
  if (slug === "men" && !inactive) return "/rankings";
  return `/rankings/${slug}${inactive ? "/inactive" : ""}`;
}

/** A junior ranking (U19): "/rankings/junior" is men's singles, "/rankings/junior/<list>" the others */
export function juniorRankingHref(pool: Pool, gender: Gender | null = null): string {
  const slug = rankingSlug(pool, gender);
  return slug === "men" ? "/rankings/junior" : `/rankings/junior/${slug}`;
}

/** A combined ranking: "/rankings/combined" (men) and "/rankings/combined/women", under "/rankings/junior" for juniors */
export const combinedRankingHref = (gender: Gender, junior = false) => `/rankings${junior ? "/junior" : ""}/combined${gender === "K" ? "/women" : ""}`;

export const strongestClubsHref = (pool: Pool | "combined") => (pool === "combined" ? "/clubs" : `/clubs/strongest/${pool}`);

/** A list's name: "Men's singles", "Mixed doubles, women" (the pages' titles) */
export const rankingListTitle = (list: RankingList | undefined) =>
  !list ? t("rankings.metadata.title") : list.gender ? t("rankings.metadata.withGender", { pool: POOLS[list.pool], gender: t(list.gender === "K" ? "rankings.genders.women" : "rankings.genders.men") }) : POOLS[list.pool];
