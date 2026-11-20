"use client";

// EloStonk's player search, under the squad: everyone who can be picked, found by name or club (folded as the site's
// search: utils/format.ts normalize), filtered by gender, discipline and "has an upcoming tournament" (drawn in one not
// over: the pipeline knows from the draws; team matches can't be known ahead, so it's a filter, not a rule), sorted by
// rating, form (the last 4 rounds), last round or how many picked them. Each with their stonk chart (the last 8 rounds)
// and a button to add them to the squad (off for a club the squad already has 2 from: rules.ts). With the upcoming filter on, they're grouped by the week they play in (Monday to
// Sunday, nearest first: this weekend, next weekend, …), a player drawn in several weeks in each of them.
import { getISOWeek } from "date-fns";
import { useMemo, useState } from "react";
import { MAX_PER_CLUB } from "@/components/elostonk/rules";
import Sparkline from "@/components/elostonk/Sparkline";
import { bestRating, form, type StonkPlayer, useNow } from "@/components/elostonk/useStonk";
import CheckToggle from "@/components/ui/CheckToggle";
import Link from "@/components/ui/Link";
import LinkSelect from "@/components/ui/LinkSelect";
import SearchField from "@/components/ui/SearchField";
import { toggleClass } from "@/components/ui/styles";
import { useGrowingList } from "@/components/ui/useGrowingList";
import { useI18n } from "@/messages/client";
import type { Pool } from "@/types";
import { normalize } from "@/utils/format";
import { poolsInOrder } from "@/utils/pools";
import { playerHref, tournamentHref } from "@/utils/hrefs";
import { addDays, osloToday } from "@/utils/rounds";

type Sort = "rating" | "form" | "last" | "picked";
type Kind = "all" | "singles" | "doubles" | "mixed";
const KIND_POOLS: Record<Exclude<Kind, "all">, Pool[]> = { singles: ["men", "women"], doubles: ["mensDoubles", "womensDoubles"], mixed: ["mixedDoubles"] };
/** Items grouped by a key, in first-seen order (Map.groupBy needs Safari 17.4, and iPhones from 16.4 use the app) */
function groupBy<T>(items: T[], key: (item: T) => string): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(item);
  }
  return [...groups];
}
/** The Monday of a day's week */
const mondayOf = (day: string) => addDays(day, -((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7));

export default function PlayerSearch({
  players,
  picked,
  owned,
  full,
  clubs,
  onAdd,
}: {
  players: StonkPlayer[];
  /** In the squad being made */
  picked: ReadonlySet<number>;
  /** How many squads have each player in the round under way (%) */
  owned: Map<number, number>;
  full: boolean;
  /** How many of the squad being made are from each club */
  clubs: Map<string, number>;
  onAdd: (id: number) => void;
}) {
  const { t, num, poolCodes, date, dateRange } = useI18n();
  const now = useNow();
  const [query, setQuery] = useState("");
  const [gender, setGender] = useState<"all" | "M" | "K">("all");
  const [kind, setKind] = useState<Kind>("all");
  const [upcoming, setUpcoming] = useState(false);
  const [sort, setSort] = useState<Sort>("form");

  const texts = useMemo(() => new Map(players.map((p) => [p.id, normalize(`${p.name} ${p.club ?? ""}`)])), [players]);
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const list = players
    .filter((p) => !terms.length || terms.every((w) => texts.get(p.id)!.includes(w)))
    .filter((p) => gender === "all" || p.gender === gender)
    .filter((p) => kind === "all" || KIND_POOLS[kind].some((pool) => p.ratings[pool]))
    .filter((p) => !upcoming || p.upcoming.length > 0);
  const score = (p: StonkPlayer) => (sort === "rating" ? bestRating(p) : sort === "form" ? form(p) : sort === "last" ? (p.points[1] ?? 0) : (owned.get(p.id) ?? 0));
  const sorted = [...list].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
  // One row per player, with their next tournament; with the upcoming filter, one per player and week they play in
  // (sorted by week, then as chosen), with that week's tournaments
  const rows = upcoming
    ? sorted
        .flatMap((p) => groupBy(p.upcoming, (u) => mondayOf(u.startDate)).map(([week, tournaments]) => ({ week, p, tournaments })))
        .sort((a, b) => a.week.localeCompare(b.week))
    : sorted.map((p) => ({ week: "", p, tournaments: p.upcoming.slice(0, 1) }));
  // The first rows, and more as the end comes near (as the rankings)
  const { limit, sentinel } = useGrowingList(rows.length, `${query}|${gender}|${kind}|${upcoming}|${sort}`);
  const shown = groupBy(rows.slice(0, limit), (r) => r.week);
  const thisWeek = now && mondayOf(osloToday(now));
  const weekTitle = (week: string) =>
    week === thisWeek ? t("elostonk.search.thisWeekend") : thisWeek && week === addDays(thisWeek, 7) ? t("elostonk.search.nextWeekend") : t("elostonk.search.week", { week: getISOWeek(new Date(`${week}T00:00:00Z`)) });

  const row = ({ p, tournaments }: (typeof rows)[number]) => {
    const inSquad = picked.has(p.id);
    // Already the most from their club (rules.ts)
    const clubFull = !inSquad && !!p.club && (clubs.get(p.club) ?? 0) >= MAX_PER_CLUB;
    const off = !inSquad && (full || clubFull);
    return (
      <li key={p.id} className="flex items-center gap-3 px-3 py-2">
        <div className="flex-1 min-w-0">
          <Link href={playerHref(p.id)} target="_blank" className="font-semibold hover:text-blue-600 break-words">{p.name}</Link>
          <span className="block text-sm text-gray-600 truncate">
            {p.club ?? ""}
            {/* Their own three disciplines first (a woman's men's singles rating, if any, after them) */}
            {poolsInOrder(p.gender)
              .filter((pool) => p.ratings[pool] !== undefined)
              .map((pool) => (
                <span key={pool} className="ml-2 whitespace-nowrap tabular-nums">
                  {poolCodes[pool]} {num(p.ratings[pool]!)}
                </span>
              ))}
          </span>
          {tournaments.map((u) => (
            <Link key={u.cup2000Id} href={tournamentHref(u.cup2000Id)} target="_blank" className="block text-xs text-gray-600 hover:text-blue-600 truncate">
              {t(upcoming ? "elostonk.search.drawn" : "elostonk.search.next", { name: u.name, date: date(u.startDate, "dayMonth") })}
            </Link>
          ))}
        </div>
        <div className="hidden sm:block text-right">
          <Sparkline points={p.points} label={t("elostonk.search.chart", { name: p.name })} />
        </div>
        <span className="w-14 text-right tabular-nums text-sm" title={t("elostonk.search.formTitle")}>{form(p) > 0 ? "+" : ""}{num(Math.round(form(p)))}</span>
        <button
          type="button"
          disabled={inSquad || off}
          onClick={() => onAdd(p.id)}
          aria-label={clubFull ? t("elostonk.search.clubFull", { name: p.name, club: p.club!, max: MAX_PER_CLUB }) : t("elostonk.search.add", { name: p.name })}
          title={clubFull ? t("elostonk.search.clubFull", { name: p.name, club: p.club!, max: MAX_PER_CLUB }) : undefined}
          className={`shrink-0 w-10 h-10 border border-black text-xl leading-none ${inSquad ? "bg-black text-white" : off ? "" : "hover:bg-black hover:text-white"} disabled:cursor-default ${off ? "opacity-30" : ""}`}
        >
          {inSquad ? "✓" : "+"}
        </button>
      </li>
    );
  };

  return (
    <div>
      {/* As the rankings: the count, and the search beside it; then the sort and the filters */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
        <p className="text-gray-600" aria-live="polite">{t("elostonk.search.count", { count: num(sorted.length) })}</p>
        <SearchField label={t("elostonk.search.label")} value={query} onChange={setQuery} />
      </div>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4 mb-4">
        <LinkSelect
          label={t("elostonk.search.sort")}
          current={sort}
          onSelect={(key) => setSort(key as Sort)}
          options={(["form", "last", "rating", "picked"] as const).map((s) => ({ key: s, label: t(`elostonk.search.sorts.${s}`) }))}
          className="w-full sm:w-64"
        />
        <div className="flex flex-wrap gap-2">
          {(["all", "M", "K"] as const).map((g) => (
            <button key={g} type="button" aria-pressed={gender === g} onClick={() => setGender(g)} className={toggleClass(gender === g, "sm")}>{t(`elostonk.search.genders.${g}`)}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "singles", "doubles", "mixed"] as const).map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={toggleClass(kind === k, "sm")}>{t(`elostonk.search.kinds.${k}`)}</button>
          ))}
        </div>
      </div>
      <CheckToggle checked={upcoming} onChange={setUpcoming} className="mb-4 items-start">
        <span>
          {t("elostonk.search.upcoming")}
          <span className="block text-sm text-gray-600">{t("elostonk.search.upcomingHelp")}</span>
        </span>
      </CheckToggle>
      {upcoming ? (
        shown.map(([week, list]) => (
          <section key={week} className="mb-6">
            <h3 className="mb-2">
              <span className="font-semibold">{weekTitle(week)}</span> <span className="text-sm text-gray-600">{dateRange(addDays(week, 4), addDays(week, 6))}</span>
            </h3>
            <ul className="divide-y divide-gray-200 bg-white">{list.map(row)}</ul>
          </section>
        ))
      ) : (
        <ul className="divide-y divide-gray-200 bg-white">{rows.slice(0, limit).map(row)}</ul>
      )}
      {limit < rows.length && <div ref={sentinel} aria-hidden="true" />}
    </div>
  );
}
