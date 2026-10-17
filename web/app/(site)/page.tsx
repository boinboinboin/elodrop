// The front page: men's singles ranking (the other lists are at /rankings/<list>, lib/rankings.ts),
// with the newest week's biggest upsets above. Fully static: rendered once per data update.
import Link from "next/link";
import { Suspense } from "react";
import Rankings from "@/components/Rankings";
import UpsetCard from "@/components/UpsetCard";
import { getClubMap } from "@/lib/clubs";
import { POOLS, getUpsetsIndex } from "@/lib/data";
import { addDays, dateRange, mondayOf } from "@/lib/format";
import { RANKING_LISTS } from "@/lib/rankings";

export default function Home() {
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
        <Rankings list={RANKING_LISTS.men} showInactive={false} />
      </Suspense>
    </>
  );
}

/**
 * The newest week's three biggest upsets: this week's if there have been matches, else the last
 * week that had some. "This week" is the week of the data update, which the page is rendered with.
 */
async function LatestUpsets() {
  const [index, clubs] = await Promise.all([getUpsetsIndex(), getClubMap()]);
  const week = index?.latest;
  if (!week) return null;
  return (
    <section className="base-section">
      <div className="base-container px-4">
        <div className="flex flex-wrap items-baseline justify-between gap-4 mb-4">
          <h2 className="text-3xl">
            {week.week === mondayOf(index.generatedAt.slice(0, 10)) ? "This week's biggest upsets" : `Biggest upsets, week of ${dateRange(week.week, addDays(week.week, 6), true)}`}
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
