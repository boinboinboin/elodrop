// Tournament draws, draw luck and how the predictions turned out
import type { Tournament, TournamentsIndex } from "@/types";
import { POOLS } from "@/utils/pools";
import { load } from "./load";

export const getTournamentsIndex = async () => load<TournamentsIndex>("tournaments/index.json");

export async function getTournament(cup2000Id: number): Promise<Tournament | null> {
  const t = await load<Tournament>(`tournaments/${cup2000Id}.json`);
  if (!t) return null;
  return { ...t, events: t.events.map((e) => ({ ...e, poolLabel: POOLS[e.pool] ?? e.pool })) };
}
