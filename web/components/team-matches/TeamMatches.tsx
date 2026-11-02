// Each week's league team matches (pipeline/team-matches.mjs), grouped by division and group, picked
// by season and then by week (a season has a handful of team match weekends): /team-matches shows the
// newest week, /team-matches/<Monday> another week and /team-matches/<season> ("2025-26") that
// season's newest (app/(site)/team-matches/[period]). Each team match links to its own page.
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Team from "@/components/clubs/Team";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { ArrowRight } from "@/components/SVG";
import Badge from "@/components/ui/Badge";
import Link from "@/components/ui/Link";
import Loading from "@/components/ui/Loading";
import LinkSelect from "@/components/ui/LinkSelect";
import Section from "@/components/ui/Section";
import { getClubMap } from "@/data/sanity";
import { getTeamMatchesIndex, getTeamMatchWeek } from "@/data/teamMatches";
import { getI18n } from "@/messages/server";
import type { ClubEntry, TeamMatchSummary } from "@/types";
import { seasonLabel } from "@/utils/format";
import { seasonSlug, teamMatchesHref, teamMatchHref } from "@/utils/hrefs";

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
  const { date, dateRange, plural, t } = await getI18n();
  const [period, index, clubs] = await Promise.all([periodPromise, getTeamMatchesIndex(), getClubMap()]);
  if (!index?.latest) return <p className="base-container px-4 text-gray-600">{t("teamMatches.none")}</p>;
  // The season and week: the newest week, a season's newest or a week
  const season = !period
    ? index.seasons.find((s) => s.season === index.latest?.season)
    : /^\d{4}-\d{2}$/.test(period)
      ? index.seasons.find((s) => seasonSlug(s.season) === period)
      : index.seasons.find((s) => s.weeks.some((w) => w.week === period));
  const week = !season ? undefined : !period || period.length === 7 ? season.weeks.at(-1) : season.weeks.find((w) => w.week === period);
  if (!season || !week) notFound();
  const current = week.week === index.latest.week ? index.latest : await getTeamMatchWeek(week.week);
  if (!current) notFound();

  /** A week's days played, short: "15–16 Nov", "30 Jan – 1 Feb", "4 Oct" */
  const days = (from: string, to: string) =>
    from === to ? date(from, "dayMonth") : from.slice(0, 7) === to.slice(0, 7) ? `${date(from, "dayOnly")}–${date(to, "dayMonth")}` : `${date(from, "dayMonth")} – ${date(to, "dayMonth")}`;
  // The week's team matches by division and group, in the data's order (Eliteserien first)
  const groups = Map.groupBy(current.ties, (tie) => `${tie.division} · ${tie.group}`);

  return (
    <Section>
      {/* Pick a season, then one of its team match weekends */}
      <div className="flex flex-wrap gap-4">
        <LinkSelect
          label={t("teamMatches.season")}
          current={String(season.season)}
          options={index.seasons.map((s) => ({ key: String(s.season), href: teamMatchesHref(seasonSlug(s.season)), label: seasonLabel(s.season, true) }))}
          className="w-32"
        />
        <LinkSelect
          label={t("teamMatches.weekend")}
          current={week.week}
          options={season.weeks.map((w) => ({ key: w.week, href: teamMatchesHref(w.week), label: `${days(w.from, w.to)} · ${plural("teamMatches.count", w.ties)}` }))}
          className="w-full sm:w-72"
        />
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mt-8 mb-6">
        <h2 className="text-3xl">{dateRange(week.from, week.to, true)}</h2>
        <p className="text-gray-600">{plural("teamMatches.count", week.ties)}</p>
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
  );
}

/** One team match, the whole box a link to its page: the teams (the winner bold), the day and its upsets, and the score */
async function Row({ tie, clubs }: { tie: TeamMatchSummary; clubs: Record<string, ClubEntry> }) {
  const { date, plural, t } = await getI18n();
  return (
    <li>
      <Link
        href={teamMatchHref(tie.matchId)}
        className="group bg-white p-3 sm:px-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 transition-colors duration-200 hover:bg-gray-50"
      >
        <span className="min-w-0">
          <Team name={tie.home} club={tie.homeClub} clubs={clubs} size={5} linked={false} className={tie.winner === 1 ? "font-semibold" : ""} />
          <span className="text-gray-500 mx-1">–</span>
          <Team name={tie.away} club={tie.awayClub} clubs={clubs} size={5} linked={false} className={tie.winner === 2 ? "font-semibold" : ""} />
          <span className="block text-sm text-gray-600">
            {date(tie.day, "dayMonth")}
            {tie.upsets > 0 && <> · {plural("teamMatches.matchUpsets", tie.upsets)}</>}
          </span>
          {/* On phones the upset label goes under the teams, so the score keeps its place on the right */}
          {tie.upset && <span className="sm:hidden block mt-1" title={t("teamMatches.upsetTitle")}><Badge>{t("teamMatches.upset")}</Badge></span>}
        </span>
        <span className="flex items-center gap-3">
          {tie.upset && <span className="hidden sm:inline" title={t("teamMatches.upsetTitle")}><Badge>{t("teamMatches.upset")}</Badge></span>}
          <span className="inline-flex items-center gap-1 text-xl font-semibold tabular-nums group-hover:text-blue-600">
            {tie.score[0]}–{tie.score[1]} <ArrowRight />
          </span>
        </span>
      </Link>
    </li>
  );
}
