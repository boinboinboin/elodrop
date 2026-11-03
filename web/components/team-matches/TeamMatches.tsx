// League team matches (pipeline/team-matches.mjs), by season: /team-matches shows the newest season and
// /team-matches/<season> ("2025-26") another, each with its divisions by region (each division's page
// has its team matches and power rankings, components/team-matches/Division.tsx) and its newest
// weekend's team matches; /team-matches/<Monday> shows one weekend's team matches, grouped by division
// and group (app/(site)/team-matches/[period]). Each team match links to its own page.
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { ArrowRight } from "@/components/SVG";
import TieRow from "@/components/team-matches/TieRow";
import Link from "@/components/ui/Link";
import LinkSelect from "@/components/ui/LinkSelect";
import Loading from "@/components/ui/Loading";
import Section from "@/components/ui/Section";
import { getClubMap } from "@/data/sanity";
import { getTeamMatchesIndex, getTeamMatchWeek } from "@/data/teamMatches";
import { getI18n } from "@/messages/server";
import type { TeamDivisionEntry, TeamMatchesIndex } from "@/types";
import { seasonLabel } from "@/utils/format";
import { seasonSlug, teamDivisionHref, teamMatchesHref } from "@/utils/hrefs";

/** The page for a period: null for the newest season, a season ("2025-26") or a week's Monday */
export default async function TeamMatches({ period }: { period: Promise<string | null> }) {
  const { blocks, t } = await getI18n();
  return (
    <>
      <Section>
        <Breadcrumbs trail={[{ label: t("teamMatches.breadcrumb") }]} />
        <h1 className="h1 mt-4">{t("teamMatches.title")}</h1>
        <p className="text-2xl max-w-3xl mt-2">{t("teamMatches.intro")}</p>
        <div className="max-w-3xl mt-4 space-y-3 text-gray-700 [&_strong]:font-semibold">{blocks("teamMatches.explanation")}</div>
      </Section>
      <Suspense fallback={<Loading label={t("teamMatches.loading")} />}>
        <Content period={period} />
      </Suspense>
    </>
  );
}

/** The national divisions' region (Eliteserien, the national finals): shown as "National" */
const NATIONAL = "Norges Badminton Forbund";

async function Content({ period: periodPromise }: { period: Promise<string | null> }) {
  const { dateRange, plural, t } = await getI18n();
  const [period, index, clubs] = await Promise.all([periodPromise, getTeamMatchesIndex(), getClubMap()]);
  if (!index?.latest) return <p className="base-container px-4 text-gray-600">{t("teamMatches.none")}</p>;
  // The season, and the week: a week's page, or a season's newest weekend
  const byWeek = !!period && /^\d{4}-\d{2}-\d{2}$/.test(period);
  const season = !period
    ? index.seasons.find((s) => s.season === index.latest?.season)
    : byWeek
      ? index.seasons.find((s) => s.weeks.some((w) => w.week === period))
      : index.seasons.find((s) => seasonSlug(s.season) === period);
  const week = !season ? undefined : byWeek ? season.weeks.find((w) => w.week === period) : season.weeks.at(-1);
  if (!season || !week) notFound();
  const current = week.week === index.latest.week ? index.latest : await getTeamMatchWeek(week.week);
  if (!current) notFound();
  // The week's team matches by division and group, in the data's order (Eliteserien first)
  const groups = Map.groupBy(current.ties, (tie) => `${tie.division} · ${tie.group}`);

  return (
    <>
      <Section>
        <Pickers index={index} season={season} week={byWeek ? week.week : null} />
        {/* (Data from before the divisions has none: the code can be deployed before the next data run) */}
        {!byWeek && season.divisions?.length > 0 && <Divisions season={season.season} divisions={season.divisions} />}
      </Section>
      <Section>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-6">
          <h2 className="text-3xl">
            {!byWeek && <span className="block text-base text-gray-600 mb-1">{t("teamMatches.latestWeekend")}</span>}
            {dateRange(week.from, week.to, true)}
          </h2>
          <p className="text-gray-600">{plural("teamMatches.count", week.ties)}</p>
        </div>
        <div className="grid gap-8">
          {[...groups].map(([name, ties]) => (
            <div key={name}>
              {/* The group's heading links to its division: all its team matches and its power ranking */}
              <h3 className="text-xl mb-2">
                {ties[0].divisionSlug ? (
                  <Link href={teamDivisionHref(ties[0].season, ties[0].divisionSlug)} className="inline-flex items-center gap-1 hover:text-blue-600">
                    {name} <ArrowRight className="text-base" />
                  </Link>
                ) : (
                  name
                )}
              </h3>
              <ul className="grid gap-2">
                {ties.map((tie) => <TieRow key={tie.matchId} tie={tie} clubs={clubs} />)}
              </ul>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

/** Pick a season (its divisions and newest weekend), then one of its team match weekends */
async function Pickers({ index, season, week }: { index: TeamMatchesIndex; season: TeamMatchesIndex["seasons"][number]; week: string | null }) {
  const { date, plural, t } = await getI18n();
  /** A week's days played, short: "15–16 Nov", "30 Jan – 1 Feb", "4 Oct" */
  const days = (from: string, to: string) =>
    from === to ? date(from, "dayMonth") : from.slice(0, 7) === to.slice(0, 7) ? `${date(from, "dayOnly")}–${date(to, "dayMonth")}` : `${date(from, "dayMonth")} – ${date(to, "dayMonth")}`;
  return (
    <div className="flex flex-wrap gap-4">
      <LinkSelect
        label={t("teamMatches.season")}
        current={String(season.season)}
        options={index.seasons.map((s) => ({ key: String(s.season), href: teamMatchesHref(seasonSlug(s.season)), label: seasonLabel(s.season, true) }))}
        className="w-32"
      />
      <LinkSelect
        label={t("teamMatches.weekend")}
        current={week ?? ""}
        options={[
          { key: "", href: teamMatchesHref(seasonSlug(season.season)), label: t("teamMatches.allDivisions") },
          ...season.weeks.map((w) => ({ key: w.week, href: teamMatchesHref(w.week), label: `${days(w.from, w.to)} · ${plural("teamMatches.count", w.ties)}` })),
        ]}
        className="w-full sm:w-72"
      />
    </div>
  );
}

/** The season's divisions by region (the national ones first), each a link to its page */
async function Divisions({ season, divisions }: { season: number; divisions: TeamDivisionEntry[] }) {
  const { plural, t } = await getI18n();
  // Regions in the divisions' order (Eliteserien first, then by level), so the national one leads
  const regions = Map.groupBy(divisions, (d) => d.region);
  return (
    <div className="mt-8">
      <h2 className="text-3xl mb-1">{t("teamMatches.divisions.title", { season: seasonLabel(season, true) })}</h2>
      <p className="text-gray-600 mb-6 max-w-3xl">{t("teamMatches.divisions.intro")}</p>
      <div className="grid gap-8">
        {[...regions].map(([region, list]) => (
          <div key={region}>
            <h3 className="text-xl mb-2">{region === NATIONAL ? t("teamMatches.divisions.national") : region}</h3>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((d) => (
                <li key={d.slug}>
                  <Link href={teamDivisionHref(season, d.slug)} className="group bg-white p-3 sm:px-4 flex items-center justify-between gap-4 h-full transition-colors duration-200 hover:bg-gray-50">
                    <span className="min-w-0">
                      <span className="block group-hover:text-blue-600">
                        {d.division}
                        {d.ageGroup !== "SEN" && <span className="ml-2 align-[0.07em] font-mono text-xs px-1.5 py-0.5 border border-gray-400 rounded text-gray-700 whitespace-nowrap">{d.ageGroup}</span>}
                      </span>
                      <span className="block text-sm text-gray-600">
                        {plural("teamMatches.divisions.teams", d.teams)} · {plural("teamMatches.count", d.ties)}
                      </span>
                    </span>
                    <ArrowRight className="shrink-0 group-hover:text-blue-600" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
