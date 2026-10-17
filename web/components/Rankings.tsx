// A ranking list: the discipline tabs, the "show inactive players" switch, in mixed doubles men or
// women, and the table. Each list is its own static page (lib/rankings.ts).
import Link from "next/link";
import { notFound } from "next/navigation";
import RankingTable, { type RankingRow } from "@/components/RankingTable";
import { getClubMap } from "@/lib/clubs";
import { POOLS, POOL_KEYS, getRankings } from "@/lib/data";
import { num } from "@/lib/format";
import { RANKING_LISTS, type RankingList, rankingHref } from "@/lib/rankings";
import type { Gender } from "@/lib/types";

const GENDERS: Record<Gender, string> = { M: "Men", K: "Women" };

export default async function Rankings({ list, showInactive }: { list: RankingList; showInactive: boolean }) {
  const { pool, gender } = list;
  const [players, clubs] = await Promise.all([getRankings(pool, showInactive, gender), getClubMap()]);

  return (
    <section className="base-section">
      <div className="base-container px-4">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-6">
          <nav className="flex flex-wrap gap-2" aria-label="Discipline">
            {POOL_KEYS.map((key) => (
              <Link
                key={key}
                href={rankingHref(key, null, showInactive)}
                className={`px-4 py-2 border border-black transition-colors duration-200 ${key === pool ? "bg-black text-white" : "hover:bg-black hover:text-white"}`}
                aria-current={key === pool ? "page" : undefined}
              >
                {POOLS[key]}
              </Link>
            ))}
          </nav>
          <Link
            href={rankingHref(pool, gender, !showInactive)}
            className="flex items-center gap-2 select-none"
            role="checkbox"
            aria-checked={showInactive}
          >
            <span className={`w-4 h-4 border border-black inline-flex items-center justify-center ${showInactive ? "bg-black" : "bg-white"}`} aria-hidden="true">
              {showInactive && <span className="w-2 h-2 bg-white" />}
            </span>
            Show inactive players
          </Link>
        </div>

        {gender && (
          <div className="mb-6">
            <nav className="flex flex-wrap gap-2" aria-label="Mixed doubles ranking">
              {(Object.keys(GENDERS) as Gender[]).map((code) => (
                <Link
                  key={code}
                  href={rankingHref(pool, code, showInactive)}
                  className={`px-3 py-1 text-sm border transition-colors duration-200 ${code === gender ? "bg-gray-800 border-gray-800 text-white" : "border-gray-400 hover:border-black"}`}
                  aria-current={code === gender ? "page" : undefined}
                >
                  {GENDERS[code]}
                </Link>
              ))}
            </nav>
            <p className="text-gray-600 mt-2 max-w-3xl">
              Men and women are ranked separately in mixed doubles. Every pair has one of each, so results show how men compare with men and women with women, but not how men&apos;s and women&apos;s ratings compare.
            </p>
          </div>
        )}

        {players.length === 0 ? (
          <p>No ratings yet: run the pipeline (pipeline/rate.mjs and pipeline/export.mjs).</p>
        ) : (
          <RankingTable
            rows={players.map((p): RankingRow => [p.id, p.name, p.club, p.rank, Math.round(p.rating), p.plusMinus, p.matches, p.lastPlayed])}
            clubs={Object.fromEntries([...new Set(players.map((p) => p.club).filter((c): c is string => !!c && !!clubs[c]))].map((c) => [c, [clubs[c].slug, clubs[c].logo]]))}
            summary={
              showInactive
                ? `${num(players.length)} players, including those who haven't played in the last 12 months (no rank).`
                : `${num(players.length)} ranked players: everyone who has played in the last 12 months.`
            }
          />
        )}
      </div>
    </section>
  );
}

/** The list a /rankings/<list> page shows, from its params (404 for an unknown list) */
export async function RankingsFor({ params, showInactive }: { params: Promise<{ list: string }>; showInactive: boolean }) {
  const list = RANKING_LISTS[(await params).list];
  if (!list) notFound();
  return <Rankings list={list} showInactive={showInactive} />;
}
