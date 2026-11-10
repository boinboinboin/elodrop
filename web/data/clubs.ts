// The clubs' ratings: the strongest clubs, each club's players and its history (the clubs' own
// content, names and logos, is in Sanity: data/sanity.ts)
import type { ClubHistory, ClubsFile, Pool, RatingEntry } from "@/types";
import { load } from "./load";
import { getRankings } from "./rankings";

export const getClubsFile = async () => load<ClubsFile>("clubs.json");

/** A club's ranked players in a pool (by the club shown for each player), best first */
export async function getClubPlayers(club: string, pool: Pool): Promise<RatingEntry[]> {
  return (await getRankings(pool)).filter((p) => p.club === club);
}

/**
 * A club's inactive players in a pool (no matches in the last 12 months; by the club shown for each player), best
 * first. For the club page's "show inactive players", loaded when asked for (app/api/clubs/[slug]/inactive)
 */
export async function getClubInactivePlayers(club: string, pool: Pool): Promise<RatingEntry[]> {
  return ((await load<{ players: RatingEntry[] }>(`rankings/${pool}-inactive.json`))?.players ?? []).filter((p) => p.club === club);
}

export async function getClubHistory(nbfClubId: number): Promise<ClubHistory> {
  const history = await load<ClubHistory>(`club-history/${nbfClubId}.json`);
  return { players: history?.players ?? {}, pools: history?.pools ?? {} };
}
