"use client";

// A club's ranked players in one discipline, in rank order or by matches played (a click on the Matches
// header, and again to go back), as in the rankings table. Rows come as compact arrays: [id, name, rank,
// rating, rating change since last week, matches, gender].
import { useState } from "react";
import { WeekChange } from "@/components/rankings/RankMovement";
import Link from "@/components/ui/Link";
import SortButton from "@/components/ui/SortButton";
import { ROW } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";
import { playerHref } from "@/utils/hrefs";
import { sortByDesc } from "@/utils/sort";

export type ClubPlayerRow = [number, string, number | null, number, number | null | undefined, number, string | null | undefined];

/** `mixed`: mark each player as a man or a woman (the mixed doubles list ranks them together) */
export default function ClubPlayers({ rows, mixed }: { rows: ClubPlayerRow[]; mixed: boolean }) {
  const { num, t } = useI18n();
  const [byMatches, setByMatches] = useState(false);
  // Most matches first; equal ones keep their rank order (the rows' order)
  const shown = byMatches ? sortByDesc(rows, (row) => row[5]) : rows;
  return (
    <div className="bg-white overflow-x-auto">
      <table className="w-full text-left" data-sorted={byMatches ? "matches" : undefined}>
        <thead className="text-sm text-gray-600 border-b border-gray-200">
          <tr>
            <th scope="col" className="py-3 px-4 font-normal text-right w-16" aria-sort={byMatches ? "none" : "ascending"}>{t("common.table.rank")}</th>
            <th scope="col" className="py-3 px-4 font-normal">{t("common.table.player")}</th>
            <th scope="col" className="py-3 pl-4 pr-1.5 font-normal text-right">{t("common.table.rating")}</th>
            <th scope="col" className="py-3 pr-4 font-normal w-14"><span className="sr-only">{t("common.table.changeSinceLastWeek")}</span></th>
            <th scope="col" className="py-3 px-4 font-normal text-right hidden sm:table-cell" aria-sort={byMatches ? "descending" : "none"}>
              <SortButton active={byMatches} onClick={() => setByMatches(!byMatches)} label={t("common.table.matches")} sortTitle={t("rankings.table.sortByMatches")} />
            </th>
          </tr>
        </thead>
        <tbody>
          {shown.map(([id, name, rank, rating, change, matches, gender]) => (
            <tr key={id} className={`${ROW} hover:bg-gray-50`}>
              <td className="py-3 px-4 text-right text-gray-600 tabular-nums">{rank}</td>
              <td className="py-3 px-4">
                <Link href={playerHref(id)} className="hover:text-blue-600">{name}</Link>
                {mixed && <span className="text-sm text-gray-600"> {t(gender === "K" ? "clubs.club.woman" : "clubs.club.man")}</span>}
              </td>
              <td className="py-3 pl-4 pr-1.5 text-right tabular-nums">{Math.round(rating)}</td>
              <td className="py-3 pr-4 whitespace-nowrap"><WeekChange change={change} /></td>
              <td className="py-3 px-4 text-right text-gray-700 tabular-nums hidden sm:table-cell">{num(matches)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
