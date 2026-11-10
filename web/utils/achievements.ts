// How rare a badge is, shared by the player pages' badges (components/players/BadgeStrip.tsx, in the browser) and the
// stats route (app/api/achievement-stats)
import type { AchievementStats } from "@/types";

/** What a badge's rarity is counted from: a hand-given badge's players (known with the page), or its rule's key and, for a milestone, the level */
export type RarityOf = { players: number } | { key: string; level?: number };

/** The per-badge numbers the browser needs (achievements.json without the newest awards) */
export type RarityStats = Pick<AchievementStats, "players"> & { badges: Record<string, { players: number; milestone?: boolean; values?: [number, number][] }> };

/**
 * How many players have a badge: a hand-given one's players, a milestone's at `level` or higher (by their numbers),
 * else everyone with the award (achievements.json). Null without the numbers
 */
export function badgeHolders(of: RarityOf, stats: RarityStats | null): number | null {
  if ("players" in of) return of.players;
  const own = stats?.badges[of.key];
  if (!own) return null;
  if (!own.milestone) return own.players;
  return of.level === undefined ? null : (own.values ?? []).filter(([value]) => value >= of.level!).reduce((n, [, players]) => n + players, 0);
}
