// A ranking list: the section's heading, all players or juniors (U19), men or women, the discipline (singles, doubles,
// mixed doubles or the combined list), the "show inactive players" switch, and the table. Each list is its own static page
// (utils/rankings.ts). With inactive players, only the best INACTIVE_SHOWN of them are listed (the full lists run to over
// 10,000 players), with a link to the page with all of them. The junior rankings (JuniorRankings) and the combined
// rankings (CombinedRankings, men or women) have ranked players only.
import { notFound } from "next/navigation";
import { ArrowRight, Check, Female, Male } from "@/components/SVG";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import CombinedTable, { type CombinedRow } from "@/components/rankings/CombinedTable";
import RankingTable, { type RankingRow } from "@/components/rankings/RankingTable";
import Link from "@/components/ui/Link";
import LinkTabs from "@/components/ui/LinkTabs";
import Section from "@/components/ui/Section";
import { TEXT_LINK } from "@/components/ui/styles";
import { getCombinedRankings, getJuniorRankings, getRankings } from "@/data/rankings";
import { getClubMap } from "@/data/sanity";
import { getI18n } from "@/messages/server";
import type { Gender, Pool } from "@/types";
import { combinedRankingHref, DISCIPLINES, disciplineHref, juniorRankingHref, listTabs, RANKING_LISTS, type RankingList, rankingHref } from "@/utils/rankings";

const GENDERS: Gender[] = ["M", "K"];
const INACTIVE_SHOWN = 500;

export default async function Rankings({ list, showInactive, allInactive = false }: { list: RankingList; showInactive: boolean; allInactive?: boolean }) {
  const { num, t } = await getI18n();
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
      <h1 className="h1 mt-4">{t("rankings.pageHeading")}</h1>
      <p className="text-2xl max-w-3xl mt-2 mb-8">{t("rankings.intro")}</p>
      <AgeTabs junior={false} all={rankingHref(pool, gender)} juniors={juniorRankingHref(pool, gender)} />
      <GenderTabs current={listTabs(pool, gender)} showInactive={showInactive} />
      <div className="flex flex-wrap items-end justify-between gap-6 mb-6">
        <DisciplineTabs current={listTabs(pool, gender)} showInactive={showInactive} />
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

      {gender && <Explanation text={t("rankings.genders.explanation")} />}

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
  const { num, t } = await getI18n();
  const { pool, gender } = list;
  const [{ players, bornFrom }, clubs] = await Promise.all([getJuniorRankings(pool, gender), getClubMap()]);

  return (
    <Section>
      <Breadcrumbs trail={[{ label: t("rankings.heading"), href: rankingHref(pool, gender) }, { label: t("rankings.junior.crumb") }]} />
      <h1 className="h1 mt-4">{t("rankings.junior.heading")}</h1>
      <p className="text-2xl max-w-3xl mt-2 mb-8">{t("rankings.junior.intro")}</p>
      <AgeTabs junior all={rankingHref(pool, gender)} juniors={juniorRankingHref(pool, gender)} />
      <GenderTabs current={listTabs(pool, gender)} junior />
      <div className="mb-6">
        <DisciplineTabs current={listTabs(pool, gender)} junior />
      </div>

      {gender && <Explanation text={t("rankings.genders.explanation")} />}

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

/**
 * A combined ranking: men's or women's singles, doubles and mixed doubles together (players ranked in all three), of
 * everyone or of the juniors (U19)
 */
export async function CombinedRankings({ gender, junior }: { gender: Gender; junior: boolean }) {
  const { num, t } = await getI18n();
  const [{ players, bornFrom }, clubs] = await Promise.all([getCombinedRankings(gender, junior), getClubMap()]);
  const pools = Object.keys(players[0]?.pools ?? {}) as Pool[];
  const crumbs = junior
    ? [{ label: t("rankings.heading"), href: combinedRankingHref(gender) }, { label: t("rankings.junior.crumb"), href: juniorRankingHref("men") }, { label: t("rankings.combined.crumb") }]
    : [{ label: t("rankings.heading"), href: rankingHref("men") }, { label: t("rankings.combined.crumb") }];

  return (
    <Section>
      <Breadcrumbs trail={crumbs} />
      <h1 className="h1 mt-4">{t(junior ? "rankings.junior.heading" : "rankings.pageHeading")}</h1>
      <p className="text-2xl max-w-3xl mt-2 mb-8">{t(junior ? "rankings.junior.intro" : "rankings.intro")}</p>
      <AgeTabs junior={junior} all={combinedRankingHref(gender)} juniors={combinedRankingHref(gender, true)} />
      <GenderTabs current={listTabs("combined", gender)} junior={junior} />
      <div className="mb-6">
        <DisciplineTabs current={listTabs("combined", gender)} junior={junior} />
      </div>
      <Explanation text={t("rankings.combined.explanation")} />

      {players.length === 0 ? (
        <p>{t("rankings.noRatings")}</p>
      ) : (
        <CombinedTable
          pools={pools}
          rows={players.map((p): CombinedRow => [p.id, p.name, p.club, p.rank, p.score, p.matches, pools.map((pool) => { const e = p.pools[pool]; return e ? [e.rank, Math.round(e.rating)] : null; }), p.previousRank])}
          clubs={Object.fromEntries([...new Set(players.map((p) => p.club).filter((c): c is string => !!c && !!clubs[c]))].map((c) => [c, [clubs[c].slug, clubs[c].logo]]))}
          summary={
            junior
              ? t("rankings.combined.juniorSummary", { count: num(players.length), year: bornFrom ?? "" })
              : t("rankings.combined.summary", { count: num(players.length) })
          }
        />
      )}
    </Section>
  );
}

/** All players or juniors (U19), in the same list */
async function AgeTabs({ junior, all, juniors }: { junior: boolean; all: string; juniors: string }) {
  const { t } = await getI18n();
  return (
    <LinkTabs
      label={t("rankings.junior.ages")}
      current={junior ? "junior" : "all"}
      size="sm"
      className="flex flex-wrap gap-2 mb-6"
      tabs={[
        { key: "all", href: all, label: t("rankings.junior.allAges") },
        { key: "junior", href: juniors, label: t("rankings.junior.tab") },
      ]}
    />
  );
}

type Tabs = ReturnType<typeof listTabs>;

/** Men or women (♂ and ♀), first: the same discipline for the other gender */
async function GenderTabs({ current, junior = false, showInactive = false }: { current: Tabs; junior?: boolean; showInactive?: boolean }) {
  const { t } = await getI18n();
  return (
    <LinkTabs
      label={t("rankings.genders.label")}
      current={current.gender}
      className="flex flex-wrap gap-2 mb-4"
      tabs={GENDERS.map((code) => {
        const Icon = code === "K" ? Female : Male;
        return { key: code, href: disciplineHref(current.discipline, code, { junior, inactive: showInactive }), label: <><Icon className="mr-1.5" />{t(`rankings.genders.${code}`)}</> };
      })}
    />
  );
}

/** Singles, doubles, mixed doubles and the combined list, for the list's gender */
async function DisciplineTabs({ current, junior = false, showInactive = false }: { current: Tabs; junior?: boolean; showInactive?: boolean }) {
  const { t } = await getI18n();
  return (
    <LinkTabs
      label={t("rankings.disciplines")}
      current={current.discipline}
      tabs={DISCIPLINES.map((key) => ({ key, href: disciplineHref(key, current.gender, { junior, inactive: showInactive }), label: t(`rankings.disciplineTabs.${key}`) }))}
    />
  );
}

/** Why mixed doubles and the combined lists rank men and women separately (and how the combined one is made) */
function Explanation({ text }: { text: string }) {
  return <p className="text-gray-600 mb-6 max-w-3xl">{text}</p>;
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
