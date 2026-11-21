// One player's name, club and rating in each discipline: GET /api/players/<id>/summary. For the front page's
// "Following" card (components/account/FollowingCard.tsx), which a signed-in user's browser fills with the players
// they follow, so the front page stays the same for everyone.
//
// Not prerendered (an address per player, asked for only by followers), so it writes nothing to the ISR cache: the CDN
// keeps each answer for a day, like the matches' route, so a player followed by many costs about one run a day.
//
// `recent`: their newest matches of the last RECENT_DAYS days, at most RECENT, over every discipline (the latest results
// on the card and the account page), from the newest matches in the player's file (no other file read).
import { getPlayer } from "@/data/players";
import type { Pool } from "@/types";
import { parseId } from "@/utils/parse";
import { osloToday } from "@/utils/rounds";
import { matchEventHref, UPSET_CHANCE } from "@/utils/tournament";

const RECENT = 3;
const RECENT_DAYS = 14;

/** One of a player's latest matches */
export interface RecentMatch {
  day: string;
  pool: Pool;
  event: string;
  /** Its team match's or tournament event's page, or null */
  href: string | null;
  opponents: { id: number | null; name: string }[];
  partner: { id: number | null; name: string } | null;
  /** 1 won, 0 lost, 0.5 drawn */
  result: number;
  score: string;
  /** The rating gained or lost */
  change: number;
  /** Won with less than a 30% chance */
  upset: boolean;
}

export interface PlayerSummary {
  id: number;
  name: string;
  club: string | null;
  /** In the player's page order (their own gender's disciplines first) */
  pools: { pool: Pool; rating: number; rank: number | null; change: number | null }[];
  /** Their newest matches of the last two weeks, newest first (missing from answers cached before it was added) */
  recent?: RecentMatch[];
}

const DAY_MS = 86_400_000;

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
    recent: (() => {
      const since = new Date(Date.parse(`${osloToday()}T00:00:00Z`) - RECENT_DAYS * DAY_MS).toISOString().slice(0, 10);
      return (Object.entries(player.pools) as [Pool, NonNullable<(typeof player.pools)[Pool]>][])
        .flatMap(([pool, p]) => (p.matchLog?.all ?? []).filter((m) => m.day >= since).map((m) => ({ m, pool })))
        .sort((a, b) => b.m.day.localeCompare(a.m.day))
        .slice(0, RECENT)
        .map(({ m, pool }) => ({
          day: m.day,
          pool,
          event: m.event,
          href: matchEventHref(m, player.tournamentLinks, pool),
          opponents: m.opponents.map(({ id, name }) => ({ id, name })),
          partner: m.partner ? { id: m.partner.id, name: m.partner.name } : null,
          result: m.result,
          score: m.score,
          change: Math.round(m.change),
          upset: m.result === 1 && m.winChance < UPSET_CHANCE,
        }));
    })(),
  };
  return Response.json(body, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" } });
}
