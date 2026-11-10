// A club's inactive players in a discipline (no matches in the last 12 months), for the club page's "show inactive
// players": GET /api/clubs/<slug>/inactive?pool=men&v=<version>. Loaded in the browser when it's switched on
// (components/clubs/ClubPlayers.tsx), so the page carries only its ranked players, and no second page per club is
// built and stored (as the rankings' /inactive pages are).
// → ClubPlayerRow[] (rank and change null), best first.
//
// Not prerendered (it reads the query), so it writes nothing to the ISR cache: the CDN keeps each answer instead. `v`
// is set by the page from its ranked players, so the address changes when a player goes inactive or comes back, and
// the CDN can keep each for long; the answer is the same whatever `v` says.
import type { ClubPlayerRow } from "@/components/clubs/ClubPlayers";
import { getClubInactivePlayers } from "@/data/clubs";
import { getClubBySlug } from "@/data/sanity";
import { isPool } from "@/utils/pools";

export async function GET(request: Request, { params }: RouteContext<"/api/clubs/[slug]/inactive">) {
  const slug = decodeURIComponent((await params).slug);
  const pool = new URL(request.url).searchParams.get("pool");
  if (!isPool(pool)) return Response.json({ error: "Give ?pool=" }, { status: 400 });
  const club = await getClubBySlug(slug);
  if (!club) return Response.json({ error: "No such club" }, { status: 404 });
  const rows = (await getClubInactivePlayers(club.title, pool)).map((p): ClubPlayerRow => [p.id, p.name, null, p.rating, null, p.matches, p.gender, p.lastPlayed]);
  return Response.json(rows, { headers: { "Cache-Control": "public, s-maxage=2592000, stale-while-revalidate=86400" } });
}
