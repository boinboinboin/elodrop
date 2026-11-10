// A player's badges: the ones they earned from the results (pipeline/achievements.mjs) and the ones
// given by hand in the Studio, each with its title, description and art from Sanity
// (sanity/schemas/badge.ts). Shown as a row of small badges under the player's name; clicking one
// opens a box with them all in full (BadgeStrip). One card per badge: earned more than once, it
// says how many times and where (the newest few, the rest behind a disclosure), and {year} in its
// text is the player's years (a national championship's: "2015–2019, 2021"). A milestone (the
// player's number: matches played, the longest win streak) is shown at the highest of the badge's
// levels in the Studio it reaches ({level}; {value} is the number), with that level's own title,
// description and art (levelView); below the lowest level, or with no levels, not at all. A badge
// the Studio doesn't have isn't shown.
import Disclosure from "@/components/ui/Disclosure";
import Link from "@/components/ui/Link";
import { TEXT_LINK } from "@/components/ui/styles";
import { getI18n } from "@/messages/server";
import type { MessageKey } from "@/messages/i18n";
import type { Achievement, Badge, Player } from "@/types";
import { teamMatchHref, tournamentHref, upsetsHref } from "@/utils/hrefs";
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

/** {year} (the awards' years), {tournament} (the newest's), {level} and {value} (a milestone's, as `format` writes numbers) filled in; without awards, taken out */
export const fillBadgeText = (text: string, awards: Achievement[], format: (n: number) => string = String) =>
  text
    .replace(/\{year\}/g, yearRanges(awards.flatMap((a) => (a.year ? [a.year] : []))))
    .replace(/\{tournament\}/g, awards[0]?.tournament ?? "")
    .replace(/\{level\}/g, awards[0]?.level !== undefined ? format(awards[0].level) : "")
    .replace(/\{value\}/g, awards[0]?.value !== undefined ? format(awards[0].value) : "")
    .replace(/\s+([.,!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

/**
 * A badge as shown at a level: the title, description and art of its highest level at or below it
 * (from the Studio's levels), the badge's own where that level leaves them empty or has none
 */
export function levelView(badge: Badge, level: number | undefined) {
  const own = level === undefined ? undefined : badge.levels.filter((l) => l.level <= level).at(-1);
  return { title: own?.title ?? badge.title, description: own?.description ?? badge.description, art: own?.art ?? badge.art };
}

/** The level a milestone's number reaches: the highest of the badge's levels at or below it (undefined: below them all) */
export const levelReached = (badge: Badge, value: number) => badge.levels.filter((l) => l.level <= value).at(-1)?.level;

/** The player's badges: hand-given first, then by the newest award */
function badgeCards(player: Player, badges: Badge[]): BadgeCard[] {
  const cards: BadgeCard[] = badges.filter((b) => !b.key && b.players.includes(player.id)).map((badge) => ({ badge, awards: [] }));
  const byKey = new Map(badges.filter((b) => b.key).map((b) => [b.key, b]));
  const earned = new Map<string, BadgeCard>();
  for (const award of player.achievements ?? []) {
    const badge = byKey.get(award.badge);
    if (!badge) continue;
    // A milestone counts from the badge's lowest level
    const level = award.value !== undefined ? levelReached(badge, award.value) : undefined;
    if (award.value !== undefined && level === undefined) continue;
    if (!earned.has(badge.id)) earned.set(badge.id, { badge, awards: [] });
    earned.get(badge.id)!.awards.push(level !== undefined ? { ...award, level } : award);
  }
  return [...cards, ...[...earned.values()].sort((a, b) => b.awards[0].date.localeCompare(a.awards[0].date))];
}

/** The row of small badges and the box they open, or nothing for a player without badges */
export default async function Achievements({ player, badges, links }: { player: Player; badges: Badge[]; links: Record<string, number> }) {
  const { num } = await getI18n();
  const cards = badgeCards(player, badges);
  if (!cards.length) return null;
  return (
    <BadgeStrip
      items={cards.map(({ badge, awards }) => {
        const view = levelView(badge, awards[0]?.level);
        return {
          id: badge.id,
          // How rare it is (at the player's level, for a milestone), counted in the browser (BadgeStrip)
          rarityOf: badge.key ? { key: badge.key, level: awards[0]?.level } : { players: badge.players.length },
          title: fillBadgeText(view.title, awards, num),
          art: view.art,
          count: awards.length,
          details: <BadgeDetails description={view.description} awards={awards} links={links} />,
        };
      })}
    />
  );
}

async function BadgeDetails({ description, awards, links }: { description: string | null; awards: Achievement[]; links: Record<string, number> }) {
  const { t, num } = await getI18n();
  const rest = awards.slice(SHOWN);
  return (
    <>
      {description && <p className="text-sm text-gray-700 mt-1">{fillBadgeText(description, awards, num)}</p>}
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

/** A milestone's number, by its rule ("562 rated matches"); a win streak's has its own line */
const VALUE_TEXT: Record<string, MessageKey> = {
  ironPlayer: "players.achievements.values.ironPlayer",
  threeSetThriller: "players.achievements.values.threeSetThriller",
};

/** Where and when: the tournament (its page or event page when it has one) and the events won, the week's upsets, the team match, or a milestone's day and discipline */
export async function AwardLine({ award: a, links, as: Tag = "li" }: { award: Achievement; links: Record<string, number>; as?: "li" | "span" }) {
  const { t, date, dateRange, chance, pools, num } = await getI18n();
  if (a.value !== undefined && a.from) {
    return (
      <Tag>
        {a.pool && `${pools[a.pool]} · `}
        {dateRange(a.from, a.to ?? a.from)} · {t("players.achievements.streak", { count: num(a.value) })}
      </Tag>
    );
  }
  if (a.value !== undefined) {
    const text = VALUE_TEXT[a.badge];
    return <Tag>{text ? t(text, { count: num(a.value) }) : num(a.value)}</Tag>;
  }
  if (a.matchId) {
    return (
      <Tag>
        {date(a.date)} · <Link href={teamMatchHref(a.matchId)} className={TEXT_LINK}>{a.event}</Link>
        {a.pool && ` · ${pools[a.pool]}`}
        {a.winChance != null && ` · ${t("players.achievements.winChance", { chance: chance(a.winChance) })}`}
      </Tag>
    );
  }
  if (!a.week && !a.tournament) {
    return (
      <Tag>
        {date(a.date)}
        {a.pool && ` · ${pools[a.pool]}`}
      </Tag>
    );
  }
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
