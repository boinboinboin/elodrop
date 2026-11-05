// A player's badges: the ones they earned from the results (pipeline/achievements.mjs) and the ones
// given by hand in the Studio, each with its title, description and art from Sanity
// (sanity/schemas/badge.ts). Shown as a row of small badges under the player's name; clicking one
// opens a box with them all in full (BadgeStrip). One card per badge: earned more than once, it
// says how many times and where (the newest few, the rest behind a disclosure), and {year} in its
// text is the player's years (a national championship's: "2015–2019, 2021"). A badge the Studio
// doesn't have isn't shown.
import Disclosure from "@/components/ui/Disclosure";
import Link from "@/components/ui/Link";
import { TEXT_LINK } from "@/components/ui/styles";
import { getI18n } from "@/messages/server";
import type { Achievement, Badge, Player } from "@/types";
import { tournamentHref, upsetsHref } from "@/utils/hrefs";
import { eventHref } from "@/utils/tournament";
import BadgeStrip from "./BadgeStrip";

/** The awards listed on a card before the rest go behind "show all" */
const SHOWN = 3;

interface BadgeCard {
  badge: Badge;
  /** Newest first; none for a badge given by hand */
  awards: Achievement[];
}

/** Years as ranges, oldest first: [2015, 2016, 2017, 2019] → "2015–2017, 2019" */
export function yearRanges(years: number[]): string {
  const sorted = [...new Set(years)].sort((a, b) => a - b);
  const ranges: [number, number][] = [];
  for (const y of sorted) {
    const last = ranges.at(-1);
    if (last && y === last[1] + 1) last[1] = y;
    else ranges.push([y, y]);
  }
  return ranges.map(([a, b]) => (a === b ? String(a) : `${a}–${b}`)).join(", ");
}

/** {year} (the awards' years) and {tournament} (the newest's) filled in; without awards, taken out */
export const fillBadgeText = (text: string, awards: Achievement[]) =>
  text
    .replace(/\{year\}/g, yearRanges(awards.flatMap((a) => (a.year ? [a.year] : []))))
    .replace(/\{tournament\}/g, awards[0]?.tournament ?? "")
    .replace(/\s+([.,!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

/** The player's badges: hand-given first, then by the newest award */
function badgeCards(player: Player, badges: Badge[]): BadgeCard[] {
  const cards: BadgeCard[] = badges.filter((b) => !b.key && b.players.includes(player.id)).map((badge) => ({ badge, awards: [] }));
  const byKey = new Map(badges.filter((b) => b.key).map((b) => [b.key, b]));
  const earned = new Map<string, BadgeCard>();
  for (const award of player.achievements ?? []) {
    const badge = byKey.get(award.badge);
    if (!badge) continue;
    if (!earned.has(badge.id)) earned.set(badge.id, { badge, awards: [] });
    earned.get(badge.id)!.awards.push(award);
  }
  return [...cards, ...[...earned.values()].sort((a, b) => b.awards[0].date.localeCompare(a.awards[0].date))];
}

/** The row of small badges and the box they open, or nothing for a player without badges */
export default async function Achievements({ player, badges, links }: { player: Player; badges: Badge[]; links: Record<string, number> }) {
  const cards = badgeCards(player, badges);
  if (!cards.length) return null;
  return (
    <BadgeStrip
      items={cards.map(({ badge, awards }) => ({
        id: badge.id,
        title: fillBadgeText(badge.title, awards),
        art: badge.art,
        count: awards.length,
        details: <BadgeDetails badge={badge} awards={awards} links={links} />,
      }))}
    />
  );
}

async function BadgeDetails({ badge, awards, links }: { badge: Badge; awards: Achievement[]; links: Record<string, number> }) {
  const { t } = await getI18n();
  const rest = awards.slice(SHOWN);
  return (
    <>
      {badge.description && <p className="text-sm text-gray-700 mt-1">{fillBadgeText(badge.description, awards)}</p>}
      {awards.length > 0 && (
        <ul className="text-sm text-gray-600 mt-2 space-y-1">
          {awards.slice(0, SHOWN).map((a, i) => (
            <AwardLine key={i} award={a} links={links} />
          ))}
        </ul>
      )}
      {rest.length > 0 && (
        <Disclosure summary={<span className="text-sm">{t("players.achievements.more", { count: rest.length })}</span>} className="mt-1">
          <ul className="text-sm text-gray-600 mt-1 space-y-1">
            {rest.map((a, i) => (
              <AwardLine key={i} award={a} links={links} />
            ))}
          </ul>
        </Disclosure>
      )}
    </>
  );
}

/** Where and when: the tournament (its page or event page when it has one) and the events won, or the week's upsets */
export async function AwardLine({ award: a, links, as: Tag = "li" }: { award: Achievement; links: Record<string, number>; as?: "li" | "span" }) {
  const { t, date, chance, pools } = await getI18n();
  if (a.week) {
    return (
      <Tag>
        {date(a.date)} · <Link href={upsetsHref(a.week)} className={TEXT_LINK}>{a.event}</Link>
        {a.winChance != null && ` · ${t("players.achievements.winChance", { chance: chance(a.winChance) })}`}
      </Tag>
    );
  }
  const cupId = a.tournamentId ? links[a.tournamentId] : undefined;
  const events = a.events ?? [];
  const href = cupId ? (events.length === 1 ? eventHref(cupId, events[0]) : tournamentHref(cupId)) : null;
  const name = a.tournament ?? "";
  return (
    <Tag>
      {date(a.date)} · {href ? <Link href={href} className={TEXT_LINK}>{name}</Link> : name}
      {events.length > 0 && ` · ${events.map((e) => `${pools[e.pool]} (${e.className})`).join(", ")}`}
    </Tag>
  );
}
