// How the ratings spread over the players, for the chart on /how-it-works (utils/distribution.ts):
// for everyone ever rated (the ranked and the inactive players, as the rankings list them) and for
// the ranked players alone. Worked out on the server from the ranking files, so the page only gets
// the counts.
import { type Distributions, describe } from "@/utils/distribution";
import { POOL_KEYS } from "@/utils/pools";
import { getRankings } from "./rankings";

export async function getDistributions(): Promise<Distributions> {
  const entries = await Promise.all(
    POOL_KEYS.map(async (pool) => {
      const players = await getRankings(pool, true);
      const minimum = pool === "men" || pool === "women" ? 400 : 550;
      const all = players.map((p) => p.rating);
      const ranked = players.filter((p) => p.rank !== null).map((p) => p.rating);
      return [pool, { all: describe(all, minimum), ranked: describe(ranked, minimum) }] as const;
    }),
  );
  return Object.fromEntries(entries) as Distributions;
}
