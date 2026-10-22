// The clubs' ratings: the strongest clubs, each club's players and its history (the clubs' own
// content, names and logos, is in Sanity: data/sanity.ts)
import type { ClubHistoryPool, ClubsFile, Pool, RatingEntry } from "@/types";
import { load } from "./load";
import { getRankings } from "./rankings";

export const getClubsFile = async () => load<ClubsFile>("clubs.json");

/** A club's ranked players in a pool (by the club shown for each player), best first */
export async function getClubPlayers(club: string, pool: Pool): Promise<RatingEntry[]> {
  return (await getRankings(pool)).filter((p) => p.club === club);
}

export async function getClubHistory(nbfClubId: number): Promise<Partial<Record<Pool | "combined", ClubHistoryPool>>> {
  return (await load<{ pools: Partial<Record<Pool | "combined", ClubHistoryPool>> }>(`club-history/${nbfClubId}.json`))?.pools ?? {};
}
