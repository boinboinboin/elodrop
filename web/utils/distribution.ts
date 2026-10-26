// How the ratings spread over the players (the chart on /how-it-works): each pool's ratings in
// 50-point bins, with the numbers that describe them. Shared by the server (data/distribution.ts),
// which works them out, and the chart, which draws them.
import type { Pool } from "@/types";

export const BIN = 50;
/** The bins' range, the same in every pool so they can be compared: the singles minimum to above the best */
export const RANGE = { from: 400, to: 2750 };

export interface Distribution {
  /** Players per bin, from RANGE.from, BIN points each */
  bins: number[];
  players: number;
  mean: number;
  sd: number;
  /** Skewness: 0 for a normal distribution, above 0 with a longer tail towards high ratings */
  skew: number;
  median: number;
  /** Ratings the top 10% and the top 1% are at or above */
  top10: number;
  top1: number;
  /** Players on the pool's minimum rating */
  onMinimum: number;
}

export type Distributions = Record<Pool, { all: Distribution; ranked: Distribution }>;

export function describe(ratings: number[], minimum: number): Distribution {
  const n = ratings.length;
  const sorted = [...ratings].sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(n - 1, Math.floor(q * n))] ?? 0;
  const mean = ratings.reduce((s, r) => s + r, 0) / (n || 1);
  const sd = Math.sqrt(ratings.reduce((s, r) => s + (r - mean) ** 2, 0) / (n || 1));
  const bins = Array<number>(Math.ceil((RANGE.to - RANGE.from) / BIN)).fill(0);
  for (const r of ratings) bins[Math.min(bins.length - 1, Math.max(0, Math.floor((r - RANGE.from) / BIN)))]++;
  return {
    bins,
    players: n,
    mean,
    sd,
    skew: sd ? ratings.reduce((s, r) => s + ((r - mean) / sd) ** 3, 0) / n : 0,
    median: at(0.5),
    top10: at(0.9),
    top1: at(0.99),
    onMinimum: ratings.filter((r) => r < minimum + 1).length,
  };
}
