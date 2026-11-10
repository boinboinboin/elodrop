// One player's match lists in a discipline, for the player page's tabs that aren't shown when it opens (the other
// disciplines, and the highlights after the first): GET /api/players/<id>/log?pool=men&v=<version>. Loaded in the
// browser when such a tab is opened (components/players/LazyMatchTable.tsx), so the page itself carries only what
// shows first: a player page is stored again whenever their data changes, and a smaller one costs fewer writes.
// → { recent: the newest 20, biggestWins, biggestLosses, biggestGains, biggestDrops }.
//
// Not prerendered (it reads the query), so it writes nothing to the ISR cache: the CDN keeps each answer instead.
// `v` is the lists' version (logVersion), set by the page, so new data has a new address and the CDN can keep each
// for long; the answer is the same whatever `v` says.
import { getPlayer } from "@/data/players";
import { parseId } from "@/utils/parse";
import { RECENT_MATCHES, type PlayerLog } from "@/utils/playerLog";
import { isPool } from "@/utils/pools";

export async function GET(request: Request, { params }: RouteContext<"/api/players/[id]/log">) {
  const id = parseId((await params).id);
  const pool = new URL(request.url).searchParams.get("pool");
  if (id === null || !isPool(pool)) return Response.json({ error: "Give a player id and ?pool=" }, { status: 400 });
  const log = (await getPlayer(id))?.pools[pool]?.matchLog;
  if (!log) return Response.json({ error: "No such player or pool" }, { status: 404 });
  const body: PlayerLog = {
    recent: log.all.slice(0, RECENT_MATCHES),
    biggestWins: log.biggestWins,
    biggestLosses: log.biggestLosses,
    biggestGains: log.biggestGains,
    biggestDrops: log.biggestDrops,
  };
  return Response.json(body, { headers: { "Cache-Control": "public, s-maxage=2592000, stale-while-revalidate=86400" } });
}
