// The rating data (pipeline/export.mjs): read from the data bucket (DATA_URL) or, locally, from a
// folder (DATA_DIR, e.g. ../pipeline/export). Every read is cached under the "elo-data" tag, which
// the pipeline revalidates after each run (app/api/revalidate).
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { cacheLife, cacheTag } from "next/cache";
import { normalize, words as splitWords } from "./format";
import type {
  ClubHistoryPool,
  ClubsFile,
  Gender,
  Match,
  Meta,
  Player,
  PlayerPool,
  Pool,
  RatingEntry,
  Tournament,
  TournamentsIndex,
  UpsetWeek,
} from "./types";

export const POOLS: Record<Pool, string> = {
  men: "Men's singles",
  women: "Women's singles",
  mensDoubles: "Men's doubles",
  womensDoubles: "Women's doubles",
  mixedDoubles: "Mixed doubles",
};
export const POOL_KEYS = Object.keys(POOLS) as Pool[];
export const isPool = (value: unknown): value is Pool => typeof value === "string" && value in POOLS;

/** Rating difference scale of the expected score, as SCALE in pipeline/rules.mjs */
const SCALE = 300;
export const expectedScore = (ra: number, rb: number) => 1 / (1 + 10 ** ((rb - ra) / SCALE));

async function load<T>(path: string): Promise<T | null> {
  "use cache";
  cacheTag("elo-data");
  cacheLife("days");
  const dir = process.env.DATA_DIR;
  if (dir) {
    try {
      // Local development only, so the bundler needn't trace it
      return JSON.parse(await readFile(join(/*turbopackIgnore: true*/ process.cwd(), dir, path), "utf8")) as T;
    } catch {
      return null;
    }
  }
  const base = process.env.DATA_URL;
  if (!base) throw new Error("Set DATA_URL (the data bucket) or DATA_DIR (a local export folder)");
  const res = await fetch(`${base}/${path}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return (await res.json()) as T;
}

// ---- Meta, rankings and clubs ----

export const getMeta = async () => load<Meta>("meta.json");

/**
 * Ranked (active) players in a pool, best first. With includeInactive, also players who haven't
 * played in the last 12 months (rank null), in rating order among the ranked ones. With a gender,
 * only players of that gender (mixed doubles ranks men and women separately).
 */
export async function getRankings(pool: Pool, includeInactive = false, gender: Gender | null = null): Promise<RatingEntry[]> {
  const active = (await load<{ players: RatingEntry[] }>(`rankings/${pool}.json`))?.players ?? [];
  let players = active;
  if (includeInactive) {
    const inactive = (await load<{ players: RatingEntry[] }>(`rankings/${pool}-inactive.json`))?.players ?? [];
    players = [...active, ...inactive].sort((a, b) => b.rating - a.rating);
  }
  return gender ? players.filter((p) => p.gender === gender) : players;
}

export const getClubsFile = async () => load<ClubsFile>("clubs.json");

/** A club's ranked players in a pool (by the club shown for each player), best first */
export async function getClubPlayers(club: string, pool: Pool): Promise<RatingEntry[]> {
  return (await getRankings(pool)).filter((p) => p.club === club);
}

export async function getClubHistory(nbfClubId: number): Promise<Partial<Record<Pool | "combined", ClubHistoryPool>>> {
  return (await load<{ pools: Partial<Record<Pool | "combined", ClubHistoryPool>> }>(`club-history/${nbfClubId}.json`))?.pools ?? {};
}

// ---- Players ----

export async function getPlayer(id: number): Promise<Player | null> {
  return load<Player>(`players/${id}.json`);
}

/**
 * A player's every match per pool, newest first (matches/<id>.json). A player file has only the
 * newest few; exports from before the split have them all there, so they're the fallback.
 */
export async function getPlayerMatches(player: Player): Promise<Partial<Record<Pool, Match[]>>> {
  const file = await load<{ pools: Partial<Record<Pool, Match[]>> }>(`matches/${player.id}.json`);
  if (file) return file.pools;
  return Object.fromEntries(Object.entries(player.pools).map(([pool, p]) => [pool, p?.matchLog?.all ?? []]));
}

type SearchRow = [number, string, string | null, 0 | 1, number];
const searchIndex = async () => (await load<{ players: SearchRow[] }>("search-index.json"))?.players ?? [];

/** Players whose name contains every word of the query: name starting with it first, then ranked, then most matches */
export async function searchPlayers(query: string, limit = 10): Promise<{ id: number; name: string; club: string | null }[]> {
  const words = splitWords(query);
  if (!words.length) return [];
  const found: { id: number; name: string; club: string | null; ranked: number; matches: number; prefix: boolean }[] = [];
  for (const [id, name, club, ranked, matches] of await searchIndex()) {
    const n = normalize(name);
    if (words.every((w) => n.includes(w))) found.push({ id, name, club, ranked, matches, prefix: n.startsWith(words[0]) });
  }
  found.sort((a, b) => +b.prefix - +a.prefix || b.ranked - a.ranked || b.matches - a.matches);
  return found.slice(0, limit).map(({ id, name, club }) => ({ id, name, club }));
}

// ---- Head to head ----

export interface Record3 {
  matches: number;
  wins: number;
  draws: number;
  losses: number;
}

function record(matches: Match[]): Record3 {
  const results = matches.map((m) => m.result);
  return {
    matches: results.length,
    wins: results.filter((r) => r === 1).length,
    draws: results.filter((r) => r > 0 && r < 1).length,
    losses: results.filter((r) => r === 0).length,
  };
}

/** Sets and points of a score from the player's side ("21-17, 18-21, 21-15"); nulls for a walkover or unreadable score */
function points(score: string) {
  if (!/^\d+-\d+(, \d+-\d+)*$/.test(score.trim())) return { setsFor: null, setsAgainst: null, pointsFor: null, pointsAgainst: null, margin: null };
  let pointsFor = 0, pointsAgainst = 0, setsFor = 0, setsAgainst = 0;
  for (const [, x, y] of score.matchAll(/(\d+)-(\d+)/g)) {
    pointsFor += +x;
    pointsAgainst += +y;
    if (+x > +y) setsFor++;
    if (+y > +x) setsAgainst++;
  }
  return { setsFor, setsAgainst, pointsFor, pointsAgainst, margin: pointsFor - pointsAgainst };
}

export interface MarginSide {
  wins: number;
  average: number | null;
  biggest: Match | null;
}
export interface Margins {
  matches: number;
  sets: [number, number];
  points: [number, number];
  deciding: number;
  closest: Match | null;
  a: MarginSide;
  b: MarginSide;
}

/** Winning margins of meetings from A's side (matches with a readable score) */
function margins(meetings: Match[]): Margins {
  const scored = meetings.filter((m) => m.margin !== null && m.margin !== undefined);
  const side = (forA: boolean): MarginSide => {
    const wins = scored.filter((m) => (forA ? m.result === 1 : m.result === 0));
    const values = wins.map((m) => Math.abs(m.margin!));
    return {
      wins: wins.length,
      average: values.length ? values.reduce((s, v) => s + v, 0) / values.length : null,
      biggest: wins.reduce<Match | null>((best, m) => (!best || Math.abs(m.margin!) > Math.abs(best.margin!) ? m : best), null),
    };
  };
  const sum = (key: "setsFor" | "setsAgainst" | "pointsFor" | "pointsAgainst") => scored.reduce((s, m) => s + (m[key] ?? 0), 0);
  return {
    matches: scored.length,
    sets: [sum("setsFor"), sum("setsAgainst")],
    points: [sum("pointsFor"), sum("pointsAgainst")],
    deciding: scored.filter((m) => (m.setsFor ?? 0) + (m.setsAgainst ?? 0) === 3).length,
    closest: scored.reduce<Match | null>((best, m) => (!best || Math.abs(m.margin!) < Math.abs(best.margin!) ? m : best), null),
    a: side(true),
    b: side(false),
  };
}

/** A player's gender, from their pool entries (null when unknown) */
export const playerGender = (player: Player): Gender | null => Object.values(player.pools).find((p) => p?.gender)?.gender ?? null;

/**
 * Whether players of these genders are compared in a pool: singles and same-gender doubles only
 * between players of that gender (women who play men's singles mostly do so when there are too
 * few for women's singles), mixed doubles between anyone. An unknown gender rules nothing out.
 */
export function comparableIn(pool: Pool, genders: (Gender | null)[]): boolean {
  if (pool === "men" || pool === "mensDoubles") return !genders.includes("K");
  if (pool === "women" || pool === "womensDoubles") return !genders.includes("M");
  return true;
}

export type PairKind = "men" | "women" | "mixed";

/** A doubles pair's kind from its players' genders (null when one is unknown) */
export const pairKind = ([g1, g2]: (Gender | null)[]): PairKind | null =>
  !g1 || !g2 ? null : g1 !== g2 ? "mixed" : g1 === "M" ? "men" : "women";

/** Whether a pair of these genders plays in a doubles pool (an unknown gender rules nothing out) */
function pairPlaysIn(pool: Pool, genders: (Gender | null)[]): boolean {
  if (pool === "mixedDoubles") return !(genders[0] && genders[0] === genders[1]);
  return comparableIn(pool, genders);
}

export interface HeadToHeadPool {
  label: string;
  a: PlayerPool;
  b: PlayerPool;
  /** A's chance of beating B now (in doubles, with equally rated partners) */
  chance: number;
  record: Record3;
  margins: Margins;
}

export interface HeadToHead {
  a: Player;
  b: Player;
  meetings: Match[];
  together: Match[];
  record: Record3;
  margins: Margins;
  togetherRecord: Record3;
  pools: Partial<Record<Pool, HeadToHeadPool>>;
  /** A man against a woman, just for fun: the woman's rating moved onto the men's scale */
  crossovers: HeadToHeadCrossover[];
}

/** Two players head to head, from A's complete match logs */
export async function getHeadToHead(a: number, b: number): Promise<HeadToHead | null> {
  const [playerA, playerB] = await Promise.all([getPlayer(a), getPlayer(b)]);
  if (!playerA || !playerB || a === b) return null;
  const allMatches = await getPlayerMatches(playerA);
  const meetings: Match[] = [];
  const together: Match[] = [];
  for (const [pool, p] of Object.entries(playerA.pools) as [Pool, PlayerPool][]) {
    for (const match of allMatches[pool] ?? []) {
      const m = { ...match, pool, poolLabel: p.label, ...points(match.score ?? "") };
      if (m.opponents.some((o) => o.id === b)) meetings.push(m);
      else if (m.partner?.id === b) together.push(m);
    }
  }
  const newestFirst = (x: Match, y: Match) => y.day.localeCompare(x.day);
  meetings.sort(newestFirst);
  together.sort(newestFirst);
  const pools: Partial<Record<Pool, HeadToHeadPool>> = {};
  const genders = [playerGender(playerA), playerGender(playerB)];
  for (const [pool, p] of Object.entries(playerA.pools) as [Pool, PlayerPool][]) {
    const q = playerB.pools[pool];
    if (!q || !comparableIn(pool, genders)) continue;
    const inPool = meetings.filter((m) => m.pool === pool);
    pools[pool] = { label: p.label, a: p, b: q, chance: expectedScore(p.rating, q.rating), record: record(inPool), margins: margins(inPool) };
  }
  return { a: playerA, b: playerB, meetings, together, record: record(meetings), margins: margins(meetings), togetherRecord: record(together), pools, crossovers: await crossovers(playerA, playerB, meetings) };
}

// ---- Men against women ----

/** How women's ratings compare with men's (pipeline/gender-gap.mjs) */
export interface GenderGapFit {
  a: number;
  b: number;
  matches: number;
  /** The women's ratings the fit covers; beyond them it's extrapolated */
  range: [number, number];
}
export interface GenderGap {
  p0: number;
  singles: GenderGapFit;
  doubles: GenderGapFit;
}
export const getGenderGap = async () => load<GenderGap>("gender-gap.json");

export type Format = "singles" | "doubles";
const MENS_POOLS: Record<Format, Pool> = { singles: "men", doubles: "mensDoubles" };
const WOMENS_POOLS: Record<Format, Pool> = { singles: "women", doubles: "womensDoubles" };

/** A woman's rating in her own discipline on the men's scale: w + a + b·(w − p0) */
export const onMensScale = (w: number, fit: GenderGapFit, p0: number) => w + fit.a + fit.b * (w - p0);

/** One player in a comparison: their entry in the pool their rating is from, and that rating on the compared scale */
export interface Side {
  entry: PlayerPool;
  pool: Pool;
  /** The rating compared: the entry's own, or a woman's on the men's scale */
  rating: number;
  /** A woman's rating moved onto the men's scale, beyond the ratings the fit covers */
  extrapolated?: boolean;
}

export interface PairHistory {
  from: string;
  ratings: (number | null)[];
}

/** A side's weekly ratings on the compared scale (a woman's moved onto the men's) */
const scaled = (side: Side, map: ((w: number) => number) | null) => ({
  from: side.entry.history?.from ?? "",
  ratings: (side.entry.history?.ratings ?? []).map((r) => (r == null ? null : map ? map(r) : r)),
});

/** Summed weekly ratings, over the weeks every player has a rating */
function summedHistory(histories: PairHistory[]): PairHistory | null {
  if (histories.some((h) => !h.from || !h.ratings.length)) return null;
  const from = histories.reduce((latest, h) => (h.from > latest ? h.from : latest), histories[0].from);
  const offsets = histories.map((h) => differenceInCalendarDays(parseISO(from), parseISO(h.from)) / 7);
  const length = Math.min(...histories.map((h, i) => h.ratings.length - offsets[i]));
  if (length < 2) return null;
  const ratings = Array.from({ length }, (_, week) => {
    let sum = 0;
    for (const [i, h] of histories.entries()) {
      const r = h.ratings[week + offsets[i]];
      if (r == null) return null;
      sum += r;
    }
    return sum;
  });
  return { from, ratings };
}

/**
 * The sides of a comparison across the men's and women's disciplines in a format: men at their
 * rating in the men's discipline, women at theirs in the women's moved onto the men's scale. Null
 * when a player has no rating there (or their gender is unknown).
 */
function onOneScale(players: Player[], format: Format, gap: GenderGap): { sides: Side[]; histories: PairHistory[] } | null {
  const fit = gap[format];
  const map = (w: number) => onMensScale(w, fit, gap.p0);
  const sides: Side[] = [];
  const histories: PairHistory[] = [];
  for (const player of players) {
    const g = playerGender(player);
    const pool = g === "M" ? MENS_POOLS[format] : g === "K" ? WOMENS_POOLS[format] : null;
    const entry = pool && player.pools[pool];
    if (!pool || !entry) return null;
    const woman = g === "K";
    const side: Side = { entry, pool, rating: woman ? map(entry.rating) : entry.rating };
    if (woman && (entry.rating < fit.range[0] || entry.rating > fit.range[1])) side.extrapolated = true;
    sides.push(side);
    histories.push(scaled(side, woman ? map : null));
  }
  return { sides, histories };
}

/** A man and a woman, just for fun: the woman's rating moved onto the men's scale */
export interface HeadToHeadCrossover {
  format: Format;
  label: string;
  a: Side;
  b: Side;
  /** A's chance of beating B now (in doubles, with equally rated partners) */
  chance: number;
  /** Their meetings in the men's discipline */
  record: Record3;
  history: [PairHistory | null, PairHistory | null];
}

/** A man against a woman in singles and in doubles, for the players' head to head */
async function crossovers(a: Player, b: Player, meetings: Match[]): Promise<HeadToHeadCrossover[]> {
  const gap = await getGenderGap();
  const genders = [playerGender(a), playerGender(b)];
  if (!gap || !genders[0] || !genders[1] || genders[0] === genders[1]) return [];
  const list: HeadToHeadCrossover[] = [];
  for (const format of ["singles", "doubles"] as Format[]) {
    const scale = onOneScale([a, b], format, gap);
    if (!scale) continue;
    const [sa, sb] = scale.sides;
    const history = scale.histories.map((h) => (h.ratings.length > 1 ? h : null)) as [PairHistory | null, PairHistory | null];
    list.push({
      format,
      label: format === "singles" ? "Singles" : "Doubles",
      a: sa,
      b: sb,
      chance: expectedScore(sa.rating, sb.rating),
      record: record(meetings.filter((m) => m.pool === MENS_POOLS[format])),
      history,
    });
  }
  return list;
}

export interface DoublesHeadToHeadPool {
  label: string;
  /** Pairs of different kinds, compared just for fun on the men's doubles scale */
  crossover: boolean;
  a: [Side, Side];
  b: [Side, Side];
  /** The pairs' ratings: the sum of the partners' */
  ratings: [number, number];
  /** Pair A's chance of beating pair B now */
  chance: number;
  record: Record3;
  margins: Margins;
  /** Each pair's rating at the end of each week both partners were rated */
  history: [PairHistory | null, PairHistory | null];
}

export interface DoublesHeadToHead {
  a: [Player, Player];
  b: [Player, Player];
  meetings: Match[];
  record: Record3;
  margins: Margins;
  /** Each pair's record as partners, all doubles disciplines */
  together: [Record3, Record3];
  /** Each pair's kind (men's, women's or mixed; null when a gender is unknown) */
  kinds: [PairKind | null, PairKind | null];
  /** The doubles disciplines both pairs play in, by their genders (whether or not all four are rated there) */
  disciplines: Pool[];
  pools: Partial<Record<Pool, DoublesHeadToHeadPool>>;
  /**
   * Just for fun, when the pairs don't play in the same discipline (a men's pair against a women's or
   * a mixed pair): everyone on the men's doubles scale, women's ratings moved onto it by the gender gap.
   */
  crossover: DoublesHeadToHeadPool | null;
}

/** The doubles discipline each kind of pair plays in */
export const KIND_POOLS: Record<PairKind, Pool> = { men: "mensDoubles", women: "womensDoubles", mixed: "mixedDoubles" };

const DOUBLES: Pool[] = ["mensDoubles", "womensDoubles", "mixedDoubles"];

/**
 * Two pairs head to head (A1 and A2 against B1 and B2), from A1's and B1's complete match logs. The
 * ratings are compared in the doubles disciplines both pairs play in by their genders: two men's
 * pairs in men's doubles, two mixed pairs in mixed doubles, and so on.
 */
export async function getDoublesHeadToHead(a1: number, a2: number, b1: number, b2: number): Promise<DoublesHeadToHead | null> {
  if (new Set([a1, a2, b1, b2]).size < 4) return null;
  const players = await Promise.all([a1, a2, b1, b2].map(getPlayer));
  if (players.some((p) => !p)) return null;
  const [pa1, pa2, pb1, pb2] = players as Player[];
  const [matchesA, matchesB] = await Promise.all([getPlayerMatches(pa1), getPlayerMatches(pb1)]);
  const meetings: Match[] = [];
  const togetherA: Match[] = [];
  const togetherB: Match[] = [];
  for (const pool of DOUBLES) {
    const p = pa1.pools[pool];
    for (const match of matchesA[pool] ?? []) {
      if (match.partner?.id !== a2) continue;
      togetherA.push(match);
      const opponents = match.opponents.map((o) => o.id);
      if (opponents.includes(b1) && opponents.includes(b2)) meetings.push({ ...match, pool, poolLabel: p!.label, ...points(match.score ?? "") });
    }
    for (const match of matchesB[pool] ?? []) if (match.partner?.id === b2) togetherB.push(match);
  }
  meetings.sort((x, y) => y.day.localeCompare(x.day));
  const genders = [pa1, pa2, pb1, pb2].map(playerGender);
  const [pairA, pairB] = [genders.slice(0, 2), genders.slice(2)];
  const disciplines = DOUBLES.filter((pool) => pairPlaysIn(pool, pairA) && pairPlaysIn(pool, pairB));
  // The pairs from their sides (four players: A1, A2, B1, B2) and weekly histories
  const compare = (label: string, sides: Side[], histories: PairHistory[], inPools: Match[], crossover: boolean): DoublesHeadToHeadPool => {
    const ratings: [number, number] = [sides[0].rating + sides[1].rating, sides[2].rating + sides[3].rating];
    return {
      label,
      crossover,
      a: [sides[0], sides[1]],
      b: [sides[2], sides[3]],
      ratings,
      chance: expectedScore(...ratings),
      record: record(inPools),
      margins: margins(inPools),
      history: [summedHistory(histories.slice(0, 2)), summedHistory(histories.slice(2))],
    };
  };
  const pools: Partial<Record<Pool, DoublesHeadToHeadPool>> = {};
  for (const pool of disciplines) {
    const entries = [pa1, pa2, pb1, pb2].map((player) => player.pools[pool]);
    if (entries.some((e) => !e)) continue;
    const sides = entries.map((entry) => ({ entry: entry!, pool, rating: entry!.rating }));
    pools[pool] = compare(POOLS[pool], sides, sides.map((side) => scaled(side, null)), meetings.filter((m) => m.pool === pool), false);
  }
  const kinds: [PairKind | null, PairKind | null] = [pairKind(pairA), pairKind(pairB)];
  let crossover: DoublesHeadToHeadPool | null = null;
  const gap = !disciplines.length && kinds[0] && kinds[1] ? await getGenderGap() : null;
  const scale = gap && onOneScale([pa1, pa2, pb1, pb2], "doubles", gap);
  if (scale) crossover = compare(`${capitalize(kinds[0]!)}'s pair against ${kinds[1]}${kinds[1] === "mixed" ? "" : "'s"} pair`, scale.sides, scale.histories, meetings, true);
  return { a: [pa1, pa2], b: [pb1, pb2], meetings, record: record(meetings), margins: margins(meetings), together: [record(togetherA), record(togetherB)], kinds, disciplines, pools, crossover };
}

const capitalize = (text: string) => text[0].toUpperCase() + text.slice(1);

// ---- Upsets ----

export const getUpsetsIndex = async () => load<{ generatedAt: string; years: string[]; latest: UpsetWeek | null }>("upsets/index.json");
export const getUpsetYear = async (year: string) => (await load<{ weeks: UpsetWeek[] }>(`upsets/${year}.json`))?.weeks ?? [];

// ---- Eliteserien ----

// The Eliteserien files are large and only read by their own pages, so they are typed loosely
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Loose = any;
export const getEliteserien = async () => load<Loose>("eliteserien.json");
export const getEliteserienReview = async (season: string) => (/^\d{4}-\d{2}$/.test(season) ? load<Loose>(`eliteserien-${season}.json`) : null);

// ---- Tournaments ----

export const getTournamentsIndex = async () => load<TournamentsIndex>("tournaments/index.json");

export async function getTournament(cup2000Id: number): Promise<Tournament | null> {
  const t = await load<Tournament>(`tournaments/${cup2000Id}.json`);
  if (!t) return null;
  return { ...t, events: t.events.map((e) => ({ ...e, poolLabel: POOLS[e.pool] ?? e.pool })) };
}
