// The logic of the tournament page (app/(site)/tournaments/[id]/[[...path]]): how events are ordered and described,
// their rounds, the orders of the event table, the numbering of final standings and the bracket's layout.
import { createI18n, DEFAULT_LANGUAGE, type I18n } from "@/messages/i18n";
import type { BracketMatch, BracketSide, BracketStage, Entry, Pool, Tournament, TournamentEvent } from "@/types";
import { teamMatchHref, tournamentHref } from "./hrefs";
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
 * A match's page, from its key: a league match's team match ("L123 ..."), or a tournament match's event ("T7075 ...":
 * its class from the event name, "... (SEN A)", and its pool) when the tournament has a page (`cup2000Id`, from the
 * export's tournament links), else that tournament's page; null without one. For player matches (MatchTable) and upsets.
 */
export function matchHref(m: { key?: string; event: string; pool?: Pool | null }, cup2000Id: number | null | undefined, pool?: Pool) {
  const teamMatch = m.key?.match(/^L(\d+) /)?.[1];
  if (teamMatch) return teamMatchHref(Number(teamMatch));
  if (!cup2000Id || !m.key?.startsWith("T")) return null;
  const className = m.event.match(/\(([^()]+)\)\s*$/)?.[1];
  const eventPool = m.pool ?? pool;
  return className && eventPool ? eventHref(cup2000Id, { className, pool: eventPool }) : tournamentHref(cup2000Id);
}

/**
 * A player's match's page (their MatchTable, the Following card's latest results): a league match's team match page, or
 * a tournament match's event page (or the tournament's) when its tournament has a draw-luck page (`links`: the player
 * file's tournamentLinks, badmintonportalen id → Cup2000 id)
 */
export function matchEventHref(m: { key?: string; event: string; pool?: Pool | null }, links: Record<string, number> | undefined, pool: Pool | undefined) {
  const id = m.key?.match(/^T(\d+)/)?.[1];
  return matchHref(m, id ? links?.[id] : undefined, pool);
}

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
  // The orders' keys are the same in every language; only their names differ. The bracket is a view of its own
  // (BRACKET), for an event with a knockout
  if (event < 0) return null;
  if (order && !(order === BRACKET ? hasBracket(t.events[event]) : order in orders(createI18n(DEFAULT_LANGUAGE), t.events[event]))) return null;
  return { view: "events", event, order };
}

// ---- The bracket (components/tournaments/Bracket.tsx) ----

/** The bracket's view in an event's path: /tournaments/<id>/<class>/<pool>/bracket */
export const BRACKET = "bracket";

/** An event with a knockout to show as a bracket (none in exports from before it was added) */
export const hasBracket = (e: TournamentEvent) => !!e.bracket?.some((s) => s.matches.length);

/**
 * A view of an event (a table order or the bracket) for another event: kept when that event has it, so moving between
 * events keeps the view; else undefined, its default (no bracket without a knockout, no final standings before it's
 * played)
 */
export const viewIn = (i18n: I18n, e: TournamentEvent, view: string): string | undefined =>
  (view === BRACKET ? hasBracket(e) : view in orders(i18n, e)) ? view : undefined;

/** A match won with a smaller chance than this is an upset, as for team matches (pipeline/eliteserien.mjs TIE_UPSET) */
export const UPSET_CHANCE = 0.3;

/** Where a match sits in its stage's full bracket: its round, and its place in units of the first round's matches */
export interface BracketCell {
  match: BracketMatch;
  round: number;
  /** The first unit (0 at the top) and how many it covers: its two feeders each cover half */
  start: number;
  span: number;
  /** Which of its sides come from a match in the tree (the lines to their feeders) */
  fed: [boolean, boolean];
}

/**
 * A stage laid out as a full bracket, from its final: each match placed over the units its feeders take (a side
 * without a feeder, a bye or a player placed in a later round, leaves its half empty), so a match sits halfway
 * between its two feeders also where the draw has byes. `rounds`: each round's matches top to bottom, the first round
 * first; `extra`: the matches outside the tree (a play-off for third).
 */
export function bracketLayout(stage: BracketStage): { top: number; units: number; cells: BracketCell[]; rounds: BracketMatch[][]; extra: BracketMatch[] } {
  const byNo = new Map(stage.matches.map((m) => [m.no, m]));
  const feeder = (no: string | null) => (no ? byNo.get(no) : undefined);
  const final = stage.matches.find((m) => m.round === 0);
  const top = Math.max(0, ...stage.matches.map((m) => m.round ?? 0));
  const units = 2 ** top;
  const cells: BracketCell[] = [];
  const place = (match: BracketMatch, round: number, start: number, span: number) => {
    const feeders = (match.from ?? [null, null]).map(feeder);
    cells.push({ match, round, start, span, fed: [!!feeders[0], !!feeders[1]] });
    feeders.forEach((f, i) => f && round < top && place(f, round + 1, start + (i * span) / 2, span / 2));
  };
  if (final) place(final, 0, 0, units);
  const placed = new Set(cells.map((c) => c.match));
  const rounds = Array.from({ length: top + 1 }, (_, r) =>
    cells
      .filter((c) => c.round === top - r)
      .sort((a, b) => a.start - b.start)
      .map((c) => c.match),
  );
  return { top, units, cells, rounds, extra: stage.matches.filter((m) => !placed.has(m)) };
}

/** A round's name, by how far from the final it is: "Final", "Semi-finals", "Last 16", or "Round 2" beyond the named ones */
export function roundTitle({ t }: I18n, round: number, top: number): string {
  const key = ROUND_KEYS[round];
  const name = key ? t(`tournaments.rounds.short.${key}`) : t("tournaments.rounds.round", { number: top - round + 1 });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** A stage's name: the places it decides ("5.–6. plass"), else its title on Cup2000 after the class ("Puljevinner finale") */
export function stageTitle({ t }: I18n, stage: BracketStage, event: TournamentEvent): string {
  if (stage.places) return t("tournaments.bracket.places", { from: stage.places[0], to: stage.places[1] });
  const after = stage.title.split(event.className).at(-1)?.trim();
  return after || stage.title;
}

/** An entry's players by their last names, "Aas/Berg", for naming a match in another match's side */
const surnames = (e: Entry) => e.players.map((p) => p.name.split(" ").at(-1)).join("/");

/**
 * Where a side not known yet comes from: "Winner of group 3", "No. 2 in group 1", "Best no. 2 of the groups", "Winner
 * of Aas – Berg" (the match's players, when they're known; else its number), "Bye"
 */
export function sideLabel(i18n: I18n, side: BracketSide, event: TournamentEvent, stage: BracketStage): string {
  const { t } = i18n;
  if (!side) return t("tournaments.bracket.bye");
  if ("group" in side) return side.rank === 1 ? t("tournaments.bracket.groupWinner", { group: side.group }) : t("tournaments.bracket.groupPlace", { rank: side.rank, group: side.group });
  if ("bestOfRank" in side) return t("tournaments.bracket.bestOfRank", { rank: side.bestOfRank });
  if ("entry" in side) return surnames(event.entries[side.entry]);
  const no = "winnerOf" in side ? side.winnerOf : side.loserOf;
  const from = stage.matches.find((m) => m.no === no);
  const known = from?.sides.every((s) => s && "entry" in s);
  const match = known ? from!.sides.map((s) => surnames(event.entries[(s as { entry: number }).entry])).join(" – ") : t("tournaments.bracket.match", { no });
  return t("winnerOf" in side ? "tournaments.bracket.winnerOf" : "tournaments.bracket.loserOf", { match });
}

/** No draw luck: a single group (everyone plays everyone) or just two entries (one match) */
export const noLuck = (e: TournamentEvent) => e.noLuck ?? e.singleGroup ?? false;

/** "in 18 groups; only the group winners go to the knockout" and the like, for the event's description */
export function formatDescription({ t, plural }: I18n, event: TournamentEvent): string {
  // Group places ("the best runner-up and third of all groups"), and numbers in words
  const PLACE_NAMES: Record<number, string> = {
    1: t("tournaments.description.places.winner"),
    2: t("tournaments.description.places.runnerUp"),
    3: t("tournaments.description.places.third"),
    4: t("tournaments.description.places.fourth"),
  };
  const NUMBERS: Record<number, string> = { 2: t("tournaments.description.numbers.two"), 3: t("tournaments.description.numbers.three"), 4: t("tournaments.description.numbers.four") };
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
export const eventTitle = ({ t }: I18n, e: Pick<TournamentEvent, "className" | "pool">) => t("tournaments.event.title", { className: e.className, pool: t(`common.poolsInSentence.${e.pool}`) });

/** "12 players", "8 pairs" */
export const entryCount = ({ plural }: I18n, e: Pick<TournamentEvent, "pool" | "entries">) => plural(isSingles(e.pool) ? "tournaments.event.players" : "tournaments.event.pairs", e.entries.length);

/** "the chance of reaching the knockout, which here means winning it" applies when only the group winners go through */
export const onlyWinners = (event: TournamentEvent) => (event.advance?.ranks ?? [1]).join() === "1" && !(event.advance?.best ?? []).length;

// The knockout rounds by level, counted back from the final: with an article ("reaching the final") and short ("final")
const ROUND_KEYS = ["final", "semiFinals", "quarterFinals", "last16", "last32", "last64", "last128"] as const;

/** The rounds of an event: out of the group, each knockout round reached, winning; with short names for the results */
export function rounds({ t }: I18n, event: TournamentEvent): { steps: string[]; short: string[] } {
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
export function orders({ t }: I18n, event: TournamentEvent): Partial<Record<Order, string>> {
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
export function tableRows({ t }: I18n, event: TournamentEvent, order: Order): Row[] {
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
export function allEntries(i18n: I18n, t: Tournament) {
  return t.events.flatMap((e, eventIndex) =>
    e.entries.map((entry) => ({ ...entry, eventIndex, eventLabel: eventTitle(i18n, e), placement: e.placement })),
  );
}

/**
 * Why a tournament wasn't played, in the page's language: the data has a reason code (pipeline/upcoming.mjs
 * CANCELLED: "cancelled", "kingMourning"), or, from exports before the codes, the English text. Anything
 * else is shown as it is.
 */
export function cancelledReason({ t }: I18n, reason: string): string {
  const key = ({ cancelled: "cancelled", Cancelled: "cancelled", kingMourning: "kingMourning", "Cancelled at the last minute, in mourning for the King": "kingMourning" } as Record<string, "cancelled" | "kingMourning">)[reason];
  return key ? t(`tournaments.page.cancelledReasons.${key}`) : reason;
}
