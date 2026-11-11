"use client";

// A table of one player's matches (opponents, and the partner in doubles): result and score, win
// chance before the match and the rating after, with the match's change below it and, in doubles, the pull towards the
// player's singles that followed it. With `limit`, only that many rows with a button to
// show all; `sortable` adds sorting by date or rating change; `embedded` leaves out the box and
// title; `showMargin` shows each match's point margin (head to head). A match whose tournament has
// a draw-luck page (`tournamentLinks`: badmintonportalen id → Cup2000 id, from the match key
// "T7075 ...") links to that event (its class, "... (SEN X)", and the matches' `pool`). With `more`,
// `matches` are only the newest and "show all" loads the rest from `more.url` (the player page).
// Each opponent and partner is shown with the club they played for at the time, and links to their page on the
// match's discipline. The rows' and cells' styling is in a few classes set once (match-rows and the others in
// app/globals.css), not on every cell: a player page holds up to 25 rows per table, and its size is what storing it
// costs.
import { useState } from "react";
import Link from "@/components/ui/Link";
import { BUTTON } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";
import type { Match, Pool } from "@/types";
import { toneClass } from "@/utils/format";
import { playerHref } from "@/utils/hrefs";
import { sortByDesc } from "@/utils/sort";
import { matchHref } from "@/utils/tournament";

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

const SORTS = ["date", "gain", "loss"] as const;

/** A league match's team match page, or a tournament match's event page (or the tournament's) when its tournament has a draw-luck page */
function matchEventHref(m: Match, links: Record<string, number> | undefined, pool: Pool | undefined) {
  const id = m.key?.match(/^T(\d+)/)?.[1];
  return matchHref(m, id ? links?.[id] : undefined, pool);
}

export default function MatchTable({ matches: newest, title, subtitle, limit, sortable = false, embedded = false, showMargin = false, pool, tournamentLinks, more }: Props) {
  const { chance, date, num, signed, t } = useI18n();
  const [sort, setSort] = useState<(typeof SORTS)[number]>("date");
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
  const inOrder = matches.map((m, index) => ({ m, index }));
  const rows = sort === "gain" ? sortByDesc(inOrder, (r) => r.m.change) : sort === "loss" ? sortByDesc(inOrder, (r) => -r.m.change) : inOrder;
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
          <div className="flex gap-1 text-sm" role="group" aria-label={t("players.matches.sorts.label")}>
            {SORTS.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={sort === key}
                onClick={() => setSort(key)}
                className={`px-3 py-1 ${BUTTON} aria-pressed:bg-black aria-pressed:text-white`}
              >
                {t(`players.matches.sorts.${key}`)}
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Fits a phone: there the win chance goes under the score and the match key is left out. Clip,
          not scroll, so the header can stick to the top of the page while scrolling through matches. */}
      <div className="overflow-x-clip">
        <table className="w-full text-left">
          <thead className="sticky top-[var(--sticky-offset,0px)] z-10 bg-white text-sm text-gray-600 shadow-[inset_0_-1px_0_var(--color-gray-200)]">
            <tr>
              <th scope="col" className="py-2 pr-2 sm:pr-4 font-normal">{t("players.matches.date")}</th>
              <th scope="col" className="py-2 pr-2 sm:pr-4 font-normal">{t(doubles ? "players.matches.opponents" : "players.matches.opponent")}</th>
              <th scope="col" className="py-2 pr-2 sm:pr-4 font-normal">
                {t("players.matches.result")}
                <span className="sm:hidden" title={t("players.matches.winChanceTitle")}>{t("players.matches.resultChanceSuffix")}</span>
              </th>
              <th scope="col" className="py-2 pr-4 font-normal text-right hidden sm:table-cell" title={t("players.matches.winChanceTitle")}>{t("players.matches.winChance")}</th>
              <th scope="col" className="py-2 font-normal text-right" title={t("players.matches.ratingTitle")}>{t("players.matches.rating")}</th>
            </tr>
          </thead>
          <tbody className="match-rows">
            {shown.map(({ m, index }) => {
              const chanceText = chance(m.winChance);
              const href = matchEventHref(m, tournamentLinks, pool);
              return (
                <tr key={`${m.key ?? m.day}-${index}`}>
                  {/* Keeping the column narrow: on phones day, month and year each get a line, up to large
                      screens the year gets its own line ("18 Sep" / "2026"), and from there it's one line */}
                  <td className="match-date">
                    <span>{date(m.day, "dayOnly")}</span> <span>{date(m.day, "monthShort")}</span> <span>{m.day.slice(0, 4)}</span>
                  </td>
                  <td className="break-words">
                    {m.opponents.map((o, i) => (
                      <span key={o.id}>
                        <Link href={playerHref(o.id, m.pool ?? pool)}>{o.name}</Link> <span className="match-note tabular-nums">{o.rating}</span>
                        <PlayedFor club={o.club} />
                        {i < m.opponents.length - 1 && <span className="text-gray-500"> / </span>}
                      </span>
                    ))}
                    {m.partner && (
                      <span className="block text-sm text-gray-600">
                        {t("players.matches.with")} <Link href={playerHref(m.partner.id, m.pool ?? pool)}>{m.partner.name}</Link>{" "}
                        <span className="text-gray-500 tabular-nums">{m.partner.rating}</span>
                        <PlayedFor club={m.partner.club} />
                      </span>
                    )}
                    {href ? (
                      <Link href={href} className="match-event underline">{m.event}</Link>
                    ) : (
                      <span className="match-event">{m.event}</span>
                    )}
                    {m.key && (
                      // Match key for pipeline/corrections.txt; one click selects all of it for copying
                      <code className="match-key" title={t("players.matches.matchKey")}>{m.key}</code>
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    {m.result === 1 ? (
                      <span className="font-semibold text-green-700">{t("players.matches.won")}</span>
                    ) : m.result === 0 ? (
                      <span className="font-semibold text-red-700">{t("players.matches.lost")}</span>
                    ) : (
                      <span className="font-semibold">{t("players.matches.draw")}</span>
                    )}
                    {showMargin && m.margin != null && (
                      <span className="text-sm text-gray-600 tabular-nums" title={t("players.matches.pointMargin")}> {signed(m.margin, 0)}</span>
                    )}
                    {/* On small screens each set goes on its own line */}
                    <span className="match-score">
                      {m.score.split(", ").map((set, i, all) => (
                        <span key={i}>
                          {set}
                          {i < all.length - 1 && <span>, </span>}
                        </span>
                      ))}
                    </span>
                    {/* Just the number on phones, so it's no wider than a set score */}
                    <span className="match-note block tabular-nums sm:hidden" title={t("players.matches.winChanceTitle")}>
                      {chanceText}
                      <span className="sr-only">{t("players.matches.chanceScreenReader")}</span>
                    </span>
                  </td>
                  <td className="text-right tabular-nums hidden sm:table-cell">{chanceText}</td>
                  <td className="text-right tabular-nums whitespace-nowrap">
                    {Math.round(m.rating + m.change + (m.pull ?? 0))}
                    <span className={`block text-sm ${toneClass(m.change)}`}>{signed(m.change, 1)}</span>
                    {m.pull != null && (
                      <span className="block text-xs text-gray-500" title={t("players.matches.pullTitle")}>
                        {t("players.matches.pull", { pull: signed(m.pull, 1) })}
                      </span>
                    )}
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
          className={`mt-4 px-4 py-2 ${BUTTON} disabled:cursor-wait disabled:opacity-60`}
        >
          {loading === "yes"
            ? t("players.matches.loadingMore")
            : loading === "failed"
              ? t("players.matches.loadFailed")
              : expanded
                ? t("players.matches.showFewer")
                : t("players.matches.showAll", { count: num(total) })}
        </button>
      )}
    </div>
  );
}

/** The club a player played for in the match */
function PlayedFor({ club }: { club?: string | null }) {
  return club ? <span className="match-note"> · {club}</span> : null;
}
