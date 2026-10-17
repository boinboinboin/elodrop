// A player's rating and rank in a head-to-head comparison; for a woman moved onto the men's scale
// (the "just for fun" comparisons), that rating with her own beside it.
import { POOLS, type Side } from "@/lib/data";

export default function SideRating({ side }: { side: Side }) {
  const { entry, pool } = side;
  const rank = entry.rank ? `#${entry.rank}${pool === "mixedDoubles" ? ` among ${entry.gender === "K" ? "women" : "men"}` : ""}` : "not ranked";
  if (side.rating === entry.rating) {
    return (
      <>
        <span className="tabular-nums">{Math.round(entry.rating)}</span> · {rank}
      </>
    );
  }
  return (
    <>
      <span className="tabular-nums">{Math.round(side.rating)}{side.extrapolated ? "*" : ""}</span> on the men&apos;s scale (
      <span className="tabular-nums">{Math.round(entry.rating)}</span> in {POOLS[pool].toLowerCase()}, {rank})
    </>
  );
}
