"use client";

// The rankings table, with a search for player or club, in rank order or (a click on the Matches
// header, and again to go back) by matches played. Rows come as compact arrays (sent once,
// instead of as server-rendered markup and its copy in the page payload): [id, name, club, rank,
// rating, matches, last played, rank last week, rating change since last week]. `clubs`: the clubs in the table with a
// page, short name → [slug, logo].
import Link from "next/link";
import { useMemo, useState } from "react";
import RankMovement, { WeekChange } from "@/components/rankings/RankMovement";
import { Search } from "@/components/SVG";
import SortButton from "@/components/ui/SortButton";
import { ROW, STICKY_HEAD } from "@/components/ui/styles";
import { t } from "@/messages/i18n";
import { date, EMPTY, num } from "@/utils/format";
import { clubHref, playerHref } from "@/utils/hrefs";
import { sortByDesc } from "@/utils/sort";

export type RankingRow = [number, string, string | null, number | null, number, number, string, (number | null)?, (number | null)?];

export default function RankingTable({ rows, clubs, summary }: { rows: RankingRow[]; clubs: Record<string, [string, string | null]>; summary: string }) {
  const [query, setQuery] = useState("");
  const [byMatches, setByMatches] = useState(false);
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const search = useMemo(() => rows.map(([, name, club]) => `${name} ${club ?? ""}`.toLowerCase()), [rows]);
  const found = terms.length ? rows.filter((_, i) => terms.every((t) => search[i].includes(t))) : rows;
  // Most matches first; equal ones keep their rank order (the rows' order)
  const shown = byMatches ? sortByDesc(found, (row) => row[5]) : found;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
        <p className="text-gray-600" aria-live="polite">
          {terms.length ? t("rankings.table.found", { found: num(shown.length), total: num(rows.length) }) : summary}
        </p>
        <label className="flex items-center gap-2 border-b border-gray-300 focus-within:border-black transition-colors w-full sm:w-80">
          <span className="sr-only">{t("rankings.table.search")}</span>
          <Search className="text-xl text-gray-400" />
          <input type="search" placeholder={t("rankings.table.search")} value={query} onChange={(e) => setQuery(e.target.value)} className="flex-1 py-2 bg-transparent outline-none" />
        </label>
      </div>

      <div className="bg-white overflow-x-clip">
        {/* clip, not auto: a scrolling box would keep the sticky header from sticking to the page (narrow screens hide the wide columns) */}
        <table className="w-full text-left" data-sorted={byMatches || undefined}>
          <thead className={STICKY_HEAD}>
            <tr>
              <th scope="col" className="py-3 pl-2 sm:pl-4 pr-1.5 sm:pr-2 font-normal text-right w-10 sm:w-16" aria-sort={byMatches ? "none" : "ascending"}>{t("common.table.rank")}</th>
              <th scope="col" className="py-3 pr-2 sm:pr-4 font-normal w-11 sm:w-14"><span className="sr-only">{t("common.table.sinceLastWeek")}</span></th>
              <th scope="col" className="py-3 px-1.5 sm:px-4 font-normal">{t("common.table.player")}</th>
              <th scope="col" className="py-3 px-4 font-normal hidden sm:table-cell">{t("common.table.club")}</th>
              <th scope="col" className="py-3 pl-1.5 sm:pl-4 pr-1 sm:pr-1.5 font-normal text-right">{t("common.table.rating")}</th>
              <th scope="col" className="py-3 pr-2 sm:pr-4 font-normal w-11 sm:w-14"><span className="sr-only">{t("common.table.changeSinceLastWeek")}</span></th>
              <th scope="col" className="py-3 px-4 font-normal text-right hidden md:table-cell" aria-sort={byMatches ? "descending" : "none"}>
                <SortButton active={byMatches} onClick={() => setByMatches(!byMatches)} label={t("common.table.matches")} sortTitle={t("rankings.table.sortByMatches")} />
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map(([id, name, club, rank, rating, matches, lastPlayed, previous, change]) => {
              const entry = club ? clubs[club] : undefined;
              return (
                <tr key={id} className={`${ROW} hover:bg-gray-50 ${rank ? "" : "text-gray-500"}`}>
                  <td className="py-3 pl-2 sm:pl-4 pr-1.5 sm:pr-2 text-right text-gray-600 tabular-nums">{rank ?? EMPTY}</td>
                  <td className="py-3 pr-2 sm:pr-4 text-sm"><RankMovement rank={rank} previous={previous} /></td>
                  <td className="py-3 px-1.5 sm:px-4 max-sm:[overflow-wrap:anywhere]">
                    <Link href={playerHref(id)} prefetch={false} className="hover:text-blue-600">{name}</Link>
                    <span className="block text-sm text-gray-600 sm:hidden">{club}</span>
                    {!rank && <span className="block text-sm text-gray-500">{t("rankings.table.lastPlayed", { month: date(lastPlayed, "monthYear") })}</span>}
                  </td>
                  <td className="py-3 px-4 text-gray-700 hidden sm:table-cell">
                    {club &&
                      (entry ? (
                        <Link href={clubHref(entry[0])} prefetch={false} className="inline-flex items-center gap-1.5 align-middle hover:text-blue-600">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {entry[1] && <img src={entry[1]} alt="" className="w-5 h-5 object-contain shrink-0" />}
                          <span>{club}</span>
                        </Link>
                      ) : (
                        club
                      ))}
                  </td>
                  {/* The rating right-aligned, the change since last week in its own column after it, so ratings line up */}
                  <td className="py-3 pl-1.5 sm:pl-4 pr-1 sm:pr-1.5 text-right tabular-nums">{Math.round(rating)}</td>
                  <td className="py-3 pr-2 sm:pr-4 whitespace-nowrap">{rank !== null && <WeekChange change={change} />}</td>
                  <td className="py-3 px-4 text-right text-gray-700 tabular-nums hidden md:table-cell">{num(matches)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {terms.length > 0 && shown.length === 0 && <p className="text-gray-600 mt-4">{t("rankings.table.noneFound")}</p>}
    </>
  );
}
