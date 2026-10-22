// One player's every match in a pool, newest first: GET /api/players/<id>/matches?pool=men. For the
// player page's "show all matches", which has only the newest few. Cached by the CDN for a day,
// like the pages (the data changes once a night).
import { getPlayer, getPlayerMatches } from "@/data/players";
import { parseId } from "@/utils/parse";
import { isPool } from "@/utils/pools";

export async function GET(request: Request, { params }: RouteContext<"/api/players/[id]/matches">) {
  const id = parseId((await params).id);
  const pool = new URL(request.url).searchParams.get("pool");
  if (id === null || !isPool(pool)) return Response.json({ error: "Give a player id and ?pool=" }, { status: 400 });
  const player = await getPlayer(id);
  if (!player?.pools[pool]) return Response.json({ error: "No such player or pool" }, { status: 404 });
  const matches = (await getPlayerMatches(player))[pool] ?? [];
  return Response.json(matches, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" } });
}
