"use client";

// A table whose last column sorts it, most first, with a click on its header, and back to the rows'
// own order (the ranking) with another. The cells are rendered on the server; only the order
// changes here. The header sticks to the top of the page.
import { useState, type ReactNode } from "react";
import { SortButton } from "@/components/RankingTable";

interface Row {
  /** The row's key (the <tr>'s key too) */
  key: string;
  /** The value of the sorting column */
  value: number;
  row: ReactNode;
}

export default function SortableTable({ head, sortLabel, sortClassName, rows }: { head: ReactNode; sortLabel: string; sortClassName: string; rows: Row[] }) {
  const [sorted, setSorted] = useState(false);
  // Most first; equal ones keep their order
  const shown = sorted ? rows.map((r, i) => ({ r, i })).sort((a, b) => b.r.value - a.r.value || a.i - b.i).map(({ r }) => r) : rows;
  return (
    // data-sorted hides the change since last week (components/RankMovement), which is about the ranking order
    <table className="w-full text-left" data-sorted={sorted || undefined}>
      <thead className="sticky top-0 z-10 bg-white text-sm text-gray-600 shadow-[inset_0_-1px_0_var(--color-gray-200)]">
        <tr>
          {head}
          <th scope="col" className={sortClassName} aria-sort={sorted ? "descending" : "none"}>
            <SortButton active={sorted} onClick={() => setSorted(!sorted)} label={sortLabel} />
          </th>
        </tr>
      </thead>
      {/* Each row is a <tr> keyed by `key` */}
      <tbody>{shown.map((r) => r.row)}</tbody>
    </table>
  );
}
