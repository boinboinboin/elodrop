// A member's own numbers, for the account page's overview (components/account/Overview.tsx): the next tournament
// they're drawn in (with their group's opponents' form and their meetings before), their recent weeks, where they stand
// in each ranking (the players either side, their club, the next class), each season's record and tournaments, and the
// career's records, form, partners and where they're strongest
// (utils/dashboard.ts). GET /api/players/<id>/dashboard?lang=nb, asked for only by a member who has said this player is
// them; the language is the badges' (their titles from the Studio).
//
// Not prerendered (an address per player, asked for by one member), so it writes nothing to the ISR cache: the CDN
// keeps each answer for 6 hours (draws and results change once a night), so a member costs a few runs a day at most.
import { getPlayer, getPlayerMatches } from "@/data/players";
import { getRankings } from "@/data/rankings";
import { getBadges } from "@/data/sanity";
import { getTournament, getTournamentsIndex } from "@/data/tournaments";
import { createI18n, isLanguage } from "@/messages/i18n";
import type { Achievement, Player, Pool, RatingEntry, Tournament } from "@/types";
import { fillBadgeText, levelReached, levelView } from "@/utils/badges";
import { type BadgeView, dashboard, upcomingSummaries } from "@/utils/dashboard";
import { parseId } from "@/utils/parse";

export async function GET(request: Request, { params }: RouteContext<"/api/players/[id]/dashboard">) {
  const id = parseId((await params).id);
  const lang = new URL(request.url).searchParams.get("lang");
  if (!isLanguage(lang)) return Response.json({ error: "Give ?lang=nb or en" }, { status: 400 });
  if (id === null) return Response.json({ error: "Give a player id" }, { status: 400 });
  const player = await getPlayer(id);
  if (!player) return Response.json({ error: "No such player" }, { status: 404 });
  // Norwegian today (the draws' days are Norwegian)
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Oslo" });
  const [matches, index, badges] = await Promise.all([getPlayerMatches(player), getTournamentsIndex(), getBadges(lang)]);
  // As the player page shows them (components/players/Achievements.tsx): a milestone at the level it reached, none below
  const { num } = createI18n(lang);
  const byKey = new Map(badges.filter((b) => b.key).map((b) => [b.key, b]));
  const viewBadge = (award: Achievement): BadgeView | null => {
    const badge = byKey.get(award.badge);
    if (!badge) return null;
    const level = award.value !== undefined ? levelReached(badge, award.value) : undefined;
    if (award.value !== undefined && level === undefined) return null;
    const view = levelView(badge, level);
    return { title: fillBadgeText(view.title, [{ ...award, level }], num), art: view.art, ...(view.artInvert ? { artInvert: true as const } : {}), date: award.date };
  };
  const upcoming = (await Promise.all(upcomingSummaries(index?.tournaments ?? [], today).map((t) => getTournament(t.cup2000Id)))).filter((t): t is Tournament => !!t);

  // The rankings they're ranked in (mixed doubles: their gender's), for where they stand and their club's order
  const ranked = (Object.entries(player.pools) as [Pool, NonNullable<Player["pools"][Pool]>][]).filter(([, p]) => p.rank !== null);
  const rankings: Partial<Record<Pool, RatingEntry[]>> = Object.fromEntries(
    await Promise.all(ranked.map(async ([pool, p]) => [pool, await getRankings(pool, false, pool === "mixedDoubles" ? p.gender : null)] as const)),
  );
  // Their next groups' opponents (their form), at most 40 players
  const opponentIds = new Set<number>();
  for (const t of upcoming)
    for (const e of t.events) {
      const index = e.entries.findIndex((x) => x.players.some((p) => p.id === id));
      const group = index < 0 ? undefined : e.groups.find((g) => g.entries.includes(index));
      for (const i of group?.entries ?? []) for (const p of e.entries[i].players) if (p.id && p.id !== id) opponentIds.add(p.id);
    }
  const opponents = new Map(
    (await Promise.all([...opponentIds].slice(0, 40).map(getPlayer))).filter((p): p is Player => !!p).map((p) => [p.id, p]),
  );
  // This season's tournaments with a page (how far they got in each event), at most 30
  const seasonStart = `${+today.slice(5, 7) >= 7 ? today.slice(0, 4) : +today.slice(0, 4) - 1}-07-01`;
  const links = player.tournamentLinks ?? {};
  const played = new Set<number>();
  for (const list of Object.values(matches))
    for (const m of list ?? []) {
      if (m.day < seasonStart) continue;
      const cup2000Id = links[m.key?.match(/^T(\d+)/)?.[1] ?? ""];
      if (cup2000Id) played.add(cup2000Id);
    }
  const tournaments = new Map(
    (await Promise.all([...played].slice(0, 30).map(getTournament))).filter((t): t is Tournament => !!t).map((t) => [t.cup2000Id, t]),
  );

  return Response.json(dashboard(player, matches, upcoming, today, viewBadge, { rankings, opponents, tournaments }), { headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=3600" } });
}
