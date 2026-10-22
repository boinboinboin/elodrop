// Each week's biggest upsets (pipeline/rate.mjs): the newest week's top 10, and the biggest upset of
// every week of its year. /upsets/<Monday> shows another week and /upsets/<year> that year's newest
// (app/(site)/upsets/[period]); each is a static page.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ClubLogo } from "@/components/clubs/Team";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { ArrowLeft, ArrowRight } from "@/components/SVG";
import Carousel from "@/components/ui/Carousel";
import Loading from "@/components/ui/Loading";
import Section from "@/components/ui/Section";
import { ROW, toggleClass } from "@/components/ui/styles";
import UpsetCard from "@/components/upsets/UpsetCard";
import { getClubMap } from "@/data/sanity";
import { getUpsetYear, getUpsetsIndex } from "@/data/upsets";
import { rich, t } from "@/messages/i18n";
import type { ClubEntry, UpsetPlayer, UpsetWeek } from "@/types";
import { addDays, date, dateRange, pct, signed, toneClass } from "@/utils/format";
import { playerHref, upsetsHref } from "@/utils/hrefs";
import { POOLS } from "@/utils/pools";

/** The page for a period: null for the newest week, a year ("2019") for its newest week, or a week's Monday */
export default function Upsets({ period }: { period: Promise<string | null> }) {
  return (
    <>
      <Section>
        <Breadcrumbs trail={[{ label: t("upsets.breadcrumb") }]} />
        <h1 className="h1 mt-4">{t("upsets.title")}</h1>
        <p className="text-2xl max-w-3xl mt-2">{t("upsets.intro")}</p>
        <p className="max-w-3xl mt-4 text-gray-700">{t("upsets.explanation")}</p>
      </Section>
      <Suspense fallback={<Loading label={t("upsets.loading")} />}>
        <Content period={period} />
      </Suspense>
    </>
  );
}

const withLabels = (w: UpsetWeek): UpsetWeek => ({ ...w, matches: w.matches.map((m) => ({ ...m, poolLabel: POOLS[m.pool] })) });

async function Content({ period: periodPromise }: { period: Promise<string | null> }) {
  const [period, index, clubs] = await Promise.all([periodPromise, getUpsetsIndex(), getClubMap()]);
  if (!index?.latest) return <p className="base-container px-4 text-gray-600">{t("upsets.none")}</p>;
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
  const weekOf = dateRange(current.week, addDays(current.week, 6), true);

  return (
    <>
      <Section>
        <div className="flex flex-wrap items-baseline justify-between gap-4 mb-6">
          <h2 className="text-3xl">{t("upsets.weekOf", { week: weekOf })}</h2>
          <nav className="flex gap-2" aria-label={t("upsets.weeks")}>
            {earlier && <Link href={upsetsHref(earlier.week)} className={toggleClass(false)}><ArrowLeft /> {t("upsets.earlier")}</Link>}
            {later && <Link href={upsetsHref(later.week)} className={toggleClass(false)}>{t("upsets.later")} <ArrowRight /></Link>}
          </nav>
        </div>
        {/* The week's top 10 as a carousel: 1 card at a time on phones, 2 on tablets, 3 on desktop */}
        <Carousel label={t("upsets.carousel", { week: weekOf })} slides={current.matches.map((u, i) => <UpsetCard key={i} upset={u} rank={i + 1} clubs={clubs} />)} />
      </Section>

      <Section title={t("upsets.eachWeek")}>
        <nav className="flex flex-wrap gap-2 mb-6" aria-label={t("upsets.year")}>
          {years.map((y) => (
            <Link
              key={y}
              href={upsetsHref(y)}
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
                <th scope="col" className="py-2 pl-2 pr-1 sm:px-4 font-normal">{t("upsets.table.week")}</th>
                <th scope="col" className="py-2 px-2 sm:px-4 font-normal">{t("upsets.table.upset")}</th>
                <th scope="col" className="hidden sm:table-cell py-2 px-4 font-normal text-right" title={t("upsets.table.chanceTitle")}>{t("upsets.table.chance")}</th>
              </tr>
            </thead>
            <tbody>
              {yearWeeks.map((w) => {
                const u = w.matches[0];
                const chanceText = pct(u.winChance);
                return (
                  <tr key={w.week} className={`${ROW} align-top ${w.week === current.week ? "bg-gray-50" : ""}`}>
                    <td className="py-2 pl-2 pr-1 sm:px-4 whitespace-nowrap"><Link href={upsetsHref(w.week)} className="hover:text-blue-600">{date(w.week, "dayMonth")}</Link></td>
                    {/* One player per line, "beat" between the sides; on phones the chance under the event */}
                    <td className="py-2 px-2 sm:px-4 max-sm:[overflow-wrap:anywhere]">
                      {u.winners.map((p) => <UpsetName key={p.id} p={p} clubs={clubs} bold />)}
                      <span className="block text-sm text-gray-600">{t("upsets.table.beat")}</span>
                      {u.losers.map((p) => <UpsetName key={p.id} p={p} clubs={clubs} />)}
                      <span className="block mt-1 text-sm text-gray-600">{u.score} · {POOLS[u.pool]} · {u.event}</span>
                      <span className="sm:hidden block text-sm text-gray-600 tabular-nums">{rich("upsets.table.chanceOnPhones", { strong: (text) => <strong className="text-gray-900">{text}</strong> }, { chance: chanceText })}</span>
                    </td>
                    <td className="hidden sm:table-cell py-2 px-4 text-right tabular-nums">{chanceText}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
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
        <Link href={playerHref(p.id)} className={`${bold ? "font-semibold" : ""} hover:text-blue-600`}>{p.name}</Link>
      </span>
      <span className="text-sm whitespace-nowrap">
        {p.club && <span className="text-gray-500">{p.club}</span>}
        {p.change !== undefined && (
          <span className={`tabular-nums ${p.club ? "ml-1.5 " : ""}${toneClass(p.change)}`} title={t(p.change >= 0 ? "upsets.ratingGained" : "upsets.ratingLost")}>
            {signed(p.change, 1, "+")}
          </span>
        )}
      </span>
    </span>
  );
}
