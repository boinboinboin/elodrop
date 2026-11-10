"use client";

// A club's ranked players in one discipline, in rank order or by matches played (a click on the Matches
// header, and again to go back), as in the rankings table: in rank order grouped by rating class under headers
// (components/rankings/ClassGroups.tsx). Rows come as compact arrays: [id, name, rank, rating, rating change
// since last week, matches, gender, last played]. Each player links to their page on this discipline.
//
// "Show inactive players", as in the rankings, adds those who haven't played in the last 12 months (no rank, in grey,
// with the month they last played), in rating order among the ranked ones. It's kept in the URL (?inactive=true, via
// nuqs), for every discipline's tab at once, so a link can open it. A tab's inactive players are loaded when it's
// shown with it on (`inactiveUrl`: app/api/clubs/[slug]/inactive), so the page itself carries only the ranked
// players. Reading the URL can't happen when the page is prerendered (as components/ui/Tabs.tsx), so that part has
// its own Suspense boundary: the prerendered HTML has it off, and the browser then follows the URL.
import { parseAsBoolean, useQueryState } from "nuqs";
import { Suspense, useEffect, useState } from "react";
import { Check } from "@/components/SVG";
import { ClassHeader, classGroups } from "@/components/rankings/ClassGroups";
import { WeekChange } from "@/components/rankings/RankMovement";
import Link from "@/components/ui/Link";
import SortButton from "@/components/ui/SortButton";
import { ROW } from "@/components/ui/styles";
import { useTabShown } from "@/components/ui/Tabs";
import { useI18n } from "@/messages/client";
import type { Pool } from "@/types";
import { EMPTY } from "@/utils/format";
import { playerHref } from "@/utils/hrefs";
import { sortByDesc } from "@/utils/sort";

export type ClubPlayerRow = [number, string, number | null, number, number | null | undefined, number, string | null | undefined, string?];

/** The table's columns, for a class header across them all */
const COLUMNS = 5;
/** The query parameter that keeps "show inactive players" on */
const INACTIVE_PARAM = "inactive";

const inactiveLists = new Map<string, Promise<ClubPlayerRow[]>>();
/** A club's inactive players in a discipline, one request per address for the visit */
function loadInactive(url: string) {
  let list = inactiveLists.get(url);
  if (!list) {
    list = fetch(url).then((res) => (res.ok ? (res.json() as Promise<ClubPlayerRow[]>) : Promise.reject(new Error(String(res.status)))));
    // A failed request can be tried again
    list.catch(() => inactiveLists.delete(url));
    inactiveLists.set(url, list);
  }
  return list;
}

interface Props {
  pool: Pool;
  rows: ClubPlayerRow[];
  /** Mark each player as a man or a woman (the mixed doubles list ranks them together) */
  mixed: boolean;
  /** Where the club's inactive players in this discipline load from */
  inactiveUrl: string;
}

export default function ClubPlayers(props: Props) {
  return (
    <Suspense fallback={<ClubPlayersView {...props} showInactive={false} onToggle={() => {}} />}>
      <UrlClubPlayers {...props} />
    </Suspense>
  );
}

function UrlClubPlayers(props: Props) {
  const [showInactive, setShowInactive] = useQueryState(INACTIVE_PARAM, parseAsBoolean.withDefault(false).withOptions({ history: "replace", scroll: false, clearOnDefault: true }));
  return <ClubPlayersView {...props} showInactive={showInactive} onToggle={() => setShowInactive(!showInactive)} />;
}

function ClubPlayersView({ pool, rows, mixed, inactiveUrl, showInactive, onToggle }: Props & { showInactive: boolean; onToggle: () => void }) {
  const { date, num, t } = useI18n();
  const tabShown = useTabShown();
  const [byMatches, setByMatches] = useState(false);
  const [inactive, setInactive] = useState<ClubPlayerRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // The inactive players, once they're asked for and this discipline's tab is shown
  useEffect(() => {
    if (!showInactive || !tabShown || inactive) return;
    let live = true;
    loadInactive(inactiveUrl).then(
      (list) => live && setInactive(list),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [showInactive, tabShown, inactive, inactiveUrl, attempt]);
  const loading = showInactive && !inactive && !failed;
  // With the inactive players: among the ranked ones by rating (equal ratings keep the ranked first)
  const all = showInactive && inactive ? sortByDesc([...rows, ...inactive], (row) => row[3]) : rows;
  // Most matches first; equal ones keep their rank order (the rows' order)
  const shown = byMatches ? sortByDesc(all, (row) => row[5]) : all;
  const groups = classGroups(shown, (row) => row[3], !byMatches);
  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 mb-4">
        {showInactive && loading && (
          <span className="text-sm text-gray-600" aria-live="polite">{t("clubs.club.inactiveLoading")}</span>
        )}
        {showInactive && failed && (
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              setAttempt(attempt + 1);
            }}
            className="text-sm text-gray-600 underline cursor-pointer"
          >
            {t("clubs.club.inactiveFailed")}
          </button>
        )}
        <button type="button" onClick={onToggle} className="flex items-center gap-2 select-none cursor-pointer" role="checkbox" aria-checked={showInactive}>
          <span className={`w-4 h-4 border border-black inline-flex items-center justify-center ${showInactive ? "bg-black text-white" : "bg-white"}`} aria-hidden="true">
            {showInactive && <Check className="text-[0.75rem]" />}
          </span>
          {t("rankings.showInactive")}
        </button>
      </div>
      {shown.length > 0 && (
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
            {groups.map((group) => (
              <tbody key={group.cls ?? "all"}>
                {group.cls && <ClassHeader cls={group.cls} columns={COLUMNS} />}
                {group.rows.map(([id, name, rank, rating, change, matches, gender, lastPlayed]) => (
                  // Only inactive players come with the month they last played
                  <tr key={id} className={`${ROW} hover:bg-gray-50 ${lastPlayed ? "text-gray-500" : ""}`}>
                    <td className="py-3 px-4 text-right text-gray-600 tabular-nums">{rank ?? EMPTY}</td>
                    <td className="py-3 px-4">
                      <Link href={playerHref(id, pool)} className="hover:text-blue-600">{name}</Link>
                      {mixed && <span className="text-sm text-gray-600"> {t(gender === "K" ? "clubs.club.woman" : "clubs.club.man")}</span>}
                      {lastPlayed && <span className="block text-sm text-gray-500">{t("rankings.table.lastPlayed", { month: date(lastPlayed, "monthYear") })}</span>}
                    </td>
                    <td className="py-3 pl-4 pr-1.5 text-right tabular-nums">{Math.round(rating)}</td>
                    <td className="py-3 pr-4 whitespace-nowrap">{!lastPlayed && <WeekChange change={change} />}</td>
                    <td className="py-3 px-4 text-right text-gray-700 tabular-nums hidden sm:table-cell">{num(matches)}</td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}
      {showInactive && inactive?.length === 0 && <p className="text-gray-600 mt-2">{t("clubs.club.noInactive")}</p>}
    </>
  );
}
