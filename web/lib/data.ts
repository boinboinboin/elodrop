// The rating data (pipeline/export.mjs): read from the data bucket (DATA_URL) or, locally, from a
// folder (DATA_DIR, e.g. ../pipeline/export). Every read is cached under the "elo-data" tag, which
// the pipeline revalidates after each run (app/api/revalidate).
import { readFile } from "node:fs/promises";
import { join } from "node:path";
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
}

/** Two players head to head, from A's complete match logs */
export async function getHeadToHead(a: number, b: number): Promise<HeadToHead | null> {
  const [playerA, playerB] = await Promise.all([getPlayer(a), getPlayer(b)]);
  if (!playerA || !playerB || a === b) return null;
  const meetings: Match[] = [];
  const together: Match[] = [];
  for (const [pool, p] of Object.entries(playerA.pools) as [Pool, PlayerPool][]) {
    for (const match of p.matchLog?.all ?? []) {
      const m = { ...match, pool, poolLabel: p.label, ...points(match.score ?? "") };
      if (m.opponents.some((o) => o.id === b)) meetings.push(m);
      else if (m.partner?.id === b) together.push(m);
    }
  }
  const newestFirst = (x: Match, y: Match) => y.day.localeCompare(x.day);
  meetings.sort(newestFirst);
  together.sort(newestFirst);
  const pools: Partial<Record<Pool, HeadToHeadPool>> = {};
  for (const [pool, p] of Object.entries(playerA.pools) as [Pool, PlayerPool][]) {
    const q = playerB.pools[pool];
    if (!q) continue;
    const inPool = meetings.filter((m) => m.pool === pool);
    pools[pool] = { label: p.label, a: p, b: q, chance: expectedScore(p.rating, q.rating), record: record(inPool), margins: margins(inPool) };
  }
  return { a: playerA, b: playerB, meetings, together, record: record(meetings), margins: margins(meetings), togetherRecord: record(together), pools };
}

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
