// A player's rating and rank in a head-to-head comparison; for a woman moved onto the men's scale
// (the "just for fun" comparisons), that rating with her own beside it.
import { rich, t } from "@/messages/i18n";
import type { PlayerPool, Pool, Side } from "@/types";

/** A player's rank in a pool: "#12", "#3 among women" (mixed doubles ranks men and women apart), or not ranked */
export function rankText(entry: PlayerPool, pool: Pool, capital = false): string {
  if (!entry.rank) return t(capital ? "common.notRanked" : "headToHead.rank.notRankedLower");
  return pool === "mixedDoubles" ? t("headToHead.rank.among", { rank: entry.rank, gender: t(`headToHead.genders.${entry.gender === "K" ? "K" : "M"}`) }) : t("common.rankValue", { rank: entry.rank });
}

export default function SideRating({ side }: { side: Side }) {
  const { entry, pool } = side;
  const rank = rankText(entry, pool);
  if (side.rating === entry.rating) {
    return (
      <>
        <span className="tabular-nums">{Math.round(entry.rating)}</span> · {rank}
      </>
    );
  }
  return rich("headToHead.rank.onMensScale", {
    rating: <span className="tabular-nums">{Math.round(side.rating)}{side.extrapolated ? "*" : ""}</span>,
    own: <span className="tabular-nums">{Math.round(entry.rating)}</span>,
    pool: t(`common.poolsInSentence.${pool}`),
    rank,
  });
}
