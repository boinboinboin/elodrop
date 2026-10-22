// Players: one file each, their full match lists, and the search index
import type { Match, Player, Pool } from "@/types";
import { normalize, words as splitWords } from "@/utils/format";
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
