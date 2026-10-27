"use client";

// A table whose last column sorts it, most first, with a click on its header, and back to the rows'
// own order (the ranking) with another. With `changeClassName`, the change since last week sorts it too: a
// click on that header sorts by the biggest gain, the next by the biggest loss, the next goes back
// (components/ui/ChangeSortButton.tsx). The cells are rendered on the server; only the order
// changes here. The header sticks to the top of the page.
import { useState, type ReactNode } from "react";
import ChangeSortButton, { type ChangeOrder, nextChangeOrder } from "@/components/ui/ChangeSortButton";
import SortButton from "@/components/ui/SortButton";
import { STICKY_HEAD } from "@/components/ui/styles";
import { sortByChange, sortByDesc } from "@/utils/sort";

interface Row {
  /** The row's key (the <tr>'s key too) */
  key: string;
  /** The value of the sorting column */
  value: number;
  /** The change since last week (null: none, e.g. new since then), for sorting by it */
  change?: number | null;
  row: ReactNode;
}

/**
 * `head`: the header cells before the sorting column; with `changeClassName` (that column's header classes), the cells
 * before the change since last week's column, which follows with its sort button, then `headAfter`. `sortLabel`: the
 * sorting column's header; `sortTitle`: what a click on it does
 */
export default function SortableTable({
  head,
  changeClassName,
  headAfter,
  sortLabel,
  sortTitle,
  sortClassName,
  rows,
}: {
  head: ReactNode;
  changeClassName?: string;
  headAfter?: ReactNode;
  sortLabel: string;
  sortTitle: string;
  sortClassName: string;
  rows: Row[];
}) {
  const [sorted, setSorted] = useState(false);
  const [byChange, setByChange] = useState<ChangeOrder>(null);
  // Most first; equal ones keep their order
  const shown = sorted ? sortByDesc(rows, (r) => r.value) : byChange ? sortByChange(rows, (r) => r.change, byChange) : rows;
  return (
    // data-sorted hides the change since last week (components/rankings/RankMovement.tsx), which is about the ranking
    // order, unless sorted by the change
    <table className="w-full text-left" data-sorted={sorted ? "column" : byChange ? "change" : undefined}>
      <thead className={STICKY_HEAD}>
        <tr>
          {head}
          {changeClassName && (
            <th scope="col" className={changeClassName} aria-sort={byChange === "gain" ? "descending" : byChange === "loss" ? "ascending" : "none"}>
              <ChangeSortButton
                order={byChange}
                onClick={() => {
                  setByChange(nextChangeOrder(byChange));
                  setSorted(false);
                }}
              />
            </th>
          )}
          {headAfter}
          <th scope="col" className={sortClassName} aria-sort={sorted ? "descending" : "none"}>
            <SortButton
              active={sorted}
              onClick={() => {
                setSorted(!sorted);
                setByChange(null);
              }}
              label={sortLabel}
              sortTitle={sortTitle}
            />
          </th>
        </tr>
      </thead>
      {/* Each row is a <tr> keyed by `key` */}
      <tbody>{shown.map((r) => r.row)}</tbody>
    </table>
  );
}
