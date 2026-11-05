// League team matches (pipeline/team-matches.mjs), by season: /team-matches shows the newest season and
// /team-matches/<season> ("2025-26") another, each with its divisions by region (each division's page
// has its team matches and power rankings, components/team-matches/Division.tsx) and its newest
// weekend's team matches; /team-matches/<Monday> shows one weekend's team matches, grouped by division
// and group (app/(site)/team-matches/[period]). A dropdown picks the season and one of its divisions
// (components/team-matches/Pickers.tsx). Each team match links to its own page. Senior and
// junior (U13 to U19) team matches are apart: the same pages under /team-matches/junior have the
// juniors', with a toggle between them (to the same season or weekend where the other has it).
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { ArrowRight } from "@/components/SVG";
import Pickers from "@/components/team-matches/Pickers";
import TieRow from "@/components/team-matches/TieRow";
import Link from "@/components/ui/Link";
import LinkTabs from "@/components/ui/LinkTabs";
import Section from "@/components/ui/Section";
import { getClubMap } from "@/data/sanity";
import { getTeamMatchesIndex, getTeamMatchWeek, isJuniorAgeGroup, NATIONAL, seasonWeeks } from "@/data/teamMatches";
import { getI18n } from "@/messages/server";
import type { TeamDivisionEntry, TeamMatchesIndex, TeamMatchesWeekEntry } from "@/types";
import { seasonLabel } from "@/utils/format";
import { seasonSlug, teamDivisionHref, teamMatchesHref } from "@/utils/hrefs";
import { pageMetadata } from "@/utils/metadata";

type Season = TeamMatchesIndex["seasons"][number];

/** A week's Monday ("2025-11-10"), not a season */
const isWeek = (period: string) => /^\d{4}-\d{2}-\d{2}$/.test(period);

/** The page for a period: null for the newest season, a season ("2025-26") or a week's Monday; senior or junior team matches */
export default async function TeamMatches({ period, junior = false }: { period: Promise<string | null>; junior?: boolean }) {
  const { blocks, t } = await getI18n();
  return (
    <>
      <Section>
        <Breadcrumbs trail={junior ? [{ label: t("teamMatches.breadcrumb"), href: teamMatchesHref() }, { label: t("teamMatches.juniorsCrumb") }] : [{ label: t("teamMatches.breadcrumb") }]} />
        <h1 className="h1 mt-4">{t(junior ? "teamMatches.juniorTitle" : "teamMatches.title")}</h1>
        <p className="text-2xl max-w-3xl mt-2">{t("teamMatches.intro")}</p>
        <div className="max-w-3xl mt-4 space-y-3 text-gray-700 [&_strong]:font-semibold">{blocks("teamMatches.explanation")}</div>
      </Section>
      {/* No Suspense around the content: it is then part of the first paint, not a loading text swapped for it */}
      <Content period={period} junior={junior} />
    </>
  );
}

/** The page's title and description: the senior or junior team matches, of a season or week, or the newest */
export async function teamMatchesMetadata(period: string | null, junior: boolean): Promise<Metadata> {
  const i18n = await getI18n();
  const { t, dateRange } = i18n;
  const kind = junior ? "Junior" : "";
  if (!period) return pageMetadata(i18n, { title: t(`teamMatches.metadata.title${kind}`), description: t(`seo.descriptions.teamMatches${kind}`), path: teamMatchesHref(null, junior) });
  const index = await getTeamMatchesIndex();
  const bySeason = index?.seasons.find((s) => seasonSlug(s.season) === period);
  if (bySeason) {
    const season = seasonLabel(bySeason.season, true);
    return pageMetadata(i18n, { title: t(`teamMatches.metadata.season${kind}`, { season }), description: t(`seo.descriptions.teamMatchesSeason${kind}`, { season }), path: teamMatchesHref(period, junior) });
  }
  const week = index?.seasons.flatMap((s) => seasonWeeks(s, junior)).find((w) => w.week === period);
  if (!week) return { title: t(`teamMatches.metadata.title${kind}`) };
  const days = dateRange(week.from, week.to);
  return pageMetadata(i18n, { title: t(`teamMatches.metadata.week${kind}`, { week: days }), description: t(`seo.descriptions.teamMatchesWeek${kind}`, { week: days }), path: teamMatchesHref(period, junior) });
}

/** The seasons with senior or junior team matches, prerendered: the period of each */
export async function teamMatchesSeasonParams(junior: boolean) {
  const seasons = ((await getTeamMatchesIndex())?.seasons ?? []).filter((s) => seasonWeeks(s, junior).length);
  return seasons.length ? seasons.map((s) => ({ period: seasonSlug(s.season) })) : [{ period: "0" }];
}

/** The season and week of a period among the senior or junior team matches (week: the season's newest without one), or null */
function find(seasons: Season[], period: string | null, junior: boolean): { season: Season; week: TeamMatchesWeekEntry } | null {
  const list = seasons.filter((s) => seasonWeeks(s, junior).length);
  const season = !period ? list[0] : isWeek(period) ? list.find((s) => seasonWeeks(s, junior).some((w) => w.week === period)) : list.find((s) => seasonSlug(s.season) === period);
  const weeks = season ? seasonWeeks(season, junior) : [];
  const week = period && isWeek(period) ? weeks.find((w) => w.week === period) : weeks.at(-1);
  return season && week ? { season, week } : null;
}

/** Seniors or juniors: the other's link goes to the same weekend or season where it has one, else to its newest */
async function AgeTabs({ seasons, period, junior }: { seasons: Season[]; period: string | null; junior: boolean }) {
  const { t } = await getI18n();
  const href = (juniors: boolean) => {
    if (juniors === junior || !period) return teamMatchesHref(period, juniors);
    if (find(seasons, period, juniors)) return teamMatchesHref(period, juniors);
    // A weekend the other doesn't have: its season, if it has that
    const season = isWeek(period) ? find(seasons, period, junior)?.season : null;
    return teamMatchesHref(season && find(seasons, seasonSlug(season.season), juniors) ? seasonSlug(season.season) : null, juniors);
  };
  return (
    <LinkTabs
      label={t("teamMatches.ages")}
      current={junior ? "junior" : "senior"}
      size="sm"
      className="flex flex-wrap gap-2 mb-6"
      tabs={[
        { key: "senior", href: href(false), label: t("teamMatches.seniors") },
        { key: "junior", href: href(true), label: t("teamMatches.juniors") },
      ]}
    />
  );
}

async function Content({ period: periodPromise, junior }: { period: Promise<string | null>; junior: boolean }) {
  const { dateRange, href, plural, t } = await getI18n();
  const [period, index, clubs] = await Promise.all([periodPromise, getTeamMatchesIndex(), getClubMap()]);
  if (!index?.latest) return <p className="base-container px-4 text-gray-600">{t("teamMatches.none")}</p>;
  const tabs = <AgeTabs seasons={index.seasons} period={period} junior={junior} />;
  // The season, and the week: a week's page, or a season's newest weekend. A weekend or season with
  // only the other's team matches (an older link) goes to the other's page
  const found = find(index.seasons, period, junior);
  if (!found) {
    if (!period)
      return (
        <Section>
          {tabs}
          <p className="text-gray-600">{t("teamMatches.noneOfAge")}</p>
        </Section>
      );
    // (In the page's language: a redirect isn't a Link, which adds it)
    if (find(index.seasons, period, !junior)) redirect(href(teamMatchesHref(period, !junior)));
    notFound();
  }
  const { season, week } = found;
  const byWeek = !!period && isWeek(period);
  const current = week.week === index.latest.week ? index.latest : await getTeamMatchWeek(week.week);
  if (!current) notFound();
  // The week's senior or junior team matches by division and group, in the data's order (Eliteserien first)
  const groups = Map.groupBy(
    current.ties.filter((tie) => isJuniorAgeGroup(tie.ageGroup) === junior),
    (tie) => `${tie.division} · ${tie.group}`,
  );
  const divisions = season.divisions?.filter((d) => isJuniorAgeGroup(d.ageGroup) === junior);

  return (
    <>
      <Section>
        {tabs}
        <Pickers seasons={index.seasons} season={season} division={null} junior={junior} />
        {/* (Data from before the divisions has none: the code can be deployed before the next data run) */}
        {!byWeek && !!divisions?.length && <Divisions season={season.season} divisions={divisions} />}
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
              {/* The group's heading links to its division: all its team matches and its power ranking. It
                  sticks to the top of the page while scrolling through the group's team matches, on the
                  page's background, until the next group's pushes it off */}
              <h3 className="sticky top-0 z-10 -mx-4 px-4 py-2 mb-2 bg-stone-100 border-b border-gray-300 text-xl">
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
