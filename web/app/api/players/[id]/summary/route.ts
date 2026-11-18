// One player's name, club and rating in each discipline: GET /api/players/<id>/summary. For the front page's
// "Following" card (components/account/FollowingCard.tsx), which a signed-in user's browser fills with the players
// they follow, so the front page stays the same for everyone.
//
// Not prerendered (an address per player, asked for only by followers), so it writes nothing to the ISR cache: the CDN
// keeps each answer for a day, like the matches' route, so a player followed by many costs about one run a day.
import { getPlayer } from "@/data/players";
import type { Pool } from "@/types";
import { parseId } from "@/utils/parse";

export interface PlayerSummary {
  id: number;
  name: string;
  club: string | null;
  /** In the player's page order (their own gender's disciplines first) */
  pools: { pool: Pool; rating: number; rank: number | null; change: number | null }[];
}

export async function GET(_request: Request, { params }: RouteContext<"/api/players/[id]/summary">) {
  const id = parseId((await params).id);
  if (id === null) return Response.json({ error: "Give a player id" }, { status: 400 });
  const player = await getPlayer(id);
  if (!player) return Response.json({ error: "No such player" }, { status: 404 });
  const body: PlayerSummary = {
    id: player.id,
    name: player.name,
    club: player.club,
    pools: (Object.entries(player.pools) as [Pool, NonNullable<(typeof player.pools)[Pool]>][]).map(([pool, p]) => ({
      pool,
      rating: Math.round(p.rating),
      rank: p.rank,
      change: p.ratingChange == null ? null : Math.round(p.ratingChange),
    })),
  };
  return Response.json(body, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" } });
}
