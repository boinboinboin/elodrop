// Strongest clubs in one pool, or combined over all five: the average rating of each club's best
// ranked players (pipeline/rate.mjs). Each list is its own static page: /clubs (combined) and
// /clubs/strongest/<pool>. The table (components/clubs/ClubTable.tsx) can be sorted by ranked players and by the
// strength (combined: score) gained or lost since last week. In one discipline, the clubs and the players counted
// link to their pages on that discipline.
import ClubTable, { type ClubRow, type TopPlayer } from "@/components/clubs/ClubTable";
import PoolName from "@/components/format/PoolName";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import LinkTabs from "@/components/ui/LinkTabs";
import Section from "@/components/ui/Section";
import { getClubsFile } from "@/data/clubs";
import { getClubMap } from "@/data/sanity";
import { getI18n } from "@/messages/server";
import type { CombinedClubStanding, ClubStanding, Pool } from "@/types";
import { clubRule } from "@/utils/clubs";
import { POOL_KEYS } from "@/utils/pools";
import { strongestClubsHref } from "@/utils/rankings";

const TABS: (Pool | "combined")[] = ["combined", ...POOL_KEYS];

export default async function StrongestClubs({ pool }: { pool: Pool | "combined" }) {
  const i18n = await getI18n();
  const { pools, t } = i18n;
  const combined = pool === "combined";
  const [file, entries] = await Promise.all([getClubsFile(), getClubMap()]);
  const clubs = (file?.clubs[pool] ?? []) as (ClubStanding | CombinedClubStanding)[];
  const rule = combined ? null : (file?.clubStrength[pool] ?? null);

  return (
    <>
      <Section>
        <Breadcrumbs trail={combined ? [{ label: t("clubs.clubs") }] : [{ label: t("clubs.clubs"), href: "/clubs" }, { label: pools[pool] }]} />
        <h1 className="h1 mt-4">{t("clubs.strongest.title")}</h1>
        <p className="text-2xl max-w-3xl mt-2">{combined ? t("clubs.strongest.combinedIntro") : rule && t("clubs.strongest.poolIntro", { rule: clubRule(i18n, rule) })}</p>
      </Section>

      <Section>
        <LinkTabs
          label={t("clubs.strongest.disciplines")}
          current={pool}
          className="flex flex-wrap gap-2 mb-6"
          tabs={TABS.map((key) => ({ key, href: strongestClubsHref(key), label: key === "combined" ? t("clubs.strongest.combined") : <PoolName pool={key} /> }))}
        />
        {clubs.length === 0 ? (
          <p>{t("clubs.strongest.noClubs")}</p>
        ) : (
          <div className="bg-white overflow-x-clip">
            {/* clip, not auto: a scrolling box would keep the sticky header from sticking to the page (narrow screens hide the wide columns) */}
            <ClubTable
              pool={pool}
              pairs={!!rule?.pairs}
              rows={clubs.map((club): ClubRow =>
                "pools" in club
                  ? [club.club, club.rank, club.previousRank, club.score, club.scoreChange, club.players, POOL_KEYS.map((key) => (club.pools[key] ? [Math.round(club.pools[key].strength), club.pools[key].rank] : null))]
                  : [club.club, club.rank, club.previousRank, Math.round(club.strength), club.strengthChange, club.players, club.top.map((slot) => slot.map((p): TopPlayer => [p.id, p.name, Math.round(p.rating)]))],
              )}
              clubs={Object.fromEntries(clubs.filter((club) => entries[club.club]).map((club) => [club.club, [entries[club.club].slug, entries[club.club].logo ?? null]]))}
            />
          </div>
        )}
      </Section>
    </>
  );
}
