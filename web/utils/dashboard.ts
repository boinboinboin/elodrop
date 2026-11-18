// A member's own numbers for the account page's overview (components/account/Overview.tsx), worked out on the server
// by app/api/players/[id]/dashboard from data the site has anyway: the player's file, their every match
// (matches/<id>.json) and the tournaments with a draw. Only what the player page doesn't show already: the next
// tournament they're drawn in, their recent weeks, each season's record and the career's records and form.
// Language-free: the browser writes it out.
import type { Achievement, History, Match, Player, Pool, Tournament, TournamentSummary } from "@/types";
import { isSingles } from "@/utils/pools";
import { DOUBLES_SCALE, expectedScore } from "@/utils/rating";

/** A player as the overview names them */
export interface Who {
  id: number | null;
  name: string;
}
/** Won, lost and drawn */
export interface Record3 {
  wins: number;
  losses: number;
  draws: number;
}
/** A match with its discipline (the match lists are per discipline) */
type PoolMatch = Match & { pool: Pool };

export interface NextEvent {
  className: string;
  pool: Pool;
  partner: Who | null;
  /** Their seed (1 the top), null when not seeded */
  seed: number | null;
  entries: number;
  /** The chance of winning the event, and the draw luck (points; + lucky), from the tournament's analysis */
  winChance: number;
  luck: number | null;
  /** Their group, with the chance of beating each of its other entries */
  group: { name: string; opponents: { players: Who[]; rating: number; chance: number }[] } | null;
}
export interface NextTournament {
  cup2000Id: number;
  name: string;
  startDate: string;
  endDate: string | null;
  events: NextEvent[];
}

export interface WeekGroup {
  /** A tournament (its name from the matches, and its page when it has one) or the week's team matches */
  kind: "tournament" | "teamMatches";
  name: string;
  cup2000Id: number | null;
  record: Record3;
  /** The rating gained or lost in each discipline played */
  change: Partial<Record<Pool, number>>;
  /** The win with the lowest chance */
  bestWin: { opponents: Who[]; chance: number; pool: Pool } | null;
  matches: PoolMatch[];
}
export interface Week {
  from: string;
  to: string;
  groups: WeekGroup[];
}

/** A badge earned, as shown (its title and art in the page's language, at the level reached) */
export interface BadgeView {
  title: string;
  art: string | null;
  artInvert?: true;
  date: string;
}
/** How a badge earned is shown: from the badges in the Studio (null: not shown, as on the player page) */
export type ViewBadge = (award: Achievement) => BadgeView | null;

export interface Partner extends Who, Record3 {
  matches: number;
}
export interface SeasonReview {
  season: number;
  record: Record3;
  pools: Partial<Record<Pool, Record3 & { start: number | null; end: number | null }>>;
  /** Matches they had under a 50 % chance of winning */
  underdog: Record3;
  /** Matches that went to a third set */
  decider: Record3;
  tournaments: number;
  teamMatches: number;
  partner: Partner | null;
  opponents: Partner[];
  /** The badges earned that season, newest first */
  badges: BadgeView[];
}

export interface Career {
  record: Record3;
  underdog: Record3;
  decider: Record3;
  longestStreak: { wins: number; from: string; to: string } | null;
  /** The most frequent partners (at least 3 matches together), top 3 in doubles and in mixed */
  partners: { doubles: Partner[]; mixed: Partner[] };
  /** The opponents they've lost to most (at least 3 losses), top 3 */
  nemeses: Partner[];
  /** The last 10 matches, newest first */
  form: { day: string; pool: Pool; result: number; opponents: Who[]; score: string }[];
}

export interface Dashboard {
  next: NextTournament[];
  weeks: Week[];
  seasons: SeasonReview[];
  career: Career;
  /** For the matches' links (their tournaments' pages) */
  tournamentLinks: Record<string, number>;
}

const WEEKS = 4;
const TOP = 3;
const FORM = 10;
const MIN_PARTNER = 3;

const empty = (): Record3 => ({ wins: 0, losses: 0, draws: 0 });
const add = (r: Record3, result: number) => {
  if (result === 1) r.wins++;
  else if (result === 0) r.losses++;
  else r.draws++;
};
/** The season a day is in: it starts in July (as pipeline/rate.mjs) */
const seasonOf = (day: string) => (+day.slice(5, 7) >= 7 ? +day.slice(0, 4) : +day.slice(0, 4) - 1);
const sets = (score: string) => score.split(",").filter((s) => /\d/.test(s)).length;
const who = (p: { id: number; name: string }): Who => ({ id: p.id, name: p.name });
/** The Monday of a day's week */
function monday(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** Every match of theirs, with its discipline, newest first (the same day: as listed) */
function allMatches(byPool: Partial<Record<Pool, Match[]>>): PoolMatch[] {
  return (Object.entries(byPool) as [Pool, Match[]][])
    .flatMap(([pool, list]) => list.map((m) => ({ ...m, pool })))
    .sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
}

/** The people most played with (doubles partners) or against, with their record together or against */
function people(matches: PoolMatch[], side: "partner" | "opponent"): Partner[] {
  const by = new Map<number, Partner>();
  for (const m of matches) {
    const list = side === "partner" ? (m.partner ? [m.partner] : []) : m.opponents;
    for (const p of list) {
      const e = by.get(p.id) ?? { id: p.id, name: p.name, matches: 0, ...empty() };
      e.matches++;
      add(e, m.result);
      by.set(p.id, e);
    }
  }
  return [...by.values()].sort((a, b) => b.matches - a.matches || b.wins - a.wins);
}

/** The rating at the end of the week a day is in (or the nearest week before with one), from the weekly history */
function ratingAt(history: History | null | undefined, day: string): number | null {
  if (!history) return null;
  const week = Math.floor((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${history.from}T00:00:00Z`)) / (7 * 86_400_000));
  for (let i = Math.min(week, history.ratings.length - 1); i >= 0; i--) if (history.ratings[i] != null) return Math.round(history.ratings[i]!);
  return null;
}

function seasonReviews(player: Player, matches: PoolMatch[], viewBadge: ViewBadge): SeasonReview[] {
  const seasons = [...new Set(matches.map((m) => seasonOf(m.day)))].sort((a, b) => b - a);
  return seasons.map((season) => {
    const list = matches.filter((m) => seasonOf(m.day) === season);
    const record = empty();
    const underdog = empty();
    const decider = empty();
    const pools: SeasonReview["pools"] = {};
    for (const m of list) {
      add(record, m.result);
      if (m.winChance < 0.5) add(underdog, m.result);
      if (sets(m.score) >= 3) add(decider, m.result);
      const p = (pools[m.pool] ??= { ...empty(), start: null, end: null });
      add(p, m.result);
    }
    // The rating at the season's start (the end of June) and its end (or now)
    for (const pool of Object.keys(pools) as Pool[]) {
      const history = player.pools[pool]?.history;
      pools[pool]!.start = ratingAt(history, `${season}-06-30`);
      pools[pool]!.end = ratingAt(history, `${season + 1}-06-30`);
    }
    const partners = people(list, "partner").filter((p) => p.matches >= MIN_PARTNER);
    return {
      season,
      record,
      pools,
      underdog,
      decider,
      tournaments: new Set(list.map((m) => m.key?.match(/^T(\d+)/)?.[1]).filter(Boolean)).size,
      teamMatches: new Set(list.map((m) => m.key?.match(/^L(\d+)/)?.[1]).filter(Boolean)).size,
      partner: partners[0] ?? null,
      opponents: people(list, "opponent").slice(0, TOP),
      badges: (player.achievements ?? [])
        .filter((a) => seasonOf(a.date) === season)
        .map(viewBadge)
        .filter((b): b is BadgeView => !!b)
        .sort((a, b) => b.date.localeCompare(a.date)),
    };
  });
}

function career(matches: PoolMatch[]): Career {
  const record = empty();
  const underdog = empty();
  const decider = empty();
  for (const m of matches) {
    add(record, m.result);
    if (m.winChance < 0.5) add(underdog, m.result);
    if (sets(m.score) >= 3) add(decider, m.result);
  }
  // Streaks over every discipline, oldest first
  let longest: Career["longestStreak"] = null;
  let run = 0;
  let from = "";
  for (const m of [...matches].reverse()) {
    if (m.result === 1) {
      if (run === 0) from = m.day;
      run++;
      if (!longest || run > longest.wins) longest = { wins: run, from, to: m.day };
    } else run = 0;
  }
  const losses = people(matches, "opponent")
    .filter((p) => p.losses >= MIN_PARTNER)
    .sort((a, b) => b.losses - a.losses || a.wins - b.wins);
  return {
    record,
    underdog,
    decider,
    longestStreak: longest,
    partners: {
      doubles: people(matches.filter((m) => m.pool === "mensDoubles" || m.pool === "womensDoubles"), "partner")
        .filter((p) => p.matches >= MIN_PARTNER)
        .slice(0, TOP),
      mixed: people(matches.filter((m) => m.pool === "mixedDoubles"), "partner")
        .filter((p) => p.matches >= MIN_PARTNER)
        .slice(0, TOP),
    },
    nemeses: losses.slice(0, TOP),
    form: matches.slice(0, FORM).map((m) => ({ day: m.day, pool: m.pool, result: m.result, opponents: m.opponents.map(who), score: m.score })),
  };
}

/** The last weeks they played, each split by tournament (and the week's team matches) */
function recentWeeks(matches: PoolMatch[], links: Record<string, number>): Week[] {
  const weeks: Week[] = [];
  for (const m of matches) {
    const start = monday(m.day);
    let week = weeks.at(-1);
    if (!week || monday(week.from) !== start) {
      if (weeks.length === WEEKS) break;
      week = { from: m.day, to: m.day, groups: [] };
      weeks.push(week);
    }
    if (m.day < week.from) week.from = m.day;
    if (m.day > week.to) week.to = m.day;
    const tournament = m.key?.match(/^T(\d+)/)?.[1];
    const key = tournament ? `T${tournament}` : "L";
    let group = week.groups.find((g) => (g.kind === "teamMatches" ? key === "L" : g.cup2000Id === (links[tournament ?? ""] ?? null) && g.name === eventName(m.event)));
    if (!group) {
      group = {
        kind: tournament ? "tournament" : "teamMatches",
        name: tournament ? eventName(m.event) : "",
        cup2000Id: tournament ? (links[tournament] ?? null) : null,
        record: empty(),
        change: {},
        bestWin: null,
        matches: [],
      };
      week.groups.push(group);
    }
    add(group.record, m.result);
    group.change[m.pool] = (group.change[m.pool] ?? 0) + m.change;
    if (m.result === 1 && (!group.bestWin || m.winChance < group.bestWin.chance)) group.bestWin = { opponents: m.opponents.map(who), chance: m.winChance, pool: m.pool };
    group.matches.push(m);
  }
  for (const w of weeks) for (const g of w.groups) for (const pool of Object.keys(g.change) as Pool[]) g.change[pool] = Math.round(g.change[pool]!);
  return weeks;
}

/** A tournament's name from its matches' event ("Bodø Polarcirkel Cup 2026 (SEN A)" → without the class) */
const eventName = (event: string) => event.replace(/\s*\([^()]*\)\s*$/, "");

/** The tournaments with a draw, not over, that the player is entered in: their events, partners, seeds and groups */
function nextTournaments(id: number, today: string, upcoming: Tournament[]): NextTournament[] {
  const found: NextTournament[] = [];
  for (const t of upcoming) {
    const events: NextEvent[] = [];
    for (const e of t.events) {
      const index = e.entries.findIndex((entry) => !entry.withdrew && entry.players.some((p) => p.id === id));
      if (index < 0) continue;
      const entry = e.entries[index];
      const partner = entry.players.find((p) => p.id !== id) ?? null;
      const group = e.groups.find((g) => g.entries.includes(index)) ?? null;
      const scale = isSingles(e.pool) ? undefined : DOUBLES_SCALE;
      events.push({
        className: e.className,
        pool: e.pool,
        partner: partner ? { id: partner.id, name: partner.name } : null,
        seed: e.seeds.includes(index) ? e.seeds.indexOf(index) + 1 : null,
        entries: e.entries.filter((x) => !x.withdrew).length,
        winChance: entry.actual.win,
        luck: entry.luck?.score ?? null,
        group:
          group
            ? {
                name: group.name,
                opponents: group.entries
                  .filter((i) => i !== index && !e.entries[i].withdrew)
                  .map((i) => ({ players: e.entries[i].players.map((p) => ({ id: p.id, name: p.name })), rating: Math.round(e.entries[i].rating), chance: expectedScore(entry.rating, e.entries[i].rating, scale) })),
              }
            : null,
      });
    }
    if (events.length && t.startDate) found.push({ cup2000Id: t.cup2000Id, name: t.name, startDate: t.startDate, endDate: t.endDate, events });
  }
  return found.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/** The tournaments to look in for the next one: with a draw, not cancelled, not over by `today` */
export const upcomingSummaries = (all: TournamentSummary[], today: string) => all.filter((t) => !t.cancelled && t.startDate && (t.endDate ?? t.startDate) >= today);

export function dashboard(player: Player, byPool: Partial<Record<Pool, Match[]>>, upcoming: Tournament[], today: string, viewBadge: ViewBadge = () => null): Dashboard {
  const matches = allMatches(byPool);
  const links = player.tournamentLinks ?? {};
  return {
    next: nextTournaments(player.id, today, upcoming),
    weeks: recentWeeks(matches, links),
    seasons: seasonReviews(player, matches, viewBadge),
    career: career(matches),
    tournamentLinks: links,
  };
}
