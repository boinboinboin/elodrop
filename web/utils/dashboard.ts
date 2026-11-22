// A member's own numbers for the account page's overview (components/account/Overview.tsx), worked out on the server
// by app/api/players/[id]/dashboard from data the site has anyway: the player's file, their every match
// (matches/<id>.json) and the tournaments with a draw. Only what the player page doesn't show already: the next
// tournament they're drawn in, their recent weeks, each season's record and the career's records and form.
// Language-free: the browser writes it out.
import type { Achievement, History, Match, Player, Pool, RatingEntry, Tournament, TournamentSummary } from "@/types";
import { CLASS_CUTOFFS, CLASSES, type RatingClass } from "@/utils/classes";
import { isSingles } from "@/utils/pools";
import { DOUBLES_SCALE, expectedScore, minRating } from "@/utils/rating";

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
/**
 * A match with its discipline (the match lists are per discipline) and `moved`: how far the rating really moved with it,
 * the next match's starting rating minus its own. That takes in the doubles' pull towards singles and the minimum
 * ratings (400, doubles 550: a loss at the floor moves nothing), which its `change` alone doesn't.
 */
type PoolMatch = Match & { pool: Pool; moved: number };

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
  group: { name: string; opponents: Opponent[] } | null;
}
/** A group opponent: their rating, the member's chance against them, their meetings before and their form */
export interface Opponent {
  players: Who[];
  rating: number;
  chance: number;
  /** The member's record against them (any of the pair) in this discipline, and the last time they met */
  met: Record3 & { last: string | null };
  /** Their rating's change over the last 4 weeks in this discipline (a pair: the two's average; null: not known) */
  form: number | null;
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
  /** The rating gained or lost in each discipline played: how far it really moved (the matches' `moved`: with the
   * doubles' pull towards singles and the minimum ratings) */
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
  /** Matches whose last set was decided by 3 points or fewer */
  close: Record3;
  /** The tournaments played that season, newest first */
  events: SeasonTournament[];
  /** The most frequent partners that season, top 3 (however few matches: a season can have few) */
  partners: Partner[];
  opponents: Partner[];
  /** The badges earned that season, newest first */
  badges: BadgeView[];
}

/** A tournament in a season: the matches' record, and how far each event went when the tournament has a page */
export interface SeasonTournament {
  name: string;
  cup2000Id: number | null;
  record: Record3;
  /**
   * Each event's outcome, from the tournament's draw (only for tournaments with a page): the steps got through (the
   * draw's result.progress: out of the group, each knockout round, winning) and the event's shape to name them by
   */
  events: { className: string; pool: Pool; progress: number; knockout: boolean; maxRounds: number; groups: number; won: boolean }[];
}

/** How a member plays: matches, record and performance (points a match: 100 × (result − chance), averaged) */
export interface Split extends Record3 {
  matches: number;
  perf: number;
}
/** A doubles or mixed partner and how the two do together against expectation */
export interface Chemistry extends Who, Split {
  kind: "doubles" | "mixed";
}

/** Where the member stands in a discipline they're ranked in: the players either side, their club, the next class */
export interface Standing {
  pool: Pool;
  rating: number;
  rank: number;
  above: { id: number; name: string; rating: number; rank: number } | null;
  below: { id: number; name: string; rating: number; rank: number } | null;
  club: string | null;
  clubRank: number | null;
  clubRanked: number;
  /** The next better rating class and the points to it (null: in the best, E) */
  nextClass: { cls: RatingClass; points: number } | null;
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
  /** Matches whose last set was decided by 3 points or fewer */
  close: Record3;
  /** Doubles and mixed partners (at least 5 matches together), with the most matches first, top 3 each */
  chemistry: Chemistry[];
  /** Team matches against tournaments, and the tournament classes (A–E), with at least 5 matches each */
  strongest: (Split & { key: "teamMatches" | "tournaments" | RatingClass })[];
  /** The last 10 matches, newest first */
  form: { day: string; pool: Pool; result: number; opponents: Who[]; score: string }[];
}

export interface Dashboard {
  next: NextTournament[];
  weeks: Week[];
  seasons: SeasonReview[];
  career: Career;
  standings: Standing[];
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
const who = (p: { id: number | null; name: string }): Who => ({ id: p.id, name: p.name });
// A player in a match, as one person: by id, or by name for players without a page (id null: not
// identified in a Profixio tournament, 2010-2014)
const personKey = (p: { id: number | null; name: string }) => p.id ?? `name:${p.name}`;
/** The last set decided by 3 points or fewer ("21-19, 18-21, 22-20") */
const isClose = (score: string) => {
  const [a, b] = (score.split(",").filter((x) => /\d/.test(x)).at(-1)?.match(/\d+/g) ?? []).map(Number);
  return a !== undefined && b !== undefined && Math.abs(a - b) <= 3;
};
/** Matches, record and performance (points a match) of a list */
function split(matches: PoolMatch[]): Split {
  const r = empty();
  let perf = 0;
  for (const m of matches) {
    add(r, m.result);
    perf += 100 * (m.result - m.winChance);
  }
  return { ...r, matches: matches.length, perf: matches.length ? Math.round((perf / matches.length) * 10) / 10 : 0 };
}
/** A tournament match's class letter, from its event ("… (SEN A)" → A) */
const classLetter = (event: string) => (/\(([^()]+)\)\s*$/.exec(event)?.[1].match(/(?:^|\s)([A-E])$/)?.[1] as RatingClass | undefined) ?? null;
const MIN_SPLIT = 5;
/** The Monday of a day's week */
function monday(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** Every match of theirs, with its discipline, newest first (the same day: as listed) */
function allMatches(byPool: Partial<Record<Pool, Match[]>>): PoolMatch[] {
  return (Object.entries(byPool) as [Pool, Match[]][])
    .flatMap(([pool, list]) =>
      // Newest first: a match's rating is the one before it, so the one after it is the newer match's (the newest's:
      // its change, kept above the minimum, and its pull)
      list.map((m, i) => {
        const after = i > 0 ? list[i - 1].rating : Math.max(minRating(!isSingles(pool)), m.rating + m.change) + (m.pull ?? 0);
        return { ...m, pool, moved: after - m.rating };
      }),
    )
    .sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
}

/** The people most played with (doubles partners) or against, with their record together or against */
function people(matches: PoolMatch[], side: "partner" | "opponent"): Partner[] {
  const by = new Map<number | string, Partner>();
  for (const m of matches) {
    const list = side === "partner" ? (m.partner ? [m.partner] : []) : m.opponents;
    for (const p of list) {
      const e = by.get(personKey(p)) ?? { id: p.id, name: p.name, matches: 0, ...empty() };
      e.matches++;
      add(e, m.result);
      by.set(personKey(p), e);
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

function seasonReviews(player: Player, matches: PoolMatch[], viewBadge: ViewBadge, files: Map<number, Tournament>): SeasonReview[] {
  const links = player.tournamentLinks ?? {};
  const seasons = [...new Set(matches.map((m) => seasonOf(m.day)))].sort((a, b) => b - a);
  return seasons.map((season) => {
    const list = matches.filter((m) => seasonOf(m.day) === season);
    const record = empty();
    const underdog = empty();
    const decider = empty();
    const close = empty();
    const pools: SeasonReview["pools"] = {};
    for (const m of list) {
      add(record, m.result);
      if (m.winChance < 0.5) add(underdog, m.result);
      if (sets(m.score) >= 3) add(decider, m.result);
      if (isClose(m.score)) add(close, m.result);
      const p = (pools[m.pool] ??= { ...empty(), start: null, end: null });
      add(p, m.result);
    }
    // The rating at the season's start (the end of June) and its end (or now)
    for (const pool of Object.keys(pools) as Pool[]) {
      const history = player.pools[pool]?.history;
      pools[pool]!.start = ratingAt(history, `${season}-06-30`);
      pools[pool]!.end = ratingAt(history, `${season + 1}-06-30`);
    }
    const partners = people(list, "partner");
    // The season's tournaments (newest first: the matches are), each with its events' outcomes where it has a page
    const byTournament = new Map<string, PoolMatch[]>();
    for (const m of list) {
      const id = m.key?.match(/^T(\d+)/)?.[1];
      if (!id) continue;
      if (!byTournament.has(id)) byTournament.set(id, []);
      byTournament.get(id)!.push(m);
    }
    const events: SeasonTournament[] = [...byTournament].map(([id, ms]) => {
      const cup2000Id = links[id] ?? null;
      const file = cup2000Id ? files.get(cup2000Id) : undefined;
      const outcome: SeasonTournament["events"] = [];
      for (const e of file?.events ?? []) {
        if (!e.played) continue;
        const entry = e.entries.find((x) => x.players.some((p) => p.id === player.id));
        if (!entry) continue;
        outcome.push({ className: e.className, pool: e.pool, progress: entry.result?.progress ?? 0, knockout: e.knockout, maxRounds: e.maxRounds, groups: e.groups.length, won: entry.result?.win === 1 });
      }
      const r = empty();
      for (const m of ms) add(r, m.result);
      return { name: eventName(ms[0].event), cup2000Id, record: r, events: outcome };
    });
    return {
      season,
      record,
      pools,
      underdog,
      decider,
      tournaments: new Set(list.map((m) => m.key?.match(/^T(\d+)/)?.[1]).filter(Boolean)).size,
      teamMatches: new Set(list.map((m) => m.key?.match(/^L(\d+)/)?.[1]).filter(Boolean)).size,
      close,
      events,
      partners: partners.slice(0, TOP),
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
  const close = empty();
  for (const m of matches) {
    add(record, m.result);
    if (m.winChance < 0.5) add(underdog, m.result);
    if (sets(m.score) >= 3) add(decider, m.result);
    if (isClose(m.score)) add(close, m.result);
  }
  // Partners against expectation: per partner and kind, at least MIN_SPLIT matches, the most played first
  const chemistry: Chemistry[] = [];
  for (const kind of ["doubles", "mixed"] as const) {
    const byPartner = new Map<number | string, { id: number | null; name: string; list: PoolMatch[] }>();
    for (const m of matches) {
      if (!m.partner || (kind === "mixed") !== (m.pool === "mixedDoubles")) continue;
      const key = personKey(m.partner);
      if (!byPartner.has(key)) byPartner.set(key, { id: m.partner.id, name: m.partner.name, list: [] });
      byPartner.get(key)!.list.push(m);
    }
    chemistry.push(
      ...[...byPartner]
        .filter(([, p]) => p.list.length >= MIN_SPLIT)
        .sort((a, b) => b[1].list.length - a[1].list.length)
        .slice(0, TOP)
        .map(([, p]) => ({ id: p.id, name: p.name, kind, ...split(p.list) })),
    );
  }
  // Team matches against tournaments, and the tournament classes
  const keyed = (key: Career["strongest"][number]["key"], list: PoolMatch[]) => ({ key, ...split(list) });
  const tournamentMatches = matches.filter((m) => m.key?.startsWith("T"));
  const strongest = [
    keyed("teamMatches", matches.filter((m) => m.key?.startsWith("L"))),
    keyed("tournaments", tournamentMatches),
    ...CLASSES.map((c) => keyed(c, tournamentMatches.filter((m) => classLetter(m.event) === c))),
  ].filter((s) => s.matches >= MIN_SPLIT);
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
    close,
    chemistry,
    strongest,
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
    group.change[m.pool] = (group.change[m.pool] ?? 0) + m.moved;
    if (m.result === 1 && (!group.bestWin || m.winChance < group.bestWin.chance)) group.bestWin = { opponents: m.opponents.map(who), chance: m.winChance, pool: m.pool };
    group.matches.push(m);
  }
  for (const w of weeks) for (const g of w.groups) for (const pool of Object.keys(g.change) as Pool[]) g.change[pool] = Math.round(g.change[pool]!);
  return weeks;
}

/** A tournament's name from its matches' event ("Bodø Polarcirkel Cup 2026 (SEN A)" → without the class) */
const eventName = (event: string) => event.replace(/\s*\([^()]*\)\s*$/, "");

/** The tournaments with a draw, not over, that the player is entered in: their events, partners, seeds and groups */
/** A player's rating change in a discipline over the last 4 weeks (their weekly history), null when not known */
function formOf(player: Player | undefined, pool: Pool): number | null {
  const ratings = player?.pools[pool]?.history?.ratings;
  if (!ratings?.length) return null;
  const now = ratings.at(-1);
  const before = ratings.at(-5);
  return now == null || before == null ? null : Math.round(now - before);
}

function nextTournaments(id: number, today: string, upcoming: Tournament[], matches: PoolMatch[], opponents: Map<number, Player>): NextTournament[] {
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
                  .map((i) => {
                    const ids = e.entries[i].players.map((p) => p.id).filter((x): x is number => !!x);
                    // Their meetings before in this discipline (any of the pair), newest first
                    const meetings = matches.filter((m) => m.pool === e.pool && m.opponents.some((o) => o.id !== null && ids.includes(o.id)));
                    const met = { ...empty(), last: meetings[0]?.day ?? null };
                    for (const m of meetings) add(met, m.result);
                    const forms = ids.map((x) => formOf(opponents.get(x), e.pool)).filter((f): f is number => f !== null);
                    return {
                      players: e.entries[i].players.map((p) => ({ id: p.id, name: p.name })),
                      rating: Math.round(e.entries[i].rating),
                      chance: expectedScore(entry.rating, e.entries[i].rating, scale),
                      met,
                      form: forms.length ? Math.round(forms.reduce((a, b) => a + b, 0) / forms.length) : null,
                    };
                  }),
              }
            : null,
      });
    }
    if (events.length && t.startDate) found.push({ cup2000Id: t.cup2000Id, name: t.name, startDate: t.startDate, endDate: t.endDate, events });
  }
  return found.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/** Where the player stands in each discipline they're ranked in (the rankings: mixed doubles the player's gender's) */
function standingsOf(player: Player, rankings: Partial<Record<Pool, RatingEntry[]>>): Standing[] {
  const out: Standing[] = [];
  for (const [pool, entry] of Object.entries(player.pools) as [Pool, NonNullable<Player["pools"][Pool]>][]) {
    const list = rankings[pool];
    const i = list?.findIndex((p) => p.id === player.id) ?? -1;
    if (!list || i < 0 || entry.rank === null) continue;
    const near = (p: RatingEntry | undefined) => (p ? { id: p.id, name: p.name, rating: Math.round(p.rating), rank: p.rank ?? 0 } : null);
    const club = list[i].club ?? null;
    const clubmates = club ? list.filter((p) => p.club === club) : [];
    const rating = Math.round(entry.rating);
    // The next better class: the lowest cutoff above the rating (CLASSES best first, as their cutoffs)
    const next = CLASS_CUTOFFS.map((cutoff, c) => ({ cutoff, c })).filter((x) => x.cutoff > rating).at(-1);
    out.push({
      pool,
      rating,
      rank: entry.rank,
      above: near(list[i - 1]),
      below: near(list[i + 1]),
      club,
      clubRank: club ? clubmates.findIndex((p) => p.id === player.id) + 1 : null,
      clubRanked: clubmates.length,
      nextClass: next ? { cls: CLASSES[next.c], points: next.cutoff - rating } : null,
    });
  }
  return out;
}

/** The tournaments to look in for the next one: with a draw, not cancelled, not over by `today` */
export const upcomingSummaries = (all: TournamentSummary[], today: string) => all.filter((t) => !t.cancelled && t.startDate && (t.endDate ?? t.startDate) >= today);

/** What the route loads besides the player: the rankings they're in, their next opponents, the season's tournaments */
export interface DashboardData {
  rankings?: Partial<Record<Pool, RatingEntry[]>>;
  opponents?: Map<number, Player>;
  tournaments?: Map<number, Tournament>;
}

export function dashboard(player: Player, byPool: Partial<Record<Pool, Match[]>>, upcoming: Tournament[], today: string, viewBadge: ViewBadge = () => null, data: DashboardData = {}): Dashboard {
  const matches = allMatches(byPool);
  const links = player.tournamentLinks ?? {};
  return {
    next: nextTournaments(player.id, today, upcoming, matches, data.opponents ?? new Map()),
    weeks: recentWeeks(matches, links),
    seasons: seasonReviews(player, matches, viewBadge, data.tournaments ?? new Map()),
    career: career(matches),
    standings: standingsOf(player, data.rankings ?? {}),
    tournamentLinks: links,
  };
}
