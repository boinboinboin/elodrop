"use client";

// Since last week in the rankings (pipeline/rate.mjs). RankMovement: how far a player or club has
// moved since last week (the end of the week before the current one): a green up caret and the
// places gained, a red down caret and the places lost, "–" for no change, a blue dot and "new" for
// one who wasn't ranked last week. Each with a text for screen readers. Inside a table sorted by
// another column (data-sorted on the table) they're hidden, since the movement is about the ranking
// order; both stay when the table is sorted by the change since last week (data-sorted="change"),
// where the places gained or lost go with the rating gained or lost.

import { CaretDown, CaretUp } from "@/components/SVG";
import { useI18n } from "@/messages/client";
import { toneClass } from "@/utils/format";

export default function RankMovement({ rank, previous }: { rank: number | null; previous: number | null | undefined }) {
  const { t } = useI18n();
  if (rank === null || previous === undefined) return null;
  if (previous === null)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-blue-700 [[data-sorted]:not([data-sorted=change])_&]:invisible" title={t("common.movement.newTitle")}>
        <span aria-hidden="true" className="w-2 h-2 rounded-full bg-blue-600" />
        {t("common.movement.new")}
      </span>
    );
  const moved = previous - rank;
  if (moved === 0)
    return (
      <span className="text-gray-400 [[data-sorted]:not([data-sorted=change])_&]:invisible" title={t("common.movement.same")}>
        –<span className="sr-only">{t("common.movement.sameScreenReader")}</span>
      </span>
    );
  const up = moved > 0;
  const places = Math.abs(moved);
  return (
    <span className={`whitespace-nowrap tabular-nums [[data-sorted]:not([data-sorted=change])_&]:invisible ${toneClass(moved)}`} title={t(up ? "common.movement.up" : "common.movement.down", { places, previous })}>
      {up ? <CaretUp className="text-[0.7em] align-middle" /> : <CaretDown className="text-[0.7em] align-middle" />} {places}
      <span className="sr-only"> {t(up ? "common.movement.upScreenReader" : "common.movement.downScreenReader")}</span>
    </span>
  );
}

/** The rating (club: strength) gained or lost since last week, in green or red; nothing when unchanged */
export function WeekChange({ change, what = "rating" }: { change: number | null | undefined; what?: "rating" | "strength" }) {
  const { t } = useI18n();
  if (!change) return null;
  const up = change > 0;
  return (
    <span className={`text-sm tabular-nums [[data-sorted]:not([data-sorted=change])_&]:invisible ${toneClass(change)}`} title={t(`common.movement.${what}${up ? "Gained" : "Lost"}`)}>
      {up ? "+" : "−"}
      {Math.abs(change)}
      <span className="sr-only"> {t("common.movement.sinceLastWeek")}</span>
    </span>
  );
}
