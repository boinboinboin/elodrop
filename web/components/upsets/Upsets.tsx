// Each week's biggest upsets (pipeline/rate.mjs): the newest week's top 10, and the biggest upset of
// every week of its year. /upsets/<Monday> shows another week and /upsets/<year> that year's newest
// (app/(site)/upsets/[period]); each is a static page.
import { getISOWeek, parseISO } from "date-fns";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PlayerLine from "@/components/players/PlayerLine";
import Carousel from "@/components/ui/Carousel";
import Link from "@/components/ui/Link";
import Loading from "@/components/ui/Loading";
import { WeekArrows, YearLinks } from "@/components/ui/PeriodNav";
import Section from "@/components/ui/Section";
import { ROW } from "@/components/ui/styles";
import UpsetCard from "@/components/upsets/UpsetCard";
import { getClubMap } from "@/data/sanity";
import { getUpsetYear, getUpsetsIndex } from "@/data/upsets";
import type { I18n } from "@/messages/i18n";
import { getI18n } from "@/messages/server";
import type { UpsetWeek } from "@/types";
import { addDays } from "@/utils/format";
import { upsetsHref } from "@/utils/hrefs";

/** The page for a period: null for the newest week, a year ("2019") for its newest week, or a week's Monday */
export default async function Upsets({ period }: { period: Promise<string | null> }) {
  const { blocks, t } = await getI18n();
  return (
    <>
      <Section>
        <Breadcrumbs trail={[{ label: t("upsets.breadcrumb") }]} />
        <h1 className="h1 mt-4">{t("upsets.title")}</h1>
        <p className="text-2xl max-w-3xl mt-2">{t("upsets.intro")}</p>
        <div className="max-w-3xl mt-4 space-y-3 text-gray-700">{blocks("upsets.explanation")}</div>
      </Section>
      <Suspense fallback={<Loading label={t("upsets.loading")} />}>
        <Content period={period} />
      </Suspense>
    </>
  );
}

const withLabels = (w: UpsetWeek, pools: I18n["pools"]): UpsetWeek => ({ ...w, matches: w.matches.map((m) => ({ ...m, poolLabel: pools[m.pool] })) });

async function Content({ period: periodPromise }: { period: Promise<string | null> }) {
  const { dateRange, pct, pools, rich, t } = await getI18n();
  const [period, index, clubs] = await Promise.all([periodPromise, getUpsetsIndex(), getClubMap()]);
  if (!index?.latest) return <p className="base-container px-4 text-gray-600">{t("upsets.none")}</p>;
  const years = index.years;
  const weekYear = period ? period.slice(0, 4) : index.latest.week.slice(0, 4);
  if (period && (!/^\d{4}(-\d{2}-\d{2})?$/.test(period) || !years.includes(weekYear))) notFound();
  const weeks = await getUpsetYear(weekYear);
  // Newest first: a year shows its newest week
  const found = !period ? index.latest : period.length === 4 ? weeks[0] : weeks.find((w) => w.week === period);
  if (!found) notFound();
  const current = withLabels(found, pools);

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
          <WeekArrows earlier={earlier && upsetsHref(earlier.week)} later={later && upsetsHref(later.week)} />
        </div>
        {/* The week's top 10 as a carousel: 1 card at a time on phones, 2 on tablets, 3 on desktop */}
        <Carousel label={t("upsets.carousel", { week: weekOf })} slides={current.matches.map((u, i) => <UpsetCard key={i} upset={u} rank={i + 1} clubs={clubs} />)} />
      </Section>

      <Section title={t("upsets.eachWeek")}>
        <YearLinks years={years} current={year} href={upsetsHref} />
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
                    <td className="py-2 pl-2 pr-1 sm:px-4 whitespace-nowrap">{/* The ISO week number, "Week 41" (W41 on phones), the week's days on hover */}
                      <Link href={upsetsHref(w.week)} className="hover:text-blue-600 tabular-nums" title={dateRange(w.week, addDays(w.week, 6))}>
                        <span className="sm:hidden">{t("upsets.table.weekShort", { week: getISOWeek(parseISO(w.week)) })}</span>
                        <span className="max-sm:hidden">{t("upsets.table.weekNumber", { week: getISOWeek(parseISO(w.week)) })}</span>
                      </Link></td>
                    {/* One player per line, "beat" between the sides; on phones the chance under the event */}
                    <td className="py-2 px-2 sm:px-4 max-sm:[overflow-wrap:anywhere]">
                      {u.winners.map((p) => <PlayerLine key={p.id} p={p} clubs={clubs} bold pool={u.pool} />)}
                      <span className="block text-sm text-gray-600">{t("upsets.table.beat")}</span>
                      {u.losers.map((p) => <PlayerLine key={p.id} p={p} clubs={clubs} pool={u.pool} />)}
                      <span className="block mt-1 text-sm text-gray-600">{u.score} · {pools[u.pool]} · {u.event}</span>
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
