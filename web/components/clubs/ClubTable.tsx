"use client";

// The strongest clubs' table (components/clubs/StrongestClubs.tsx), in rank order, by ranked players (a click on that
// header, and again to go back) or by the strength (combined: score) gained or lost since last week (a click on its
// header: the biggest gain first, again: the biggest loss first, again: back). Rows come as compact arrays, sent once
// instead of as server-rendered markup and its copy in the page payload (as components/rankings/RankingTable.tsx):
// [club, rank, rank last week, strength (combined: score), its change since last week, ranked players, detail], the
// detail being, in one discipline, the players or pairs counted, best first ([id, name, rating] each), and combined,
// each discipline's [strength, rank] (null: not listed in it). `clubs`: the clubs in the table with a page, short name
// → [slug, logo]. In one discipline (`pool`), the clubs and players link to their pages on it.
import { useState } from "react";
import RankMovement, { WeekChange } from "@/components/rankings/RankMovement";
import ChangeSortButton, { type ChangeOrder, nextChangeOrder } from "@/components/ui/ChangeSortButton";
import Link from "@/components/ui/Link";
import SortButton from "@/components/ui/SortButton";
import { ROW, STICKY_HEAD } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";
import type { Pool } from "@/types";
import { logoSrc } from "@/utils/clubs";
import { clubHref, playerHref } from "@/utils/hrefs";
import { POOL_KEYS } from "@/utils/pools";
import { strongestClubsHref } from "@/utils/rankings";
import { sortByChange, sortByDesc } from "@/utils/sort";

export type TopPlayer = [number, string, number];
/** Combined: each discipline's [strength, rank], in POOL_KEYS order */
export type PoolStanding = [number, number] | null;
export type ClubRow = [string, number, number | null | undefined, number, number | null | undefined, number, TopPlayer[][] | PoolStanding[]];

export default function ClubTable({ pool, pairs, rows, clubs }: { pool: Pool | "combined"; pairs: boolean; rows: ClubRow[]; clubs: Record<string, [string, string | null]> }) {
  const { pools, signed, t } = useI18n();
  const [byPlayers, setByPlayers] = useState(false);
  const [byChange, setByChange] = useState<ChangeOrder>(null);
  const combined = pool === "combined";
  // The discipline the club and player links open on (none for the combined list)
  const tab = combined ? undefined : pool;
  // Most first; equal ones keep their order (the ranking)
  const shown = byPlayers ? sortByDesc(rows, (row) => row[5]) : byChange ? sortByChange(rows, (row) => row[4], byChange) : rows;

  return (
    // data-sorted hides the change since last week (components/rankings/RankMovement.tsx), which is about the ranking
    // order, unless sorted by the change
    <table className="w-full text-left" data-sorted={byPlayers ? "column" : byChange ? "change" : undefined}>
      <thead className={STICKY_HEAD}>
        <tr>
          <th scope="col" className="py-3 pl-2 sm:pl-4 pr-1.5 sm:pr-2 font-normal text-right w-10 sm:w-16" aria-sort={byPlayers || byChange ? "none" : "ascending"}>{t("common.table.rank")}</th>
          <th scope="col" className="py-3 pr-2 sm:pr-4 font-normal w-11 sm:w-14"><span className="sr-only">{t("common.table.sinceLastWeek")}</span></th>
          <th scope="col" className="py-3 px-1.5 sm:px-4 font-normal">{t("common.table.club")}</th>
          <th scope="col" className="py-3 pl-1.5 sm:pl-4 pr-1 sm:pr-1.5 font-normal text-right">{t(combined ? "clubs.strongest.score" : "clubs.strongest.strength")}</th>
          <th scope="col" className="py-3 pr-2 sm:pr-4 font-normal w-11 sm:w-14" aria-sort={byChange === "gain" ? "descending" : byChange === "loss" ? "ascending" : "none"}>
            <ChangeSortButton order={byChange} onClick={() => { setByChange(nextChangeOrder(byChange)); setByPlayers(false); }} />
          </th>
          {combined ? (
            POOL_KEYS.map((key) => (
              <th key={key} scope="col" className="py-3 px-4 font-normal text-right hidden lg:table-cell">{pools[key]}</th>
            ))
          ) : (
            <th scope="col" className="py-3 px-4 font-normal hidden md:table-cell">{t(pairs ? "clubs.strongest.bestPairs" : "clubs.strongest.bestPlayers")}</th>
          )}
          <th scope="col" className="py-3 px-4 font-normal text-right hidden sm:table-cell" aria-sort={byPlayers ? "descending" : "none"}>
            <SortButton active={byPlayers} onClick={() => { setByPlayers(!byPlayers); setByChange(null); }} label={t("clubs.strongest.rankedPlayers")} sortTitle={t("clubs.strongest.sortByRankedPlayers")} />
          </th>
        </tr>
      </thead>
      <tbody>
        {shown.map(([club, rank, previous, value, change, players, detail]) => {
          const entry = clubs[club];
          return (
            <tr key={club} className={`${ROW} hover:bg-gray-50 align-top`}>
              <td className="py-3 pl-2 sm:pl-4 pr-1.5 sm:pr-2 text-right text-gray-600 tabular-nums">{rank}</td>
              <td className="py-3 pr-2 sm:pr-4 text-sm"><RankMovement rank={rank} previous={previous} /></td>
              <td className="py-3 px-1.5 sm:px-4 max-sm:[overflow-wrap:anywhere]">
                <span className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {entry?.[1] && <img src={logoSrc(entry[1], 8)} alt="" className="w-8 h-8 object-contain shrink-0" />}
                  {entry ? <Link href={clubHref(entry[0], tab)} className="hover:text-blue-600">{club}</Link> : club}
                </span>
              </td>
              <td className="py-3 pl-1.5 sm:pl-4 pr-1 sm:pr-1.5 text-right tabular-nums">{combined ? signed(value, 2, "") : value}</td>
              <td className="py-3 pr-2 sm:pr-4 whitespace-nowrap"><WeekChange change={change} what={combined ? "score" : "strength"} /></td>
              {combined ? (
                (detail as PoolStanding[]).map((standing, i) => (
                  <td key={POOL_KEYS[i]} className="py-3 px-4 text-right tabular-nums hidden lg:table-cell">
                    {standing && (
                      <>
                        {standing[0]}
                        <Link href={strongestClubsHref(POOL_KEYS[i])} className="block text-sm text-gray-600 hover:text-blue-600">{t("common.rankValue", { rank: standing[1] })}</Link>
                      </>
                    )}
                  </td>
                ))
              ) : (
                <td className="py-3 px-4 hidden md:table-cell">
                  {/* The players or pairs counted, best first */}
                  {(detail as TopPlayer[][]).map((slot, i) => (
                    <span key={i} className="block">
                      {slot.map(([id, name, rating], j) => (
                        <span key={id}>
                          <Link href={playerHref(id, tab)} className="hover:text-blue-600">{name}</Link>{" "}
                          <span className="text-sm text-gray-500 tabular-nums">{rating}</span>
                          {j < slot.length - 1 && <span className="text-gray-500"> + </span>}
                        </span>
                      ))}
                    </span>
                  ))}
                </td>
              )}
              <td className="py-3 px-4 text-right text-gray-700 tabular-nums hidden sm:table-cell">{players}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
