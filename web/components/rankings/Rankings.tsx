// A ranking list: the section's heading, all players or juniors (U19), the discipline tabs, the "show inactive players"
// switch, in mixed doubles men or women, and the table. Each list is its own static page (utils/rankings.ts). With inactive
// players, only the best INACTIVE_SHOWN of them are listed (the full lists run to over 10,000 players), with a
// link to the page with all of them. The junior rankings (JuniorRankings) have ranked players only.
import Link from "next/link";
import { notFound } from "next/navigation";
import PoolName from "@/components/format/PoolName";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import RankingTable, { type RankingRow } from "@/components/rankings/RankingTable";
import { ArrowRight, Check } from "@/components/SVG";
import LinkTabs from "@/components/ui/LinkTabs";
import Section from "@/components/ui/Section";
import { TEXT_LINK } from "@/components/ui/styles";
import { getJuniorRankings, getRankings } from "@/data/rankings";
import { getClubMap } from "@/data/sanity";
import { t } from "@/messages/i18n";
import type { Gender } from "@/types";
import { num } from "@/utils/format";
import { POOL_KEYS } from "@/utils/pools";
import { juniorRankingHref, RANKING_LISTS, type RankingList, rankingHref } from "@/utils/rankings";

const GENDERS: Gender[] = ["M", "K"];
const INACTIVE_SHOWN = 500;

export default async function Rankings({ list, showInactive, allInactive = false }: { list: RankingList; showInactive: boolean; allInactive?: boolean }) {
  const { pool, gender } = list;
  const [everyone, clubs] = await Promise.all([getRankings(pool, showInactive, gender), getClubMap()]);
  // In rating order: every ranked player, and the best inactive ones unless all are asked for
  const inactive = everyone.filter((p) => p.rank === null).length;
  let shownInactive = 0;
  const players = allInactive ? everyone : everyone.filter((p) => p.rank !== null || shownInactive++ < INACTIVE_SHOWN);
  const hiddenInactive = inactive - Math.min(inactive, allInactive ? inactive : INACTIVE_SHOWN);

  return (
    <Section>
      <Breadcrumbs trail={[{ label: t("rankings.heading") }]} />
      <h1 className="h1 mt-4">{t("rankings.heading")}</h1>
      <p className="text-2xl max-w-3xl mt-2 mb-8">{t("rankings.intro")}</p>
      <AgeTabs list={list} junior={false} />
      <div className="flex flex-wrap items-end justify-between gap-6 mb-6">
        <LinkTabs label={t("rankings.disciplines")} current={pool} tabs={POOL_KEYS.map((key) => ({ key, href: rankingHref(key, null, showInactive), label: <PoolName pool={key} /> }))} />
        <Link
          href={rankingHref(pool, gender, !showInactive)}
          className="flex items-center gap-2 select-none"
          role="checkbox"
          aria-checked={showInactive}
        >
          <span className={`w-4 h-4 border border-black inline-flex items-center justify-center ${showInactive ? "bg-black text-white" : "bg-white"}`} aria-hidden="true">
            {showInactive && <Check className="text-[0.75rem]" />}
          </span>
          {t("rankings.showInactive")}
        </Link>
      </div>

      {gender && <GenderTabs current={gender} href={(code) => rankingHref(pool, code, showInactive)} />}

      {players.length === 0 ? (
        <p>{t("rankings.noRatings")}</p>
      ) : (
        <RankingTable
          rows={players.map((p): RankingRow => [p.id, p.name, p.club, p.rank, Math.round(p.rating), p.matches, p.lastPlayed, p.previousRank, p.ratingChange])}
          clubs={Object.fromEntries([...new Set(players.map((p) => p.club).filter((c): c is string => !!c && !!clubs[c]))].map((c) => [c, [clubs[c].slug, clubs[c].logo]]))}
          summary={
            !showInactive
              ? t("rankings.summary.ranked", { count: num(players.length) })
              : hiddenInactive
                ? t("rankings.summary.someInactive", { count: num(players.length), shown: num(INACTIVE_SHOWN), inactive: num(inactive) })
                : t("rankings.summary.allInactive", { count: num(players.length) })
          }
        />
      )}
      {hiddenInactive > 0 && (
        <p className="mt-4">
          <Link href={`${rankingHref(pool, gender, true)}/all`} prefetch={false} className={TEXT_LINK}>
            {t("rankings.showAll", { count: num(everyone.length) })} <ArrowRight />
          </Link>{" "}
          <span className="text-gray-600">{t("rankings.longPage")}</span>
        </p>
      )}
    </Section>
  );
}

/** A junior ranking (U19): from junior matches only, ranked players only (no inactive switch) */
export async function JuniorRankings({ list }: { list: RankingList }) {
  const { pool, gender } = list;
  const [{ players, bornFrom }, clubs] = await Promise.all([getJuniorRankings(pool, gender), getClubMap()]);

  return (
    <Section>
      <Breadcrumbs trail={[{ label: t("rankings.heading"), href: rankingHref(pool, gender) }, { label: t("rankings.junior.crumb") }]} />
      <h1 className="h1 mt-4">{t("rankings.junior.heading")}</h1>
      <p className="text-2xl max-w-3xl mt-2 mb-8">{t("rankings.junior.intro")}</p>
      <AgeTabs list={list} junior />
      <div className="mb-6">
        <LinkTabs label={t("rankings.disciplines")} current={pool} tabs={POOL_KEYS.map((key) => ({ key, href: juniorRankingHref(key), label: <PoolName pool={key} /> }))} />
      </div>

      {gender && <GenderTabs current={gender} href={(code) => juniorRankingHref(pool, code)} />}

      {players.length === 0 ? (
        <p>{t("rankings.noRatings")}</p>
      ) : (
        <RankingTable
          rows={players.map((p): RankingRow => [p.id, p.name, p.club, p.rank, Math.round(p.rating), p.matches, p.lastPlayed, p.previousRank, p.ratingChange])}
          clubs={Object.fromEntries([...new Set(players.map((p) => p.club).filter((c): c is string => !!c && !!clubs[c]))].map((c) => [c, [clubs[c].slug, clubs[c].logo]]))}
          summary={t("rankings.junior.summary", { count: num(players.length), year: bornFrom ?? "" })}
        />
      )}
    </Section>
  );
}

/** All players or juniors (U19), in the same discipline */
function AgeTabs({ list, junior }: { list: RankingList; junior: boolean }) {
  return (
    <LinkTabs
      label={t("rankings.junior.ages")}
      current={junior ? "junior" : "all"}
      size="sm"
      className="flex flex-wrap gap-2 mb-6"
      tabs={[
        { key: "all", href: rankingHref(list.pool, list.gender), label: t("rankings.junior.allAges") },
        { key: "junior", href: juniorRankingHref(list.pool, list.gender), label: t("rankings.junior.tab") },
      ]}
    />
  );
}

/** Mixed doubles: men or women, with why they are ranked separately */
function GenderTabs({ current, href }: { current: Gender; href: (gender: Gender) => string }) {
  return (
    <div className="mb-6">
      <nav className="flex flex-wrap gap-2" aria-label={t("rankings.genders.label")}>
        {GENDERS.map((code) => (
          <Link
            key={code}
            href={href(code)}
            className={`px-3 py-1 text-sm border transition-colors duration-200 ${code === current ? "bg-gray-800 border-gray-800 text-white" : "border-gray-400 hover:border-black"}`}
            aria-current={code === current ? "page" : undefined}
          >
            {t(`rankings.genders.${code}`)}
          </Link>
        ))}
      </nav>
      <p className="text-gray-600 mt-2 max-w-3xl">{t("rankings.genders.explanation")}</p>
    </div>
  );
}

/** The list a /rankings/<list> page shows, from its params (404 for an unknown list) */
export async function RankingsFor({ params, showInactive, allInactive }: { params: Promise<{ list: string }>; showInactive: boolean; allInactive?: boolean }) {
  const list = RANKING_LISTS[(await params).list];
  if (!list) notFound();
  return <Rankings list={list} showInactive={showInactive} allInactive={allInactive} />;
}

/** The junior list a /rankings/junior/<list> page shows, from its params (404 for an unknown list) */
export async function JuniorRankingsFor({ params }: { params: Promise<{ list: string }> }) {
  const list = RANKING_LISTS[(await params).list];
  if (!list) notFound();
  return <JuniorRankings list={list} />;
}
