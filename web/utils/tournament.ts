// The logic of the tournament page (app/(site)/tournaments/[id]/[[...path]]): how events are ordered and described,
// their rounds, the orders of the event table and the numbering of final standings.
import { plural, t } from "@/messages/i18n";
import type { Entry, Pool, Tournament, TournamentEvent } from "@/types";
import { isSingles } from "./pools";
import { byRating } from "./sort";

const DISCIPLINE_ORDER: Pool[] = ["men", "women", "mensDoubles", "womensDoubles", "mixedDoubles"];
// Levels within an age group: X (grand prix: the 6 highest ranked plus 2 wildcards, seniors and
// juniors alike), E (elite), A, B, C, D
const LEVEL_ORDER: Record<string, number> = { X: 0, E: 1, A: 2, B: 3, C: 4, D: 5 };

/**
 * Events by class: seniors and veterans first, then juniors from the oldest; within an age group
 * by level (X, E, A, B, C, D); within a class men's singles, women's singles, men's, women's and
 * mixed doubles. Each event with its index in the tournament.
 */
export function eventsByClass(t: Tournament): { className: string; events: { i: number; e: TournamentEvent }[] }[] {
  const key = (name: string) => {
    const [age, level = ""] = name.split(" ");
    const ageKey = /^U\d+$/.test(age) ? `b${200 - Number(age.slice(1))}` : `a${age}`;
    return `${ageKey} ${LEVEL_ORDER[level] ?? 9}${level}`;
  };
  const classes = [...new Set(t.events.map((e) => e.className))].sort((a, b) => key(a).localeCompare(key(b)));
  return classes.map((className) => ({
    className,
    events: t.events
      .map((e, i) => ({ i, e }))
      .filter(({ e }) => e.className === className)
      .sort((a, b) => DISCIPLINE_ORDER.indexOf(a.e.pool) - DISCIPLINE_ORDER.indexOf(b.e.pool)),
  }));
}

/** The event to show: ?event=<index>, or by class and pool (?class=SEN X&pool=men, from match lists), or the first */
/** A class name in a URL: "SEN A" → "sen-a", "U13 A" → "u13-a" */
export const classSlug = (className: string) => className.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** An event's page: /tournaments/<id>/<class>/<pool>, with the table order last unless it's the default */
export const eventHref = (cup2000Id: number, e: Pick<TournamentEvent, "className" | "pool">, order?: string) =>
  `/tournaments/${cup2000Id}/${classSlug(e.className)}/${e.pool}${order && order !== "default" ? `/${order}` : ""}`;

/**
 * What a tournament page shows, from its path after the id: [] the first event, ["summary"] the
 * summary, [class, pool] or [class, pool, order] an event. Null for a path that doesn't exist.
 */
export function pickView(t: Tournament, path: string[]): { view: "summary" } | { view: "events"; event: number; order: string | null } | null {
  if (!path.length) return { view: "events", event: 0, order: null };
  if (path.length === 1 && path[0] === "summary") return { view: "summary" };
  const [cls, pool, order = null, ...rest] = path;
  if (!pool || rest.length) return null;
  const event = t.events.findIndex((e) => classSlug(e.className) === cls && e.pool === pool);
  if (event < 0 || (order && !(order in orders(t.events[event])))) return null;
  return { view: "events", event, order };
}

/** No draw luck: a single group (everyone plays everyone) or just two entries (one match) */
export const noLuck = (e: TournamentEvent) => e.noLuck ?? e.singleGroup ?? false;

// Group places in the description ("the best runner-up and third of all groups"), and numbers in words
const PLACE_NAMES: Record<number, string> = {
  1: t("tournaments.description.places.winner"),
  2: t("tournaments.description.places.runnerUp"),
  3: t("tournaments.description.places.third"),
  4: t("tournaments.description.places.fourth"),
};
const NUMBERS: Record<number, string> = { 2: t("tournaments.description.numbers.two"), 3: t("tournaments.description.numbers.three"), 4: t("tournaments.description.numbers.four") };

/** "in 18 groups; only the group winners go to the knockout" and the like, for the event's description */
export function formatDescription(event: TournamentEvent): string {
  const ranks = event.advance?.ranks ?? [1];
  const best = event.advance?.best ?? [];
  const sameAs = (list: number[], other: number[]) => list.length === other.length && list.every((v, i) => v === other[i]);
  const goThrough = sameAs(ranks, [1])
    ? t(best.length ? "tournaments.description.winners" : "tournaments.description.onlyWinners")
    : t("tournaments.description.top", { count: NUMBERS[ranks.length] ?? ranks.length });
  const who = best.length
    ? t("tournaments.description.andBest", {
        who: goThrough,
        places: best.map((rank) => PLACE_NAMES[rank] ?? t("tournaments.description.places.other", { rank })).join(t("tournaments.description.and")),
      })
    : goThrough;
  const advance = t("tournaments.description.advance", { who });
  const others = (event.stages ?? []).filter((s) => !s.main && !s.places).length;
  if (event.groups.length) {
    let text = ` ${plural("tournaments.description.groups", event.groups.length)}`;
    if (event.knockout) {
      text += `; ${advance}`;
      if (others && !event.placement) text += `, ${plural("tournaments.description.rest", others)}`;
    }
    return text;
  }
  return event.knockout ? `, ${t("tournaments.description.knockout")}` : "";
}

/** An event's name in a sentence or heading: "SEN A men's singles" */
export const eventTitle = (e: Pick<TournamentEvent, "className" | "pool">) => t("tournaments.event.title", { className: e.className, pool: t(`common.poolsInSentence.${e.pool}`) });

/** "12 players", "8 pairs" */
export const entryCount = (e: Pick<TournamentEvent, "pool" | "entries">) => plural(isSingles(e.pool) ? "tournaments.event.players" : "tournaments.event.pairs", e.entries.length);

/** "the chance of reaching the knockout, which here means winning it" applies when only the group winners go through */
export const onlyWinners = (event: TournamentEvent) => (event.advance?.ranks ?? [1]).join() === "1" && !(event.advance?.best ?? []).length;

// The knockout rounds by level, counted back from the final: with an article ("reaching the final") and short ("final")
const ROUND_KEYS = ["final", "semiFinals", "quarterFinals", "last16", "last32", "last64", "last128"] as const;

/** The rounds of an event: out of the group, each knockout round reached, winning; with short names for the results */
export function rounds(event: TournamentEvent): { steps: string[]; short: string[] } {
  const steps: string[] = [];
  const short: string[] = [];
  const max = event.maxRounds;
  if (!event.knockout || !max) return { steps, short };
  const levels = max - (event.groups.length ? 1 : 0) - 1;
  if (event.groups.length) {
    steps.push(t("tournaments.rounds.outOfGroup"));
    short.push(t("tournaments.rounds.knockout"));
  }
  for (let level = levels - 1; level >= 0; level--) {
    const key = ROUND_KEYS[level];
    const round = t("tournaments.rounds.round", { number: levels - level });
    steps.push(t("tournaments.rounds.reaching", { round: key ? t(`tournaments.rounds.names.${key}`) : round }));
    short.push(key ? t(`tournaments.rounds.short.${key}`) : round);
  }
  steps.push(t("tournaments.rounds.winning"));
  short.push(t("tournaments.rounds.won"));
  return { steps, short };
}

export type Order = "default" | "group" | "rating" | "standings";

/**
 * The orders of the event table: luckiest first, by group (each group with its players by rating)
 * or by rating without groups, and the final standings once played. A single group has one order:
 * the most likely winner first (the same as by rating) before it's played, the standings after.
 */
export function orders(event: TournamentEvent): Partial<Record<Order, string>> {
  const played = event.played;
  const standings = t("tournaments.orders.finalStandings");
  if (noLuck(event)) return played ? { standings } : { default: t("tournaments.orders.mostLikelyWinner") };
  return {
    default: t("tournaments.orders.luckiest"),
    ...(event.groups.length > 1 ? { group: t("tournaments.orders.byGroup") } : { rating: t("tournaments.orders.byRating") }),
    ...(played ? { standings } : {}),
  };
}

export type Row = { header: string; detail: string } | { entry: Entry; place?: number };

const luckScore = (e: Entry) => e.luck?.score ?? e.luck?.progress ?? 0;

/** The table's rows in the order chosen; with final standings, each row's place (shared by those out at the same stage) */
export function tableRows(event: TournamentEvent, order: Order): Row[] {
  if (order === "group") {
    // A header row per group (in number order), then its players by rating; players who start in the knockout last
    const rows: Row[] = [];
    for (const g of [...event.groups].sort((a, b) => a.number - b.number)) {
      rows.push({ header: t("tournaments.table.groupHeader", { number: g.number }), detail: t("tournaments.table.groupDetail", { rating: g.rating }) });
      rows.push(...g.entries.map((i) => event.entries[i]).sort(byRating).map((entry) => ({ entry })));
    }
    const rest = event.entries.filter((e) => e.group === null);
    if (rest.length) rows.push({ header: t("tournaments.table.straightToKnockout"), detail: "" }, ...rest.sort(byRating).map((entry) => ({ entry })));
    return rows;
  }
  if (order === "standings") {
    // How they finished: the winner first, then by place (X classes), or by how far they got and their group place, ties by rating
    const r = (e: Entry) => e.result!;
    const sorted = [...event.entries].sort(
      event.placement
        ? (a, b) => r(a).place! - r(b).place! || byRating(a, b)
        : (a, b) => r(b).win - r(a).win || r(b).progress - r(a).progress || (r(a).groupRank ?? 99) - (r(b).groupRank ?? 99) || byRating(a, b),
    );
    const single = noLuck(event);
    let place = 0;
    let previous: string | null = null;
    return sorted.map((entry, i) => {
      const res = r(entry);
      const key = event.placement
        ? String(Math.floor(res.place!))
        : single
          ? String(res.groupRank ?? (res.win ? 1 : 2))
          : `${res.win}|${res.progress}|${res.progress < 1 ? (res.groupRank ?? 0) : 0}`;
      if (key !== previous) place = i + 1;
      previous = key;
      return { entry, place };
    });
  }
  if (order === "rating") return [...event.entries].sort(byRating).map((entry) => ({ entry }));
  return [...event.entries].sort(noLuck(event) ? (a, b) => b.actual.win - a.actual.win : (a, b) => luckScore(b) - luckScore(a)).map((entry) => ({ entry }));
}

/** Every entry with its event, for the tournament-wide lists (luck, and the winners of played events) */
export function allEntries(t: Tournament) {
  return t.events.flatMap((e, eventIndex) =>
    e.entries.map((entry) => ({ ...entry, eventIndex, eventLabel: eventTitle(e), placement: e.placement })),
  );
}
