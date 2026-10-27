// Strongest clubs in one pool, or combined over all five: the average rating of each club's best
// ranked players (pipeline/rate.mjs). Each list is its own static page: /clubs (combined) and
// /clubs/strongest/<pool>. The table can be sorted by ranked players and, per discipline, by the strength
// gained or lost since last week (components/ui/SortableTable.tsx).
import Link from "next/link";
import { ClubLogo } from "@/components/clubs/Team";
import PoolName from "@/components/format/PoolName";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import RankMovement, { WeekChange } from "@/components/rankings/RankMovement";
import LinkTabs from "@/components/ui/LinkTabs";
import Section from "@/components/ui/Section";
import SortableTable from "@/components/ui/SortableTable";
import { ROW } from "@/components/ui/styles";
import { getClubsFile } from "@/data/clubs";
import { getClubMap } from "@/data/sanity";
import { t } from "@/messages/i18n";
import type { CombinedClubStanding, ClubStanding, Pool } from "@/types";
import { clubRule } from "@/utils/clubs";
import { signed } from "@/utils/format";
import { clubHref, playerHref } from "@/utils/hrefs";
import { POOLS, POOL_KEYS } from "@/utils/pools";
import { strongestClubsHref } from "@/utils/rankings";

const TABS: (Pool | "combined")[] = ["combined", ...POOL_KEYS];

export default async function StrongestClubs({ pool }: { pool: Pool | "combined" }) {
  const combined = pool === "combined";
  const [file, entries] = await Promise.all([getClubsFile(), getClubMap()]);
  const clubs = (file?.clubs[pool] ?? []) as (ClubStanding | CombinedClubStanding)[];
  const rule = combined ? null : (file?.clubStrength[pool] ?? null);

  return (
    <>
      <Section>
        <Breadcrumbs trail={combined ? [{ label: t("clubs.clubs") }] : [{ label: t("clubs.clubs"), href: "/clubs" }, { label: POOLS[pool] }]} />
        <h1 className="h1 mt-4">{t("clubs.strongest.title")}</h1>
        <p className="text-2xl max-w-3xl mt-2">{combined ? t("clubs.strongest.combinedIntro") : rule && t("clubs.strongest.poolIntro", { rule: clubRule(rule) })}</p>
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
            <SortableTable
              head={
                <>
                  <th scope="col" className="py-3 pl-2 sm:pl-4 pr-1.5 sm:pr-2 font-normal text-right w-10 sm:w-16">{t("common.table.rank")}</th>
                  <th scope="col" className="py-3 pr-2 sm:pr-4 font-normal w-11 sm:w-14"><span className="sr-only">{t("common.table.sinceLastWeek")}</span></th>
                  <th scope="col" className="py-3 px-1.5 sm:px-4 font-normal">{t("common.table.club")}</th>
                  <th scope="col" className="py-3 pl-1.5 sm:pl-4 pr-1 sm:pr-1.5 font-normal text-right">{t(combined ? "clubs.strongest.score" : "clubs.strongest.strength")}</th>
                  {/* The combined score has no change since last week to sort by */}
                  {combined && (
                    <>
                      <th scope="col" className="py-3 pr-2 sm:pr-4 font-normal w-11 sm:w-14"><span className="sr-only">{t("common.table.changeSinceLastWeek")}</span></th>
                      {POOL_KEYS.map((key) => (
                        <th key={key} scope="col" className="py-3 px-4 font-normal text-right hidden lg:table-cell">{POOLS[key]}</th>
                      ))}
                    </>
                  )}
                </>
              }
              changeClassName={combined ? undefined : "py-3 pr-2 sm:pr-4 font-normal w-11 sm:w-14"}
              headAfter={!combined && <th scope="col" className="py-3 px-4 font-normal hidden md:table-cell">{t(rule?.pairs ? "clubs.strongest.bestPairs" : "clubs.strongest.bestPlayers")}</th>}
              sortLabel={t("clubs.strongest.rankedPlayers")}
              sortTitle={t("clubs.strongest.sortByRankedPlayers")}
              sortClassName="py-3 px-4 font-normal text-right hidden sm:table-cell"
              rows={clubs.map((club) => {
                  const entry = entries[club.club];
                  return {
                    key: club.club,
                    value: club.players,
                    change: "strengthChange" in club ? club.strengthChange : null,
                    row: (
                      <tr key={club.club} className={`${ROW} hover:bg-gray-50 align-top`}>
                      <td className="py-3 pl-2 sm:pl-4 pr-1.5 sm:pr-2 text-right text-gray-600 tabular-nums">{club.rank}</td>
                      <td className="py-3 pr-2 sm:pr-4 text-sm"><RankMovement rank={club.rank} previous={club.previousRank} /></td>
                      <td className="py-3 px-1.5 sm:px-4 max-sm:[overflow-wrap:anywhere]">
                        <span className="flex items-center gap-3">
                          <ClubLogo name={club.club} clubs={entries} size={8} />
                          {entry ? <Link href={clubHref(entry.slug)} className="hover:text-blue-600">{club.club}</Link> : club.club}
                        </span>
                      </td>
                      <td className="py-3 pl-1.5 sm:pl-4 pr-1 sm:pr-1.5 text-right tabular-nums">
                        {"score" in club ? signed(club.score, 2, "") : Math.round(club.strength)}
                      </td>
                      <td className="py-3 pr-2 sm:pr-4 whitespace-nowrap">{"strengthChange" in club && <WeekChange change={club.strengthChange} what="strength" />}</td>
                      {"pools" in club ? (
                        POOL_KEYS.map((key) => {
                          const c = club.pools[key];
                          return (
                            <td key={key} className="py-3 px-4 text-right tabular-nums hidden lg:table-cell">
                              {c && Math.round(c.strength)}
                              {c && <Link href={strongestClubsHref(key)} className="block text-sm text-gray-600 hover:text-blue-600">{t("common.rankValue", { rank: c.rank })}</Link>}
                            </td>
                          );
                        })
                      ) : (
                        <td className="py-3 px-4 hidden md:table-cell">
                          {/* The players or pairs counted, best first */}
                          {club.top.map((slot, i) => (
                            <span key={i} className="block">
                              {slot.map((p, j) => (
                                <span key={p.id}>
                                  <Link href={playerHref(p.id)} className="hover:text-blue-600">{p.name}</Link>{" "}
                                  <span className="text-sm text-gray-500 tabular-nums">{Math.round(p.rating)}</span>
                                  {j < slot.length - 1 && <span className="text-gray-500"> + </span>}
                                </span>
                              ))}
                            </span>
                          ))}
                        </td>
                      )}
                      <td className="py-3 px-4 text-right text-gray-700 tabular-nums hidden sm:table-cell">{club.players}</td>
                    </tr>
                  ),
                  };
              })}
            />
          </div>
        )}
      </Section>
    </>
  );
}
