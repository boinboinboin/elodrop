"use client";

// The rankings table, with a search for player or club, in rank order, by matches played (a click on the Matches
// header, and again to go back) or by the rating change since last week (a click on its header: the biggest gain first,
// again: the biggest loss first, again: back). A long list renders its first rows and more on scrolling (useGrowingList).
// Rows come as compact arrays (sent once, instead of as server-rendered markup and its copy in the page payload): [id, name, club, rank,
// rating, matches, last played, rank last week, rating change since last week]. `clubs`: the clubs in the table with a
// page, short name → [slug, logo]. Players and clubs link to their page on the list's discipline (`pool`). `classes`: each
// rating's class (utils/classes.ts), for the senior lists (the junior ratings are on their own scale): a stripe in the
// class's colour at each row's left edge (class-edges in app/globals.css), with a legend, and in rating order (unless
// sorted by matches or change) the rows grouped by class, each group a <tbody> under a header with its ratings.
import { useMemo, useState } from "react";
import { Search } from "@/components/SVG";
import RankMovement, { WeekChange } from "@/components/rankings/RankMovement";
import ChangeSortButton, { type ChangeOrder, nextChangeOrder } from "@/components/ui/ChangeSortButton";
import ClearButton from "@/components/ui/ClearButton";
import Link from "@/components/ui/Link";
import SortButton from "@/components/ui/SortButton";
import { ROW, STICKY_HEAD } from "@/components/ui/styles";
import Swatch from "@/components/ui/Swatch";
import { useGrowingList } from "@/components/ui/useGrowingList";
import { useI18n } from "@/messages/client";
import type { Pool } from "@/types";
import { CLASS_CUTOFFS, CLASSES, classOf, type RatingClass } from "@/utils/classes";
import { logoSrc } from "@/utils/clubs";
import { EMPTY } from "@/utils/format";
import { clubHref, playerHref } from "@/utils/hrefs";
import { sortByChange, sortByDesc } from "@/utils/sort";

export type RankingRow = [number, string, string | null, number | null, number, number, string, (number | null)?, (number | null)?];

/** The table's columns, for a class header across them all (some are left out on small screens) */
const COLUMNS = 7;
/** A class's colour (app/globals.css) */
const classColor = (c: RatingClass) => `var(--color-class-${c.toLowerCase()})`;

export default function RankingTable({
  pool,
  rows,
  clubs,
  summary,
  classes = false,
}: {
  pool: Pool;
  rows: RankingRow[];
  clubs: Record<string, [string, string | null]>;
  summary: string;
  classes?: boolean;
}) {
  const { date, num, t } = useI18n();
  const [query, setQuery] = useState("");
  const [byMatches, setByMatches] = useState(false);
  const [byChange, setByChange] = useState<ChangeOrder>(null);
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const search = useMemo(() => rows.map(([, name, club]) => `${name} ${club ?? ""}`.toLowerCase()), [rows]);
  const found = terms.length ? rows.filter((_, i) => terms.every((t) => search[i].includes(t))) : rows;
  // Most matches first; equal ones keep their rank order (the rows' order)
  const shown = byMatches ? sortByDesc(found, (row) => row[5]) : byChange ? sortByChange(found, (row) => (row[3] === null ? null : row[8]), byChange) : found;
  // The first rows, and more as the end comes near
  const { limit, sentinel } = useGrowingList(shown.length, `${query}|${byMatches}|${byChange}`);
  // The rows shown, grouped by class while in rating order (a search keeps it), else one group without a header
  const visible = shown.slice(0, limit);
  const groups: { cls: RatingClass | null; rows: RankingRow[] }[] = [];
  if (classes && !byMatches && !byChange) {
    for (const row of visible) {
      const cls = classOf(row[4]);
      if (groups.at(-1)?.cls !== cls) groups.push({ cls, rows: [] });
      groups.at(-1)!.rows.push(row);
    }
  } else groups.push({ cls: null, rows: visible });
  /** "Class A · 1,450–1,799": the class's ratings (CLASS_CUTOFFS: E, A, B and C's lowest; D is below C's) */
  const classHeader = (c: RatingClass) => {
    const i = CLASSES.indexOf(c);
    if (i === 0) return t("rankings.table.classFrom", { class: c, from: num(CLASS_CUTOFFS[0]) });
    if (i >= CLASS_CUTOFFS.length) return t("rankings.table.classBelow", { class: c, to: num(CLASS_CUTOFFS[CLASS_CUTOFFS.length - 1]) });
    return t("rankings.table.classRange", { class: c, from: num(CLASS_CUTOFFS[i]), to: num(CLASS_CUTOFFS[i - 1] - 1) });
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
        <div>
          <p className="text-gray-600" aria-live="polite">
            {terms.length ? t("rankings.table.found", { found: num(shown.length), total: num(rows.length) }) : summary}
          </p>
          {/* Which colour is which class (each row also says its class to screen readers) */}
          {classes && (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 font-mono text-xs text-gray-600" aria-hidden="true">
              <span>{t("common.table.class")}</span>
              {CLASSES.map((c) => (
                <span key={c} className="inline-flex items-center gap-1">
                  <Swatch color={classColor(c)} className="w-1 h-3" />
                  {c}
                </span>
              ))}
            </p>
          )}
        </div>
        <label className="flex items-center gap-2 border-b border-gray-300 focus-within:border-black transition-colors w-full sm:w-80">
          <span className="sr-only">{t("rankings.table.search")}</span>
          <Search className="text-xl text-gray-400" />
          <input type="search" placeholder={t("rankings.table.search")} value={query} onChange={(e) => setQuery(e.target.value)} className="flex-1 min-w-0 py-2 bg-transparent outline-none" />
          <ClearButton show={!!query} onClear={() => setQuery("")} />
        </label>
      </div>

      <div className="bg-white overflow-x-clip">
        {/* clip, not auto: a scrolling box would keep the sticky header from sticking to the page (narrow screens hide the wide columns) */}
        <table className="w-full text-left" data-sorted={byMatches ? "matches" : byChange ? "change" : undefined}>
          <thead className={STICKY_HEAD}>
            <tr>
              <th scope="col" className="py-3 pl-2 sm:pl-4 pr-1.5 sm:pr-2 font-normal text-right w-10 sm:w-16" aria-sort={byMatches || byChange ? "none" : "ascending"}>{t("common.table.rank")}</th>
              <th scope="col" className="py-3 pr-2 sm:pr-4 font-normal w-11 sm:w-14"><span className="sr-only">{t("common.table.sinceLastWeek")}</span></th>
              <th scope="col" className="py-3 px-1.5 sm:px-4 font-normal">{t("common.table.player")}</th>
              <th scope="col" className="py-3 px-4 font-normal hidden sm:table-cell">{t("common.table.club")}</th>
              <th scope="col" className="py-3 pl-1.5 sm:pl-4 pr-1 sm:pr-1.5 font-normal text-right">{t("common.table.rating")}</th>
              <th scope="col" className="py-3 pr-2 sm:pr-4 font-normal w-11 sm:w-14" aria-sort={byChange === "gain" ? "descending" : byChange === "loss" ? "ascending" : "none"}>
                <ChangeSortButton order={byChange} onClick={() => { setByChange(nextChangeOrder(byChange)); setByMatches(false); }} />
              </th>
              <th scope="col" className="py-3 px-4 font-normal text-right hidden md:table-cell" aria-sort={byMatches ? "descending" : "none"}>
                <SortButton active={byMatches} onClick={() => { setByMatches(!byMatches); setByChange(null); }} label={t("common.table.matches")} sortTitle={t("rankings.table.sortByMatches")} />
              </th>
            </tr>
          </thead>
          {groups.map((group) => (
            <tbody key={group.cls ?? "all"} className={classes ? "class-edges" : undefined}>
              {group.cls && (
                <tr>
                  <th scope="rowgroup" colSpan={COLUMNS} className="bg-stone-100 py-2 pl-2 sm:pl-4 text-left font-mono text-xs font-normal text-gray-600">
                    <Swatch color={classColor(group.cls)} className="w-1 h-3 align-middle mr-2" />
                    {classHeader(group.cls)}
                  </th>
                </tr>
              )}
              {group.rows.map(([id, name, club, rank, rating, matches, lastPlayed, previous, change]) => {
                const entry = club ? clubs[club] : undefined;
                return (
                  <tr key={id} data-class={classes ? classOf(rating) : undefined} className={`${ROW} hover:bg-gray-50 ${rank ? "" : "text-gray-500"}`}>
                    <td className="py-3 pl-2 sm:pl-4 pr-1.5 sm:pr-2 text-right text-gray-600 tabular-nums">{rank ?? EMPTY}</td>
                    <td className="py-3 pr-2 sm:pr-4 text-sm"><RankMovement rank={rank} previous={previous} /></td>
                    <td className="py-3 px-1.5 sm:px-4 max-sm:[overflow-wrap:anywhere]">
                      <Link href={playerHref(id, pool)} prefetch={false} className="hover:text-blue-600">{name}</Link>
                      <span className="block text-sm text-gray-600 sm:hidden">{club}</span>
                      {!rank && <span className="block text-sm text-gray-500">{t("rankings.table.lastPlayed", { month: date(lastPlayed, "monthYear") })}</span>}
                    </td>
                    <td className="py-3 px-4 text-gray-700 hidden sm:table-cell">
                      {club &&
                        (entry ? (
                          <Link href={clubHref(entry[0], pool)} prefetch={false} className="inline-flex items-center gap-1.5 align-middle hover:text-blue-600">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {entry[1] && <img src={logoSrc(entry[1], 5)} alt="" loading="lazy" className="w-5 h-5 object-contain shrink-0" />}
                            <span>{club}</span>
                          </Link>
                        ) : (
                          club
                        ))}
                    </td>
                    {/* The rating right-aligned, the change since last week in its own column after it, so ratings line up */}
                    <td className="py-3 pl-1.5 sm:pl-4 pr-1 sm:pr-1.5 text-right tabular-nums">
                      {Math.round(rating)}
                      {/* The class, shown by the row's edge, for screen readers */}
                      {classes && <span className="sr-only">, {t("common.ratingClass", { class: classOf(rating) })}</span>}
                    </td>
                    <td className="py-3 pr-2 sm:pr-4 whitespace-nowrap">{rank !== null && <WeekChange change={change} />}</td>
                    <td className="py-3 px-4 text-right text-gray-700 tabular-nums hidden md:table-cell">{num(matches)}</td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
        {limit < shown.length && <div ref={sentinel} aria-hidden="true" />}
      </div>
      {terms.length > 0 && shown.length === 0 && <p className="text-gray-600 mt-4">{t("rankings.table.noneFound")}</p>}
    </>
  );
}
