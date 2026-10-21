// Each week's biggest upsets (pipeline/rate.mjs): the newest week's top 10, and the biggest upset of
// every week of its year. /upsets/<Monday> shows another week and /upsets/<year> that year's newest
// (app/(site)/upsets/[period]); each is a static page.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ArrowRight } from "@/components/Icons";
import { ClubLogo } from "@/components/Team";
import UpsetCard from "@/components/UpsetCard";
import { getClubMap } from "@/lib/clubs";
import { POOLS, getUpsetYear, getUpsetsIndex } from "@/lib/data";
import { addDays, date, dateRange, signed } from "@/lib/format";
import type { ClubEntry, UpsetPlayer, UpsetWeek } from "@/lib/types";

/** The page for a period: null for the newest week, a year ("2019") for its newest week, or a week's Monday */
export default function Upsets({ period }: { period: Promise<string | null> }) {
  return (
    <>
      <section className="base-section">
        <div className="base-container px-4">
          <Link href="/" className="text-gray-600 hover:text-black"><ArrowLeft /> Rankings</Link>
          <h1 className="h1 mt-4">Biggest upsets</h1>
          <p className="text-2xl max-w-3xl mt-2">The matches won with the lowest chance of winning, week by week.</p>
          <p className="max-w-3xl mt-4 text-gray-700">
            The win chance is from the ratings right before the match. Only matches between settled players count: every player has played at least 10 matches and has a rating certain to within ±250 in
            singles or ±180 in doubles, so a junior improving fast beating a favourite isn&apos;t counted as an upset. Walkovers and draws are left out.
          </p>
        </div>
      </section>
      <Suspense fallback={<div className="base-container px-4 text-gray-600">Loading upsets…</div>}>
        <Content period={period} />
      </Suspense>
    </>
  );
}

const withLabels = (w: UpsetWeek): UpsetWeek => ({ ...w, matches: w.matches.map((m) => ({ ...m, poolLabel: POOLS[m.pool] })) });

async function Content({ period: periodPromise }: { period: Promise<string | null> }) {
  const [period, index, clubs] = await Promise.all([periodPromise, getUpsetsIndex(), getClubMap()]);
  if (!index?.latest) return <p className="base-container px-4 text-gray-600">No upsets calculated yet: run the pipeline.</p>;
  const years = index.years;
  const weekYear = period ? period.slice(0, 4) : index.latest.week.slice(0, 4);
  if (period && (!/^\d{4}(-\d{2}-\d{2})?$/.test(period) || !years.includes(weekYear))) notFound();
  const weeks = await getUpsetYear(weekYear);
  // Newest first: a year shows its newest week
  const found = !period ? index.latest : period.length === 4 ? weeks[0] : weeks.find((w) => w.week === period);
  if (!found) notFound();
  const current = withLabels(found);

  // Newest first: the earlier week is the next item, crossing into the year before if needed
  const at = weeks.findIndex((w) => w.week === current.week);
  const yearAt = years.indexOf(weekYear);
  const earlier = weeks[at + 1] ?? (years[yearAt + 1] ? (await getUpsetYear(years[yearAt + 1]))[0] : null) ?? null;
  const later = at > 0 ? weeks[at - 1] : yearAt > 0 ? ((await getUpsetYear(years[yearAt - 1])).at(-1) ?? null) : null;

  const year = weekYear;
  const yearWeeks = weeks;

  return (
    <>
      <section className="base-section">
        <div className="base-container px-4">
          <div className="flex flex-wrap items-baseline justify-between gap-4 mb-6">
            <h2 className="text-3xl">Week of {dateRange(current.week, addDays(current.week, 6), true)}</h2>
            <nav className="flex gap-2" aria-label="Weeks">
              {earlier && <Link href={`/upsets/${earlier.week}`} className="px-4 py-2 border border-black hover:bg-black hover:text-white transition-colors duration-200"><ArrowLeft /> Earlier</Link>}
              {later && <Link href={`/upsets/${later.week}`} className="px-4 py-2 border border-black hover:bg-black hover:text-white transition-colors duration-200">Later <ArrowRight /></Link>}
            </nav>
          </div>
          <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {current.matches.map((u, i) => (
              <li key={i}><UpsetCard upset={u} rank={i + 1} clubs={clubs} /></li>
            ))}
          </ol>
        </div>
      </section>

      <section className="base-section">
        <div className="base-container px-4">
          <h2 className="text-3xl mb-4">Biggest upset of each week</h2>
          <nav className="flex flex-wrap gap-2 mb-6" aria-label="Year">
            {years.map((y) => (
              <Link
                key={y}
                href={`/upsets/${y}`}
                className={`px-3 py-1 border border-black transition-colors duration-200 ${y === year ? "bg-black text-white" : "hover:bg-black hover:text-white"}`}
                aria-current={y === year ? "page" : undefined}
              >
                {y}
              </Link>
            ))}
          </nav>
          <div className="bg-white overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-sm text-gray-600 border-b border-gray-200">
                <tr>
                  <th scope="col" className="py-2 pl-2 pr-1 sm:px-4 font-normal">Week</th>
                  <th scope="col" className="py-2 px-2 sm:px-4 font-normal">Upset</th>
                  <th scope="col" className="hidden sm:table-cell py-2 px-4 font-normal text-right" title="The winner's chance of winning before the match">Chance</th>
                </tr>
              </thead>
              <tbody>
                {yearWeeks.map((w) => {
                  const u = w.matches[0];
                  const chance = Math.round(u.winChance * 100);
                  const chanceText = `${chance < 1 ? "<1" : chance}%`;
                  return (
                    <tr key={w.week} className={`border-b border-gray-100 last:border-0 align-top ${w.week === current.week ? "bg-gray-50" : ""}`}>
                      <td className="py-2 pl-2 pr-1 sm:px-4 whitespace-nowrap"><Link href={`/upsets/${w.week}`} className="hover:text-blue-600">{date(w.week, "dayMonth")}</Link></td>
                      {/* One player per line, "beat" between the sides; on phones the chance under the event */}
                      <td className="py-2 px-2 sm:px-4 max-sm:[overflow-wrap:anywhere]">
                        {u.winners.map((p) => <UpsetName key={p.id} p={p} clubs={clubs} bold />)}
                        <span className="block text-sm text-gray-600">beat</span>
                        {u.losers.map((p) => <UpsetName key={p.id} p={p} clubs={clubs} />)}
                        <span className="block mt-1 text-sm text-gray-600">{u.score} · {POOLS[u.pool]} · {u.event}</span>
                        <span className="sm:hidden block text-sm text-gray-600 tabular-nums"><strong className="text-gray-900">{chanceText}</strong> chance</span>
                      </td>
                      <td className="hidden sm:table-cell py-2 px-4 text-right tabular-nums">{chanceText}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}

/**
 * A player on a line of their own: their club's logo (if any) and name, then the club and the
 * rating gained or lost, which wrap together onto the next line when they don't fit
 */
function UpsetName({ p, clubs, bold = false }: { p: UpsetPlayer; clubs: Record<string, ClubEntry>; bold?: boolean }) {
  return (
    <span className="flex flex-wrap items-baseline gap-x-1.5" title={p.club ?? undefined}>
      <span className="inline-flex items-center gap-1 self-center">
        <ClubLogo name={p.club} clubs={clubs} />
        <Link href={`/players/${p.id}`} className={`${bold ? "font-semibold" : ""} hover:text-blue-600`}>{p.name}</Link>
      </span>
      <span className="text-sm whitespace-nowrap">
        {p.club && <span className="text-gray-500">{p.club}</span>}
        {p.change !== undefined && (
          <span className={`tabular-nums ${p.club ? "ml-1.5 " : ""}${p.change >= 0 ? "text-green-700" : "text-red-700"}`} title={`Rating ${p.change >= 0 ? "gained" : "lost"}`}>
            {signed(p.change, 1).replace("±", "+")}
          </span>
        )}
      </span>
    </span>
  );
}
