// Players: one file each, their full match lists, and the search index
import type { Match, Player, Pool } from "@/types";
import { load } from "./load";

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

/** The search index (search-index.json): [id, name, club, ranked, matches] per player; app/api/search-index serves it to the browser */
export type SearchRow = [number, string, string | null, 0 | 1, number];
export const getSearchIndex = async () => (await load<{ players: SearchRow[] }>("search-index.json"))?.players ?? [];
