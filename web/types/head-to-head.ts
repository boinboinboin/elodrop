// Head to head: two players or two doubles pairs compared (data/head-to-head.ts), and how women's
// ratings compare with men's (the gender gap, pipeline/gender-gap.mjs)
import type { Match, Player, PlayerPool, Pool } from "./index";

export interface Record3 {
  matches: number;
  wins: number;
  draws: number;
  losses: number;
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

export type PairKind = "men" | "women" | "mixed";

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

/** How women's ratings compare with men's (pipeline/gender-gap.mjs) */
export interface GenderGapFit {
  /** The reference rating of b: the top level start rating (singles, or per doubles player) */
  p0: number;
  a: number;
  b: number;
  matches: number;
  /** The women's ratings the fit covers; beyond them it's extrapolated */
  range: [number, number];
}

export interface GenderGap {
  /** Data written before the per-format p0 (one p0 for both formats) */
  p0?: number;
  singles: GenderGapFit;
  doubles: GenderGapFit;
}

export type Format = "singles" | "doubles";

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

export interface DoublesHeadToHeadPool {
  label: string;
  /** Pairs of different kinds, compared just for fun on the men's doubles scale */
  crossover: boolean;
  a: [Side, Side];
  b: [Side, Side];
  /** The pairs' ratings: the average of the partners' */
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
