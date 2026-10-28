"use client";

// A combined ranking's table (singles, doubles and mixed doubles together), with a search for player or club, in rank
// order or (a click on the Matches header, and again to go back) by matches played, as the rankings table. Rows come as
// compact arrays: [id, name, club, rank, score, matches in the three disciplines, [rank, rating] in each of `pools` (rank
// null: an inactive rating; null: none counted), rank last week]. `clubs`: the clubs in the table with a page, short name → [slug, logo].
import { useMemo, useState } from "react";
import { Search } from "@/components/SVG";
import PoolName from "@/components/format/PoolName";
import RankMovement from "@/components/rankings/RankMovement";
import ClearButton from "@/components/ui/ClearButton";
import Link from "@/components/ui/Link";
import SortButton from "@/components/ui/SortButton";
import { ROW, STICKY_HEAD } from "@/components/ui/styles";
import { useGrowingList } from "@/components/ui/useGrowingList";
import { useI18n } from "@/messages/client";
import type { Pool } from "@/types";
import { logoSrc } from "@/utils/clubs";
import { EMPTY } from "@/utils/format";
import { clubHref, playerHref } from "@/utils/hrefs";
import { sortByDesc } from "@/utils/sort";

export type CombinedRow = [number, string, string | null, number, number, number, ([number | null, number] | null)[], number | null];

export default function CombinedTable({ pools, rows, clubs, summary }: { pools: Pool[]; rows: CombinedRow[]; clubs: Record<string, [string, string | null]>; summary: string }) {
  const { num, signed, t } = useI18n();
  const [query, setQuery] = useState("");
  const [byMatches, setByMatches] = useState(false);
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const search = useMemo(() => rows.map(([, name, club]) => `${name} ${club ?? ""}`.toLowerCase()), [rows]);
  const found = terms.length ? rows.filter((_, i) => terms.every((t) => search[i].includes(t))) : rows;
  // Most matches first; equal ones keep their rank order (the rows' order)
  const shown = byMatches ? sortByDesc(found, (row) => row[5]) : found;
  // The first rows, and more as the end comes near
  const { limit, sentinel } = useGrowingList(shown.length, `${query}|${byMatches}`);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
        <p className="text-gray-600" aria-live="polite">
          {terms.length ? t("rankings.table.found", { found: num(shown.length), total: num(rows.length) }) : summary}
        </p>
        <label className="flex items-center gap-2 border-b border-gray-300 focus-within:border-black transition-colors w-full sm:w-80">
          <span className="sr-only">{t("rankings.table.search")}</span>
          <Search className="text-xl text-gray-400" />
          <input type="search" placeholder={t("rankings.table.search")} value={query} onChange={(e) => setQuery(e.target.value)} className="flex-1 min-w-0 py-2 bg-transparent outline-none" />
          <ClearButton show={!!query} onClear={() => setQuery("")} />
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
              <th scope="col" className="py-3 px-2 sm:px-4 font-normal text-right">{t("rankings.combined.score")}</th>
              {pools.map((pool) => (
                <th key={pool} scope="col" className="py-3 px-4 font-normal text-right hidden lg:table-cell"><PoolName pool={pool} /></th>
              ))}
              <th scope="col" className="py-3 px-4 font-normal text-right hidden md:table-cell" aria-sort={byMatches ? "descending" : "none"}>
                <SortButton active={byMatches} onClick={() => setByMatches(!byMatches)} label={t("common.table.matches")} sortTitle={t("rankings.table.sortByMatches")} />
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.slice(0, limit).map(([id, name, club, rank, score, matches, ratings, previous]) => {
              const entry = club ? clubs[club] : undefined;
              return (
                <tr key={id} className={`${ROW} hover:bg-gray-50 align-top`}>
                  <td className="py-3 pl-2 sm:pl-4 pr-1.5 sm:pr-2 text-right text-gray-600 tabular-nums">{rank}</td>
                  <td className="py-3 pr-2 sm:pr-4 text-sm"><RankMovement rank={rank} previous={previous} /></td>
                  <td className="py-3 px-1.5 sm:px-4 max-sm:[overflow-wrap:anywhere]">
                    <Link href={playerHref(id)} prefetch={false} className="hover:text-blue-600">{name}</Link>
                    <span className="block text-sm text-gray-600 sm:hidden">{club}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-700 hidden sm:table-cell">
                    {club &&
                      (entry ? (
                        <Link href={clubHref(entry[0])} prefetch={false} className="inline-flex items-center gap-1.5 align-middle hover:text-blue-600">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {entry[1] && <img src={logoSrc(entry[1], 5)} alt="" loading="lazy" className="w-5 h-5 object-contain shrink-0" />}
                          <span>{club}</span>
                        </Link>
                      ) : (
                        club
                      ))}
                  </td>
                  <td className="py-3 px-2 sm:px-4 text-right tabular-nums">{signed(score, 2, "")}</td>
                  {ratings.map((entry, i) => (
                    <td key={pools[i]} className="py-3 px-4 text-right tabular-nums hidden lg:table-cell">
                      {entry ? (
                        entry[0] === null ? (
                          <span className="text-gray-500" title={t("rankings.combined.inactiveTitle")}>
                            {entry[1]}
                            <span className="block text-sm">{t("rankings.combined.inactive")}</span>
                          </span>
                        ) : (
                          <>
                            {entry[1]}
                            <span className="block text-sm text-gray-600">{t("common.rankValue", { rank: entry[0] })}</span>
                          </>
                        )
                      ) : (
                        <span className="text-gray-400" title={t("rankings.combined.notRanked")}>{EMPTY}</span>
                      )}
                    </td>
                  ))}
                  <td className="py-3 px-4 text-right text-gray-700 tabular-nums hidden md:table-cell">{num(matches)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {limit < shown.length && <div ref={sentinel} aria-hidden="true" />}
      </div>
      {terms.length > 0 && shown.length === 0 && <p className="text-gray-600 mt-4">{t("rankings.table.noneFound")}</p>}
    </>
  );
}
