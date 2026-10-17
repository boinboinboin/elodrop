"use client";

// A table of one player's matches (opponents, and the partner in doubles): result and score, win
// chance before the match and the rating after. With `limit`, only that many rows with a button to
// show all; `sortable` adds sorting by date or rating change; `embedded` leaves out the box and
// title; `showMargin` shows each match's point margin (head to head). A match whose tournament has
// a draw-luck page (`tournamentLinks`: badmintonportalen id → Cup2000 id, from the match key
// "T7075 ...") links to that event (its class, "... (SEN X)", and the matches' `pool`). With `more`,
// `matches` are only the newest and "show all" loads the rest from `more.url` (the player page).
import Link from "next/link";
import { useState } from "react";
import { date, signed } from "@/lib/format";
import { eventHref } from "@/lib/tournament";
import type { Match, Pool } from "@/lib/types";

interface Props {
  matches: Match[];
  title?: string;
  subtitle?: string;
  limit?: number;
  sortable?: boolean;
  embedded?: boolean;
  showMargin?: boolean;
  pool?: Pool;
  tournamentLinks?: Record<string, number>;
  /** Where to load every match from, and how many there are, when `matches` are only the newest */
  more?: { url: string; count: number };
}

const SORTS = { date: "Newest", gain: "Biggest gain", loss: "Biggest loss" } as const;

function tournamentHref(m: Match, links: Record<string, number> | undefined, pool: Pool | undefined) {
  const id = m.key?.match(/^T(\d+)/)?.[1];
  const cupId = id ? links?.[id] : undefined;
  if (!cupId) return null;
  // The match's event: its class from the event name ("... (SEN A)") and the pool
  const className = m.event.match(/\(([^()]+)\)\s*$/)?.[1];
  const eventPool = m.pool ?? pool;
  return className && eventPool ? eventHref(cupId, { className, pool: eventPool }) : `/tournaments/${cupId}`;
}

export default function MatchTable({ matches: newest, title, subtitle, limit, sortable = false, embedded = false, showMargin = false, pool, tournamentLinks, more }: Props) {
  const [sort, setSort] = useState<keyof typeof SORTS>("date");
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState<Match[] | null>(null);
  const [loading, setLoading] = useState<"no" | "yes" | "failed">("no");
  const matches = loaded ?? newest;
  const total = more?.count ?? matches.length;
  const expand = async () => {
    if (expanded || !more || loaded || newest.length >= more.count) return setExpanded(!expanded);
    setLoading("yes");
    try {
      const res = await fetch(more.url);
      if (!res.ok) throw new Error(String(res.status));
      setLoaded(await res.json());
      setExpanded(true);
      setLoading("no");
    } catch {
      setLoading("failed");
    }
  };
  const rows = matches.map((m, index) => ({ m, index }));
  if (sort === "gain") rows.sort((a, b) => b.m.change - a.m.change || a.index - b.index);
  if (sort === "loss") rows.sort((a, b) => a.m.change - b.m.change || a.index - b.index);
  const shown = limit && !expanded ? rows.slice(0, limit) : rows;
  const doubles = !!matches[0]?.partner;

  return (
    <div className={embedded ? "" : "bg-white p-4 md:p-6"}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          {!embedded && title && <h3 className="text-xl">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        </div>
        {sortable && limit && matches.length > 1 && (
          <div className="flex gap-1 text-sm" role="group" aria-label="Sort matches">
            {(Object.keys(SORTS) as (keyof typeof SORTS)[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={sort === key}
                onClick={() => setSort(key)}
                className="px-3 py-1 border border-black transition-colors duration-200 hover:bg-black hover:text-white aria-pressed:bg-black aria-pressed:text-white cursor-pointer"
              >
                {SORTS[key]}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="text-sm text-gray-600 border-b border-gray-200">
            <tr>
              <th scope="col" className="py-2 pr-4 font-normal">Date</th>
              <th scope="col" className="py-2 pr-4 font-normal">{doubles ? "Opponents" : "Opponent"}</th>
              <th scope="col" className="py-2 pr-4 font-normal">Result</th>
              <th scope="col" className="py-2 pr-4 font-normal text-right" title="Chance of winning before the match">Win chance</th>
              <th scope="col" className="py-2 font-normal text-right" title="Rating after the match">Rating</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(({ m, index }) => {
              const chance = Math.round(m.winChance * 100);
              const href = tournamentHref(m, tournamentLinks, pool);
              return (
                <tr key={`${m.key ?? m.day}-${index}`} className="border-b border-gray-100 last:border-0 align-top">
                  {/* On small screens the year goes on its own line */}
                  <td className="py-2 pr-4 tabular-nums">
                    <span className="whitespace-nowrap">{date(m.day, "dayMonth")}</span> <span className="block sm:inline">{m.day.slice(0, 4)}</span>
                  </td>
                  <td className="py-2 pr-4">
                    {m.opponents.map((o, i) => (
                      <span key={o.id}>
                        <Link href={`/players/${o.id}`} className="hover:text-blue-600">{o.name}</Link>{" "}
                        <span className="text-sm text-gray-500 tabular-nums">{o.rating}</span>
                        {i < m.opponents.length - 1 && <span className="text-gray-500"> / </span>}
                      </span>
                    ))}
                    {m.partner && (
                      <span className="block text-sm text-gray-600">
                        with <Link href={`/players/${m.partner.id}`} className="hover:text-blue-600">{m.partner.name}</Link>{" "}
                        <span className="text-gray-500 tabular-nums">{m.partner.rating}</span>
                      </span>
                    )}
                    {href ? (
                      <Link href={href} className="block text-sm text-gray-600 underline hover:text-blue-600">{m.event}</Link>
                    ) : (
                      <span className="block text-sm text-gray-600">{m.event}</span>
                    )}
                    {m.key && (
                      // Match key for pipeline/corrections.txt; one click selects all of it for copying
                      <code className="block text-xs text-gray-400 select-all" title="Match key, for corrections">{m.key}</code>
                    )}
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {m.result === 1 ? <span className="font-semibold text-green-700">Won</span> : m.result === 0 ? <span className="font-semibold text-red-700">Lost</span> : <span className="font-semibold">Draw</span>}
                    {showMargin && m.margin != null && (
                      <span className="text-sm text-gray-600 tabular-nums" title="Point margin"> {m.margin > 0 ? "+" : m.margin < 0 ? "−" : "±"}{Math.abs(m.margin)}</span>
                    )}
                    {/* On small screens each set goes on its own line */}
                    <span className="block text-sm text-gray-600 tabular-nums">
                      {m.score.split(", ").map((set, i, all) => (
                        <span key={i} className="block sm:inline">
                          {set}
                          {i < all.length - 1 && <span className="hidden sm:inline">, </span>}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">{chance > 99 ? ">99" : chance < 1 ? "<1" : chance}%</td>
                  <td className="py-2 text-right tabular-nums whitespace-nowrap">
                    {Math.round(m.rating + m.change)}
                    <span className={`block text-sm ${m.change >= 0 ? "text-green-700" : "text-red-700"}`}>{signed(m.change, 1).replace("±", "+")}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {limit && total > limit && (
        <button
          type="button"
          onClick={expand}
          disabled={loading === "yes"}
          className="mt-4 px-4 py-2 border border-black transition-colors duration-200 hover:bg-black hover:text-white cursor-pointer disabled:cursor-wait disabled:opacity-60"
        >
          {loading === "yes" ? "Loading matches…" : loading === "failed" ? "Couldn't load the matches: try again" : expanded ? "Show fewer" : `Show all ${total.toLocaleString("en-GB")} matches`}
        </button>
      )}
    </div>
  );
}
