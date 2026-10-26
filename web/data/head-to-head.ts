// Head to head: two players, or two doubles pairs, compared from their match logs: their record and
// winning margins, each side's chance now, and (just for fun) men against women, with women's
// ratings moved onto the men's scale by the gender gap (pipeline/gender-gap.mjs).
import { differenceInCalendarDays, parseISO } from "date-fns";
import type {
  DoublesHeadToHead,
  DoublesHeadToHeadPool,
  Format,
  GenderGap,
  HeadToHead,
  HeadToHeadCrossover,
  HeadToHeadPool,
  Margins,
  MarginSide,
  Match,
  PairHistory,
  PairKind,
  Player,
  PlayerPool,
  Pool,
  Record3,
  Side,
} from "@/types";
import { comparableIn, pairKind, pairPlaysIn, playerGender } from "@/utils/gender";
import { t } from "@/messages/i18n";
import { capitalize } from "@/utils/format";
import { DOUBLES_POOLS, POOLS } from "@/utils/pools";
import { equalPartnersChance, expectedScore, onMensScale, pairRating } from "@/utils/rating";
import { load } from "./load";
import { getPlayer, getPlayerMatches } from "./players";

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
    const chance = DOUBLES_POOLS.includes(pool) ? equalPartnersChance(p.rating, q.rating) : expectedScore(p.rating, q.rating);
    pools[pool] = { label: p.label, a: p, b: q, chance, record: record(inPool), margins: margins(inPool) };
  }
  return { a: playerA, b: playerB, meetings, together, record: record(meetings), margins: margins(meetings), togetherRecord: record(together), pools, crossovers: await crossovers(playerA, playerB, meetings) };
}

export const getGenderGap = async () => load<GenderGap>("gender-gap.json");

const MENS_POOLS: Record<Format, Pool> = { singles: "men", doubles: "mensDoubles" };
const WOMENS_POOLS: Record<Format, Pool> = { singles: "women", doubles: "womensDoubles" };

/** A side's weekly ratings on the compared scale (a woman's moved onto the men's) */
const scaled = (side: Side, map: ((w: number) => number) | null) => ({
  from: side.entry.history?.from ?? "",
  ratings: (side.entry.history?.ratings ?? []).map((r) => (r == null ? null : map ? map(r) : r)),
});

/** A pair's weekly ratings (the average of its players'), over the weeks both have a rating */
function pairHistory(histories: PairHistory[]): PairHistory | null {
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
    return sum / histories.length;
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
  const map = (w: number) => onMensScale(w, fit, fit.p0 ?? gap.p0);
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
      label: t(`headToHead.fun.formats.${format}`),
      a: sa,
      b: sb,
      chance: format === "doubles" ? equalPartnersChance(sa.rating, sb.rating) : expectedScore(sa.rating, sb.rating),
      record: record(meetings.filter((m) => m.pool === MENS_POOLS[format])),
      history,
    });
  }
  return list;
}

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
  for (const pool of DOUBLES_POOLS) {
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
  const disciplines = DOUBLES_POOLS.filter((pool) => pairPlaysIn(pool, pairA) && pairPlaysIn(pool, pairB));
  // The pairs from their sides (four players: A1, A2, B1, B2) and weekly histories
  const compare = (label: string, sides: Side[], histories: PairHistory[], inPools: Match[], crossover: boolean): DoublesHeadToHeadPool => {
    const ratings: [number, number] = [pairRating(sides[0].rating, sides[1].rating), pairRating(sides[2].rating, sides[3].rating)];
    return {
      label,
      crossover,
      a: [sides[0], sides[1]],
      b: [sides[2], sides[3]],
      ratings,
      chance: expectedScore(...ratings),
      record: record(inPools),
      margins: margins(inPools),
      history: [pairHistory(histories.slice(0, 2)), pairHistory(histories.slice(2))],
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
  const kind = (k: PairKind) => t(`headToHead.pairs.kinds.${k}`);
  if (scale) crossover = compare(t("headToHead.pairs.against", { a: capitalize(kind(kinds[0]!)), b: kind(kinds[1]!) }), scale.sides, scale.histories, meetings, true);
  return { a: [pa1, pa2], b: [pb1, pb2], meetings, record: record(meetings), margins: margins(meetings), together: [record(togetherA), record(togetherB)], kinds, disciplines, pools, crossover };
}
