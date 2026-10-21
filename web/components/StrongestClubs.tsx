// Strongest clubs in one pool, or combined over all five: the average rating of each club's best
// ranked players (pipeline/rate.mjs). Each list is its own static page: /clubs (combined) and
// /clubs/strongest/<pool>. The table can be sorted by ranked players (components/SortableTable).
import Link from "next/link";
import { clubRule } from "@/components/ClubRule";
import { ArrowLeft } from "@/components/Icons";
import PoolName from "@/components/PoolName";
import RankMovement, { WeekChange } from "@/components/RankMovement";
import SortableTable from "@/components/SortableTable";
import { ClubLogo } from "@/components/Team";
import { getClubMap } from "@/lib/clubs";
import { POOLS, POOL_KEYS, getClubsFile } from "@/lib/data";
import { rankingHref, strongestClubsHref } from "@/lib/rankings";
import type { CombinedClubStanding, ClubStanding, Pool } from "@/lib/types";

const TABS = { combined: "Combined", ...POOLS };

export default async function StrongestClubs({ pool }: { pool: Pool | "combined" }) {
  const combined = pool === "combined";
  const [file, entries] = await Promise.all([getClubsFile(), getClubMap()]);
  const clubs = (file?.clubs[pool] ?? []) as (ClubStanding | CombinedClubStanding)[];
  const rule = combined ? null : (file?.clubStrength[pool] ?? null);

  return (
    <>
      <section className="base-section">
        <div className="base-container px-4">
          <Link href={combined ? "/" : rankingHref(pool)} className="text-gray-600 hover:text-black"><ArrowLeft /> Rankings</Link>
          <h1 className="h1 mt-4">Strongest clubs</h1>
          <p className="text-2xl max-w-3xl mt-2">
            {combined
              ? "Clubs ranked by their average standing in all five disciplines, each counting equally. In each discipline, a club's strength is compared with the other clubs listed here: 0 is average, +1 is one standard deviation above it. Clubs need to be listed in every discipline."
              : rule && `Clubs ranked by ${clubRule(rule)}. A pair counts at the average of its two players. Places a club can't fill count at the lowest rating among ranked players, so smaller clubs are listed but rank lower.`}
          </p>
        </div>
      </section>

      <section className="base-section">
        <div className="base-container px-4">
          <nav className="flex flex-wrap gap-2 mb-6" aria-label="Discipline">
            {(Object.keys(TABS) as (Pool | "combined")[]).map((key) => (
              <Link
                key={key}
                href={strongestClubsHref(key)}
                className={`px-4 py-2 border border-black transition-colors duration-200 ${key === pool ? "bg-black text-white" : "hover:bg-black hover:text-white"}`}
                aria-current={key === pool ? "page" : undefined}
              >
                {key === "combined" ? TABS.combined : <PoolName pool={key} />}
              </Link>
            ))}
          </nav>
          {clubs.length === 0 ? (
            <p>No clubs yet: run the pipeline.</p>
          ) : (
            <div className="bg-white overflow-x-clip">
              {/* clip, not auto: a scrolling box would keep the sticky header from sticking to the page (narrow screens hide the wide columns) */}
              <SortableTable
                head={
                  <>
                    <th scope="col" className="py-3 pl-2 sm:pl-4 pr-1.5 sm:pr-2 font-normal text-right w-10 sm:w-16">#</th>
                    <th scope="col" className="py-3 pr-2 sm:pr-4 font-normal w-11 sm:w-14"><span className="sr-only">Since last week</span></th>
                    <th scope="col" className="py-3 px-1.5 sm:px-4 font-normal">Club</th>
                    <th scope="col" className="py-3 pl-1.5 sm:pl-4 pr-1 sm:pr-1.5 font-normal text-right">{combined ? "Score" : "Strength"}</th>
                    <th scope="col" className="py-3 pr-2 sm:pr-4 font-normal w-11 sm:w-14"><span className="sr-only">Change since last week</span></th>
                    {combined ? (
                      POOL_KEYS.map((key) => (
                        <th key={key} scope="col" className="py-3 px-4 font-normal text-right hidden lg:table-cell">{POOLS[key]}</th>
                      ))
                    ) : (
                      <th scope="col" className="py-3 px-4 font-normal hidden md:table-cell">{rule?.pairs ? "Best pairs" : "Best players"}</th>
                    )}
                  </>
                }
                sortLabel="Ranked players"
                sortClassName="py-3 px-4 font-normal text-right hidden sm:table-cell"
                rows={clubs.map((club) => {
                    const entry = entries[club.club];
                    return {
                      key: club.club,
                      value: club.players,
                      row: (
                        <tr key={club.club} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 align-top">
                        <td className="py-3 pl-2 sm:pl-4 pr-1.5 sm:pr-2 text-right text-gray-600 tabular-nums">{club.rank}</td>
                        <td className="py-3 pr-2 sm:pr-4 text-sm"><RankMovement rank={club.rank} previous={club.previousRank} /></td>
                        <td className="py-3 px-1.5 sm:px-4 max-sm:[overflow-wrap:anywhere]">
                          <span className="flex items-center gap-3">
                            <ClubLogo name={club.club} clubs={entries} size={8} />
                            {entry ? <Link href={`/clubs/${entry.slug}`} className="hover:text-blue-600">{club.club}</Link> : club.club}
                          </span>
                        </td>
                        <td className="py-3 pl-1.5 sm:pl-4 pr-1 sm:pr-1.5 text-right tabular-nums">
                          {"score" in club ? `${club.score > 0 ? "+" : ""}${club.score.toFixed(2)}` : Math.round(club.strength)}
                        </td>
                        <td className="py-3 pr-2 sm:pr-4 whitespace-nowrap">{"strengthChange" in club && <WeekChange change={club.strengthChange} what="strength" />}</td>
                        {"pools" in club ? (
                          POOL_KEYS.map((key) => {
                            const c = club.pools[key];
                            return (
                              <td key={key} className="py-3 px-4 text-right tabular-nums hidden lg:table-cell">
                                {c && Math.round(c.strength)}
                                {c && <Link href={strongestClubsHref(key)} className="block text-sm text-gray-600 hover:text-blue-600">#{c.rank}</Link>}
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
                                    <Link href={`/players/${p.id}`} className="hover:text-blue-600">{p.name}</Link>{" "}
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
        </div>
      </section>
    </>
  );
}
