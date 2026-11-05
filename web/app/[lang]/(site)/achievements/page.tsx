// The badges players can earn (sanity/schemas/badge.ts): each with its art, how it's earned, how many
// players have it and what share of everyone with a rating that is, and the latest to earn it
// (achievements.json, pipeline/achievements.mjs), behind a disclosure; the rarest first. Linked from
// the menu and footer, and from the badges on player pages.
import type { Metadata } from "next";
import { fillBadgeText, AwardLine } from "@/components/players/Achievements";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import Disclosure from "@/components/ui/Disclosure";
import Link from "@/components/ui/Link";
import Section from "@/components/ui/Section";
import { getAchievementStats } from "@/data/achievements";
import { getMeta } from "@/data/meta";
import { getBadges } from "@/data/sanity";
import { getI18n } from "@/messages/server";
import type { AchievementStats, Badge } from "@/types";
import { playerHref } from "@/utils/hrefs";
import { pageMetadata } from "@/utils/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const i18n = await getI18n();
  const { t } = i18n;
  return pageMetadata(i18n, { title: t("achievements.metadata.title"), description: t("seo.descriptions.achievements"), path: "/achievements" });
}

/** A badge's holders: from the results for a rule's badge, the ids given in the Studio for a hand-given one */
const holders = (badge: Badge, stats: AchievementStats | null) => (badge.key ? (stats?.badges[badge.key]?.players ?? 0) : badge.players.length);

export default async function AchievementsPage() {
  const { t, lang } = await getI18n();
  const [badges, stats, meta] = await Promise.all([getBadges(lang), getAchievementStats(), getMeta()]);
  // The rarest first (fewest players), hand-given ones too
  const sorted = [...badges].sort((a, b) => holders(a, stats) - holders(b, stats) || a.title.localeCompare(b.title));

  return (
    <>
      <Section>
        <Breadcrumbs trail={[{ label: t("achievements.title") }]} />
        <h1 className="h1 mt-4">{t("achievements.title")}</h1>
        <p className="text-2xl max-w-3xl mt-2">{t("achievements.intro")}</p>
      </Section>
      <Section>
        {sorted.length ? (
          // Each card is two rows of the page's grid (subgrid): its body, as tall as the body beside it, and
          // its list of the latest, only as tall as its own, so opening one doesn't stretch its neighbour
          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
            {sorted.map((badge) => (
              <li key={badge.id} className="grid grid-rows-subgrid row-span-2">
                <BadgeCard badge={badge} stats={stats} links={meta?.tournamentLinks ?? {}} />
              </li>
            ))}
          </ul>
        ) : (
          <p>{t("achievements.none")}</p>
        )}
      </Section>
    </>
  );
}

async function BadgeCard({ badge, stats, links }: { badge: Badge; stats: AchievementStats | null; links: Record<string, number> }) {
  const { t, plural, num, pct } = await getI18n();
  const count = holders(badge, stats);
  const total = stats?.players ?? 0;
  const share = total ? count / total : 0;
  // Below 0.1%, "<0.1%" rather than 0.0%
  const shareText = share > 0 && share < 0.001 ? `<${pct(0.001, 1)}` : pct(share, 1);
  const own = badge.key ? stats?.badges[badge.key] : undefined;
  const about = badge.about ?? (badge.description ? fillBadgeText(badge.description, []) : null);
  // The latest to earn it, with when and where (none for a hand-given badge)
  const latest = own?.latest ?? [];
  return (
    <>
      <div className="flex gap-4 md:gap-6 bg-white px-4 md:px-6 pt-4 md:pt-6">
        {badge.art ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={badge.art} alt="" width={96} height={96} className="w-16 h-16 md:w-24 md:h-24 object-contain shrink-0" />
        ) : (
          <span aria-hidden="true" className="w-16 h-16 md:w-24 md:h-24 shrink-0 rounded-full bg-gray-200" />
        )}
        <div className="min-w-0">
          <h2 className="text-2xl">{fillBadgeText(badge.title, [])}</h2>
          {about && <p className="text-gray-700 mt-1">{about}</p>}
          <p className="mt-3">
            <span className="text-xl font-mono">{plural("achievements.players", count, { count: num(count) })}</span>
            {total > 0 && <span className="text-gray-600"> · {t("achievements.share", { share: shareText, total: num(total) })}</span>}
          </p>
          {own && <p className="text-sm text-gray-600">{plural("achievements.times", own.awards, { count: num(own.awards) })}</p>}
        </div>
      </div>
      {/* The second row: the latest (closed at first), or for a hand-given badge a line as tall as its summary */}
      <div className="self-start bg-white px-4 md:px-6 pt-5 pb-4 md:pb-6 mb-6">
        {latest.length > 0 ? (
          <Disclosure summary={t("achievements.latest")}>
            <ul className="space-y-1 mt-2">
              {latest.map((a) => (
                <li key={a.id}>
                  <Link href={playerHref(a.id)} className="hover:text-blue-600">{a.name}</Link>
                  {a.club && <span className="text-sm text-gray-600"> · {a.club}</span>}
                  <span className="block text-sm text-gray-600">
                    <AwardLine award={a} links={links} as="span" />
                  </span>
                </li>
              ))}
            </ul>
          </Disclosure>
        ) : (
          <p className="text-gray-600">{badge.key ? t("achievements.none") : t("achievements.handGiven")}</p>
        )}
      </div>
    </>
  );
}
