"use client";

// Players grouped by rating class (utils/classes.ts), for the rankings (RankingTable) and a club's players
// (components/clubs/ClubPlayers.tsx): in rating order, each class is its own <tbody> under a header row with its
// ratings ("Class A · 1,450–1,799"). In the rankings it sticks right below the table's sticky header while the class's
// rows scroll past (the next class's covers it); a club's table has no sticky header, so there it scrolls with the
// rows. Sorted another way (by matches), the rows are one group without headers.
import { type RefObject, useEffect, useRef, useState } from "react";
import Swatch from "@/components/ui/Swatch";
import { useI18n } from "@/messages/client";
import { CLASS_CUTOFFS, CLASSES, classOf, type RatingClass } from "@/utils/classes";

export interface ClassGroup<T> {
  /** Null: not grouped (no header) */
  cls: RatingClass | null;
  rows: T[];
}

/** `rows` (in rating order when `grouped`) in runs of the same class, or all in one group */
export function classGroups<T>(rows: T[], rating: (row: T) => number, grouped: boolean): ClassGroup<T>[] {
  if (!grouped) return [{ cls: null, rows }];
  const groups: ClassGroup<T>[] = [];
  for (const row of rows) {
    const cls = classOf(rating(row));
    if (groups.at(-1)?.cls !== cls) groups.push({ cls, rows: [] });
    groups.at(-1)!.rows.push(row);
  }
  return groups;
}

/** A sticky table header's height (it wraps on small screens), for the class headers to stick right below it */
export function useHeadHeight(): [RefObject<HTMLTableSectionElement | null>, number] {
  const head = useRef<HTMLTableSectionElement>(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const el = head.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [head, height];
}

/** A class's header row, across all the table's `columns`; with `top`, sticking that many pixels down (below the table's sticky header) */
export function ClassHeader({ cls, columns, top }: { cls: RatingClass; columns: number; top?: number }) {
  const { num, t } = useI18n();
  // The class's ratings: CLASS_CUTOFFS are E, A, B and C's lowest; D is below C's
  const i = CLASSES.indexOf(cls);
  const label =
    i === 0
      ? t("rankings.table.classFrom", { class: cls, from: num(CLASS_CUTOFFS[0]) })
      : i >= CLASS_CUTOFFS.length
        ? t("rankings.table.classBelow", { class: cls, to: num(CLASS_CUTOFFS[CLASS_CUTOFFS.length - 1]) })
        : t("rankings.table.classRange", { class: cls, from: num(CLASS_CUTOFFS[i]), to: num(CLASS_CUTOFFS[i - 1] - 1) });
  return (
    <tr>
      <th
        scope="rowgroup"
        colSpan={columns}
        style={top !== undefined ? { top } : undefined}
        className={`${top !== undefined ? "sticky z-[5]" : ""} bg-stone-100 py-2 pl-2 sm:pl-4 text-left font-mono text-xs font-normal text-gray-600 shadow-[inset_0_-1px_0_var(--color-gray-200)]`}
      >
        <Swatch color={`var(--color-class-${cls.toLowerCase()})`} className="w-1 h-3 align-middle mr-2" />
        {label}
      </th>
    </tr>
  );
}
