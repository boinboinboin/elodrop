// Each week's league team matches (pipeline/team-matches.mjs), grouped by division and group:
// /team-matches shows the newest week, /team-matches/<Monday> another week and /team-matches/<year>
// that year's newest (app/(site)/team-matches/[period]). Each team match links to its own page.
import { getISOWeek, parseISO } from "date-fns";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Team from "@/components/clubs/Team";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { ArrowRight } from "@/components/SVG";
import Badge from "@/components/ui/Badge";
import Link from "@/components/ui/Link";
import Loading from "@/components/ui/Loading";
import { WeekArrows, YearLinks } from "@/components/ui/PeriodNav";
import Section from "@/components/ui/Section";
import { getClubMap } from "@/data/sanity";
import { getTeamMatchesIndex, getTeamMatchWeek } from "@/data/teamMatches";
import { getI18n } from "@/messages/server";
import type { ClubEntry, TeamMatchSummary } from "@/types";
import { addDays } from "@/utils/format";
import { teamMatchesHref, teamMatchHref } from "@/utils/hrefs";

/** The page for a period: null for the newest week, a year ("2025") for its newest week, or a week's Monday */
export default async function TeamMatches({ period }: { period: Promise<string | null> }) {
  const { t } = await getI18n();
  return (
    <>
      <Section>
        <Breadcrumbs trail={[{ label: t("teamMatches.breadcrumb") }]} />
        <h1 className="h1 mt-4">{t("teamMatches.title")}</h1>
        <p className="text-2xl max-w-3xl mt-2">{t("teamMatches.intro")}</p>
        <p className="max-w-3xl mt-4 text-gray-700">{t("teamMatches.explanation")}</p>
      </Section>
      <Suspense fallback={<Loading label={t("teamMatches.loading")} />}>
        <Content period={period} />
      </Suspense>
    </>
  );
}

async function Content({ period: periodPromise }: { period: Promise<string | null> }) {
  const { dateRange, t } = await getI18n();
  const [period, index, clubs] = await Promise.all([periodPromise, getTeamMatchesIndex(), getClubMap()]);
  if (!index?.latest) return <p className="base-container px-4 text-gray-600">{t("teamMatches.none")}</p>;
  const { weeks, years } = index;
  // Newest first: a year shows its newest week
  const week = !period ? index.latest.week : /^\d{4}$/.test(period) ? weeks.find((w) => w.startsWith(period)) : weeks.includes(period) ? period : undefined;
  if (!week) notFound();
  const current = week === index.latest.week ? index.latest : await getTeamMatchWeek(week);
  if (!current) notFound();
  const at = weeks.indexOf(week);
  const earlier = weeks[at + 1] ?? null;
  const later = at > 0 ? weeks[at - 1] : null;

  // The week's team matches by division and group, in the data's order (Eliteserien first)
  const groups = Map.groupBy(current.ties, (tie) => `${tie.division} · ${tie.group}`);

  return (
    <>
      <Section>
        <div className="flex flex-wrap items-baseline justify-between gap-4 mb-6">
          <h2 className="text-3xl">
            {t("teamMatches.weekOf", { week: getISOWeek(parseISO(week)) })}{" "}
            <span className="text-xl text-gray-600">{dateRange(week, addDays(week, 6), true)}</span>
          </h2>
          <WeekArrows earlier={earlier && teamMatchesHref(earlier)} later={later && teamMatchesHref(later)} />
        </div>
        <div className="grid gap-8">
          {[...groups].map(([name, ties]) => (
            <div key={name}>
              <h3 className="text-xl mb-2">{name}</h3>
              <ul className="grid gap-2">
                {ties.map((tie) => <Row key={tie.matchId} tie={tie} clubs={clubs} />)}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t("teamMatches.years")}>
        <YearLinks years={years} current={week.slice(0, 4)} href={teamMatchesHref} className="" />
      </Section>
    </>
  );
}

/** One team match: the teams (the winner bold), its score linking to its page, and its upsets */
async function Row({ tie, clubs }: { tie: TeamMatchSummary; clubs: Record<string, ClubEntry> }) {
  const { date, plural, t } = await getI18n();
  return (
    <li className="bg-white p-3 sm:px-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <div className="min-w-0">
        <Team name={tie.home} club={tie.homeClub} clubs={clubs} size={5} className={tie.winner === 1 ? "font-semibold" : ""} />
        <span className="text-gray-500 mx-1">–</span>
        <Team name={tie.away} club={tie.awayClub} clubs={clubs} size={5} className={tie.winner === 2 ? "font-semibold" : ""} />
        <span className="block text-sm text-gray-600">
          {date(tie.day)}
          {tie.upsets > 0 && <> · {plural("teamMatches.matchUpsets", tie.upsets)}</>}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {tie.upset && <Badge className="cursor-help"><span title={t("teamMatches.upsetTitle")}>{t("teamMatches.upset")}</span></Badge>}
        <Link href={teamMatchHref(tie.matchId)} className="inline-flex items-center gap-1 text-xl font-semibold tabular-nums hover:text-blue-600" aria-label={`${tie.home} – ${tie.away} ${tie.score[0]}–${tie.score[1]}`}>
          {tie.score[0]}–{tie.score[1]} <ArrowRight />
        </Link>
      </div>
    </li>
  );
}
