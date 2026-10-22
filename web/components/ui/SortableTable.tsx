"use client";

// A table whose last column sorts it, most first, with a click on its header, and back to the rows'
// own order (the ranking) with another. The cells are rendered on the server; only the order
// changes here. The header sticks to the top of the page.
import { useState, type ReactNode } from "react";
import SortButton from "@/components/ui/SortButton";
import { STICKY_HEAD } from "@/components/ui/styles";
import { sortByDesc } from "@/utils/sort";

interface Row {
  /** The row's key (the <tr>'s key too) */
  key: string;
  /** The value of the sorting column */
  value: number;
  row: ReactNode;
}

/** `sortLabel`: the sorting column's header; `sortTitle`: what a click on it does */
export default function SortableTable({ head, sortLabel, sortTitle, sortClassName, rows }: { head: ReactNode; sortLabel: string; sortTitle: string; sortClassName: string; rows: Row[] }) {
  const [sorted, setSorted] = useState(false);
  // Most first; equal ones keep their order
  const shown = sorted ? sortByDesc(rows, (r) => r.value) : rows;
  return (
    // data-sorted hides the change since last week (components/rankings/RankMovement.tsx), which is about the ranking order
    <table className="w-full text-left" data-sorted={sorted || undefined}>
      <thead className={STICKY_HEAD}>
        <tr>
          {head}
          <th scope="col" className={sortClassName} aria-sort={sorted ? "descending" : "none"}>
            <SortButton active={sorted} onClick={() => setSorted(!sorted)} label={sortLabel} sortTitle={sortTitle} />
          </th>
        </tr>
      </thead>
      {/* Each row is a <tr> keyed by `key` */}
      <tbody>{shown.map((r) => r.row)}</tbody>
    </table>
  );
}
