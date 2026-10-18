// Since last week in the rankings (pipeline/rate.mjs). RankMovement: how far a player or club has moved since last week (the end of the week before the
// current one, pipeline/rate.mjs): a green ▲ and the places gained, a red ▼ and the places lost,
// "–" for no change, a blue dot and "new" for one who wasn't ranked last week. Each with a text for
// screen readers.
export default function RankMovement({ rank, previous }: { rank: number | null; previous: number | null | undefined }) {
  if (rank === null || previous === undefined) return null;
  if (previous === null)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-blue-700" title="Not ranked last week">
        <span aria-hidden="true" className="w-2 h-2 rounded-full bg-blue-600" />
        new
      </span>
    );
  const moved = previous - rank;
  if (moved === 0)
    return (
      <span className="text-gray-400" title="Same place as last week">
        –<span className="sr-only">no change since last week</span>
      </span>
    );
  const up = moved > 0;
  return (
    <span className={`whitespace-nowrap tabular-nums ${up ? "text-green-700" : "text-red-700"}`} title={`${up ? "Up" : "Down"} ${Math.abs(moved)} since last week (was #${previous})`}>
      <span aria-hidden="true" className="text-[0.7em] align-middle">{up ? "▲" : "▼"}</span> {Math.abs(moved)}
      <span className="sr-only"> {up ? "places up" : "places down"} since last week</span>
    </span>
  );
}

/** The rating (club: strength) gained or lost since last week, in green or red; nothing when unchanged */
export function WeekChange({ change, what = "rating" }: { change: number | null | undefined; what?: string }) {
  if (!change) return null;
  const up = change > 0;
  return (
    <span className={`text-sm tabular-nums ${up ? "text-green-700" : "text-red-700"}`} title={`${what} ${up ? "gained" : "lost"} since last week`}>
      {up ? "+" : "−"}
      {Math.abs(change)}
      <span className="sr-only"> since last week</span>
    </span>
  );
}
