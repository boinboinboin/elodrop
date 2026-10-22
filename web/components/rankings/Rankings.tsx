// A ranking list: the discipline tabs, the "show inactive players" switch, in mixed doubles men or
// women, and the table. Each list is its own static page (utils/rankings.ts). With inactive players,
// only the best INACTIVE_SHOWN of them are listed (the full lists run to over 10,000 players), with a
// link to the page with all of them.
import Link from "next/link";
import { notFound } from "next/navigation";
import PoolName from "@/components/format/PoolName";
import RankingTable, { type RankingRow } from "@/components/rankings/RankingTable";
import { ArrowRight, Check } from "@/components/SVG";
import LinkTabs from "@/components/ui/LinkTabs";
import Section from "@/components/ui/Section";
import { TEXT_LINK } from "@/components/ui/styles";
import { getRankings } from "@/data/rankings";
import { getClubMap } from "@/data/sanity";
import { t } from "@/messages/i18n";
import type { Gender } from "@/types";
import { num } from "@/utils/format";
import { POOL_KEYS } from "@/utils/pools";
import { RANKING_LISTS, type RankingList, rankingHref } from "@/utils/rankings";

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

      {gender && (
        <div className="mb-6">
          <nav className="flex flex-wrap gap-2" aria-label={t("rankings.genders.label")}>
            {GENDERS.map((code) => (
              <Link
                key={code}
                href={rankingHref(pool, code, showInactive)}
                className={`px-3 py-1 text-sm border transition-colors duration-200 ${code === gender ? "bg-gray-800 border-gray-800 text-white" : "border-gray-400 hover:border-black"}`}
                aria-current={code === gender ? "page" : undefined}
              >
                {t(`rankings.genders.${code}`)}
              </Link>
            ))}
          </nav>
          <p className="text-gray-600 mt-2 max-w-3xl">{t("rankings.genders.explanation")}</p>
        </div>
      )}

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

/** The list a /rankings/<list> page shows, from its params (404 for an unknown list) */
export async function RankingsFor({ params, showInactive, allInactive }: { params: Promise<{ list: string }>; showInactive: boolean; allInactive?: boolean }) {
  const list = RANKING_LISTS[(await params).list];
  if (!list) notFound();
  return <Rankings list={list} showInactive={showInactive} allInactive={allInactive} />;
}
