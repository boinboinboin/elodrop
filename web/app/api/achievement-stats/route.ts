// How many players have each badge, for the rarity under the badges on the player pages
// (components/players/BadgeStrip.tsx), which load it in the browser: in the pages themselves it would tie every player
// page to achievements.json, which changes with every run, and every player page would be built again after each run.
// Built from cached data, so the response is prerendered and refreshed with achievements.json's tag (data/load.ts).
// → RarityStats (utils/achievements.ts)
import { getAchievementStats } from "@/data/achievements";
import type { RarityStats } from "@/utils/achievements";

export async function GET() {
  const stats = await getAchievementStats();
  const rarity: RarityStats = {
    players: stats?.players ?? 0,
    badges: Object.fromEntries(
      Object.entries(stats?.badges ?? {}).map(([key, b]) => [key, { players: b.players, ...(b.milestone ? { milestone: true, values: b.values ?? [] } : {}) }]),
    ),
  };
  return Response.json(rarity);
}
