// A member's own numbers, for the account page's overview (components/account/Overview.tsx): the next tournament
// they're drawn in, their recent weeks, each season's record, and the career's records and form
// (utils/dashboard.ts). GET /api/players/<id>/dashboard?lang=nb, asked for only by a member who has said this player is
// them; the language is the badges' (their titles from the Studio).
//
// Not prerendered (an address per player, asked for by one member), so it writes nothing to the ISR cache: the CDN
// keeps each answer for 6 hours (draws and results change once a night), so a member costs a few runs a day at most.
import { getPlayer, getPlayerMatches } from "@/data/players";
import { getBadges } from "@/data/sanity";
import { getTournament, getTournamentsIndex } from "@/data/tournaments";
import { createI18n, isLanguage } from "@/messages/i18n";
import type { Achievement, Tournament } from "@/types";
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
  return Response.json(dashboard(player, matches, upcoming, today, viewBadge), { headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=3600" } });
}
