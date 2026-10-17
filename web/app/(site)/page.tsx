// The rankings: one table per discipline (?pool=men), ranked players or everyone (?inactive=1),
// in mixed doubles men or women (?gender=M|K); this week's biggest upsets above.
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import RankingTable, { type RankingRow } from "@/components/RankingTable";
import UpsetCard from "@/components/UpsetCard";
import { getClubMap } from "@/lib/clubs";
import { POOLS, POOL_KEYS, getRankings, getUpsetsIndex, isPool } from "@/lib/data";
import { addDays, dateRange, mondayOf, num, today } from "@/lib/format";
import type { Gender, Pool } from "@/lib/types";

const GENDERS: Record<Gender, string> = { M: "Men", K: "Women" };

export default function Home(props: PageProps<"/">) {
  return (
    <>
      <section className="base-section">
        <div className="base-container px-4">
          <h1 className="h1">elodrop</h1>
          <p className="text-2xl max-w-3xl mt-2">
            Singles and doubles ratings for Norwegian badminton, calculated from every tournament and league result on badmintonportalen.no since 2013.
          </p>
          <p className="mt-4 flex flex-wrap gap-x-6 gap-y-1">
            <Link href="/clubs" className="underline hover:text-blue-600">Strongest clubs &rarr;</Link>
            <Link href="/eliteserien" className="underline hover:text-blue-600">Eliteserien team strengths &rarr;</Link>
            <Link href="/head-to-head" className="underline hover:text-blue-600">Head to head &rarr;</Link>
            <Link href="/upsets" className="underline hover:text-blue-600">Biggest upsets &rarr;</Link>
            <Link href="/tournaments" className="underline hover:text-blue-600">Tournament draws &rarr;</Link>
          </p>
        </div>
      </section>
      <Suspense fallback={null}>
        <LatestUpsets />
      </Suspense>
      <Suspense fallback={<div className="base-container px-4 text-gray-600">Loading rankings…</div>}>
        <Rankings searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

/** The newest week's three biggest upsets: this week's if there have been matches, else the last week that had some */
async function LatestUpsets() {
  await connection();
  const [index, clubs] = await Promise.all([getUpsetsIndex(), getClubMap()]);
  const week = index?.latest;
  if (!week) return null;
  return (
    <section className="base-section">
      <div className="base-container px-4">
        <div className="flex flex-wrap items-baseline justify-between gap-4 mb-4">
          <h2 className="text-3xl">
            {week.week === mondayOf(today()) ? "This week's biggest upsets" : `Biggest upsets, week of ${dateRange(week.week, addDays(week.week, 6), true)}`}
          </h2>
          <Link href="/upsets" className="underline hover:text-blue-600">All weeks &rarr;</Link>
        </div>
        <ol className="grid gap-4 md:grid-cols-3">
          {week.matches.slice(0, 3).map((u, i) => (
            <li key={i}>
              <UpsetCard upset={{ ...u, poolLabel: POOLS[u.pool] }} rank={i + 1} clubs={clubs} />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

async function Rankings({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const params = await searchParams;
  const pool: Pool = isPool(params.pool) ? params.pool : "men";
  const showInactive = params.inactive === "1";
  // Mixed doubles ranks men and women separately
  const gender: Gender | null = pool === "mixedDoubles" ? (params.gender === "K" ? "K" : "M") : null;
  const [players, clubs] = await Promise.all([getRankings(pool, showInactive, gender), getClubMap()]);
  const link = (p: Record<string, string | undefined>) => `/?${new URLSearchParams(Object.entries(p).filter(([, v]) => v) as [string, string][])}`;

  return (
    <section className="base-section">
      <div className="base-container px-4">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-6">
          <nav className="flex flex-wrap gap-2" aria-label="Discipline">
            {POOL_KEYS.map((key) => (
              <Link
                key={key}
                href={link({ pool: key, inactive: showInactive ? "1" : undefined })}
                className={`px-4 py-2 border border-black transition-colors duration-200 ${key === pool ? "bg-black text-white" : "hover:bg-black hover:text-white"}`}
                aria-current={key === pool ? "page" : undefined}
              >
                {POOLS[key]}
              </Link>
            ))}
          </nav>
          <Link
            href={link({ pool, gender: gender ?? undefined, inactive: showInactive ? undefined : "1" })}
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
                  href={link({ pool, gender: code, inactive: showInactive ? "1" : undefined })}
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
