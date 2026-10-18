"use client";

// The rankings table, with a search for player or club, in rank order or (a click on the Matches
// header, and again to go back) by matches played. Rows come as compact arrays (sent once,
// instead of as server-rendered markup and its copy in the page payload): [id, name, club, rank,
// rating, matches, last played, rank last week, rating change since last week]. `clubs`: the clubs in the table with a
// page, short name → [slug, logo].
import Link from "next/link";
import RankMovement, { WeekChange } from "@/components/RankMovement";
import { date } from "@/lib/format";
import { useMemo, useState } from "react";

export type RankingRow = [number, string, string | null, number | null, number, number, string, (number | null)?, (number | null)?];


export default function RankingTable({ rows, clubs, summary }: { rows: RankingRow[]; clubs: Record<string, [string, string | null]>; summary: string }) {
  const [query, setQuery] = useState("");
  const [byMatches, setByMatches] = useState(false);
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const search = useMemo(() => rows.map(([, name, club]) => `${name} ${club ?? ""}`.toLowerCase()), [rows]);
  const found = terms.length ? rows.filter((_, i) => terms.every((t) => search[i].includes(t))) : rows;
  // Most matches first; equal ones keep their rank order (the rows' order)
  const shown = byMatches ? found.map((row, i) => ({ row, i })).sort((a, b) => b.row[5] - a.row[5] || a.i - b.i).map(({ row }) => row) : found;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
        <p className="text-gray-600" aria-live="polite">
          {terms.length ? `${shown.length.toLocaleString("en-GB")} of ${rows.length.toLocaleString("en-GB")} players` : summary}
        </p>
        <label className="flex items-center gap-2 border-b border-gray-300 focus-within:border-black transition-colors w-full sm:w-80">
          <span className="sr-only">Search player or club</span>
          <svg aria-hidden="true" viewBox="0 0 24 24" className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input type="search" placeholder="Search player or club" value={query} onChange={(e) => setQuery(e.target.value)} className="flex-1 py-2 bg-transparent outline-none" />
        </label>
      </div>

      <div className="bg-white overflow-x-clip">
        {/* clip, not auto: a scrolling box would keep the sticky header from sticking to the page (narrow screens hide the wide columns) */}
        <table className="w-full text-left" data-sorted={byMatches || undefined}>
          <thead className="sticky top-0 z-10 bg-white text-sm text-gray-600 shadow-[inset_0_-1px_0_var(--color-gray-200)]">
            <tr>
              <th scope="col" className="py-3 pl-4 pr-2 font-normal text-right w-16" aria-sort={byMatches ? "none" : "ascending"}>#</th>
              <th scope="col" className="py-3 pr-4 font-normal w-14"><span className="sr-only">Since last week</span></th>
              <th scope="col" className="py-3 px-4 font-normal">Player</th>
              <th scope="col" className="py-3 px-4 font-normal hidden sm:table-cell">Club</th>
              <th scope="col" className="py-3 pl-4 pr-1.5 font-normal text-right">Rating</th>
              <th scope="col" className="py-3 pr-4 font-normal w-14"><span className="sr-only">Change since last week</span></th>
              <th scope="col" className="py-3 px-4 font-normal text-right hidden md:table-cell" aria-sort={byMatches ? "descending" : "none"}>
                <SortButton active={byMatches} onClick={() => setByMatches(!byMatches)} label="Matches" />
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map(([id, name, club, rank, rating, matches, lastPlayed, previous, change]) => {
              const entry = club ? clubs[club] : undefined;
              return (
                <tr key={id} className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 ${rank ? "" : "text-gray-500"}`}>
                  <td className="py-3 pl-4 pr-2 text-right text-gray-600 tabular-nums">{rank ?? "–"}</td>
                  <td className="py-3 pr-4 text-sm"><RankMovement rank={rank} previous={previous} /></td>
                  <td className="py-3 px-4">
                    <Link href={`/players/${id}`} prefetch={false} className="hover:text-blue-600">{name}</Link>
                    <span className="block text-sm text-gray-600 sm:hidden">{club}</span>
                    {!rank && <span className="block text-sm text-gray-500">Last played {date(lastPlayed, "monthYear")}</span>}
                  </td>
                  <td className="py-3 px-4 text-gray-700 hidden sm:table-cell">
                    {club &&
                      (entry ? (
                        <Link href={`/clubs/${entry[0]}`} prefetch={false} className="inline-flex items-center gap-1.5 align-middle hover:text-blue-600">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {entry[1] && <img src={entry[1]} alt="" className="w-5 h-5 object-contain shrink-0" />}
                          <span>{club}</span>
                        </Link>
                      ) : (
                        club
                      ))}
                  </td>
                  {/* The rating right-aligned, the change since last week in its own column after it, so ratings line up */}
                  <td className="py-3 pl-4 pr-1.5 text-right tabular-nums">{Math.round(rating)}</td>
                  <td className="py-3 pr-4 whitespace-nowrap">{rank !== null && <WeekChange change={change} />}</td>
                  <td className="py-3 px-4 text-right text-gray-700 tabular-nums hidden md:table-cell">{matches.toLocaleString("en-GB")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {terms.length > 0 && shown.length === 0 && <p className="text-gray-600 mt-4">No players match your search.</p>}
    </>
  );
}

/** A column header that sorts by its column (most first), and back to rank order when clicked again */
export function SortButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 cursor-pointer hover:text-black ${active ? "text-black" : ""}`}
      title={active ? "Back to rank order" : `Sort by ${label.toLowerCase()}, most first`}
    >
      {label}
      <span aria-hidden="true" className={`text-[0.7em] ${active ? "" : "opacity-30"}`}>▼</span>
    </button>
  );
}
