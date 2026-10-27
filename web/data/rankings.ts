// The rankings per pool
import type { Gender, JuniorEntry, Pool, RatingEntry } from "@/types";
import { load } from "./load";

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

/**
 * The junior ranking (U19) of a pool, best first: rated from junior matches only, everyone born in
 * `bornFrom` or later who has played a junior match in the last 12 months. With a gender, only
 * players of that gender (mixed doubles).
 */
export async function getJuniorRankings(pool: Pool, gender: Gender | null = null): Promise<{ players: JuniorEntry[]; bornFrom: number | null }> {
  const data = await load<{ players: JuniorEntry[]; bornFrom: number }>(`junior/${pool}.json`);
  const players = data?.players ?? [];
  return { players: gender ? players.filter((p) => p.gender === gender) : players, bornFrom: data?.bornFrom ?? null };
}
