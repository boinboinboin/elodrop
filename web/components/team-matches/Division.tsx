// One division in a season (/team-matches/2025-26/eliteserien-2025-2026; pipeline/team-matches.mjs):
// each of its groups (the regular season, the playoffs) with its official standings, its power
// ranking and its team matches, round by round. The season and division dropdowns (components/team-matches/Pickers.tsx) lead to
// the season's other divisions; the team dropdown (TeamFilter.tsx) shows one team's team matches and marks it in the tables.
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import Pickers from "@/components/team-matches/Pickers";
import PowerRanking from "@/components/team-matches/PowerRanking";
import Standings from "@/components/team-matches/Standings";
import { TeamSelect, TeamTies } from "@/components/team-matches/TeamFilter";
import TieRow from "@/components/team-matches/TieRow";
import Loading from "@/components/ui/Loading";
import Section from "@/components/ui/Section";
import { getClubMap } from "@/data/sanity";
import { getTeamDivision, getTeamMatchesIndex, isJuniorAgeGroup, NATIONAL } from "@/data/teamMatches";
import { getI18n } from "@/messages/server";
import { seasonLabel } from "@/utils/format";
import { seasonSlug, teamMatchesHref } from "@/utils/hrefs";

/** A season ("2025-26") as its first year, or null */
export const parseSeason = (slug: string): number | null => {
  const m = slug.match(/^(\d{4})-(\d{2})$/);
  return m && (+m[1] + 1) % 100 === +m[2] ? +m[1] : null;
};

export default async function Division({ params }: { params: Promise<{ period: string; division: string }> }) {
  const { t } = await getI18n();
  return (
    <Suspense fallback={<Loading label={t("teamMatches.division.loading")} section />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: Promise<{ period: string; division: string }> }) {
  const { date, plural, t } = await getI18n();
  const { period, division: slug } = await params;
  const season = parseSeason(period);
  if (season === null) notFound();
  const [division, clubs, index] = await Promise.all([getTeamDivision(season, slug), getClubMap(), getTeamMatchesIndex()]);
  if (!division) notFound();
  const ties = division.groups.reduce((n, g) => n + g.ties.length, 0);
  const junior = isJuniorAgeGroup(division.ageGroup);
  const seasonEntry = index?.seasons.find((s) => s.season === season);
  // The division's teams, in its groups' standings, power rankings and team matches, by name
  const teams = [
    ...new Set(division.groups.flatMap((g) => [...(g.standings ?? []).map((row) => row.team), ...(g.power?.teams ?? []).map((row) => row.team), ...g.ties.flatMap((tie) => [tie.home, tie.away])])),
  ].sort((a, b) => a.localeCompare(b, "nb"));

  return (
    <>
      <Section>
        <Breadcrumbs
          trail={[
            { label: t("teamMatches.breadcrumb"), href: teamMatchesHref() },
            // A junior division's season is among the juniors'
            ...(junior ? [{ label: t("teamMatches.juniorsCrumb"), href: teamMatchesHref(null, true) }] : []),
            { label: seasonLabel(season, true), href: teamMatchesHref(seasonSlug(season), junior) },
            { label: division.division },
          ]}
        />
        <h1 className="h1 mt-4 [overflow-wrap:anywhere]">{division.division}</h1>
        <p className="text-2xl text-gray-700 mt-2">
          {[division.region === NATIONAL ? t("teamMatches.divisions.national") : division.region, division.ageGroup !== "SEN" ? division.ageGroup : null, seasonLabel(season, true)].filter(Boolean).join(" · ")}
        </p>
        <p className="text-gray-600 mt-2">{plural("teamMatches.count", ties)}</p>
        {index && seasonEntry && (
          <div className="mt-8">
            <Pickers seasons={index.seasons} season={seasonEntry} division={slug} junior={junior}>
              {teams.length > 1 && <TeamSelect teams={teams} highlight className="w-full sm:w-64" />}
            </Pickers>
          </div>
        )}
      </Section>
      {division.groups.map((group) => {
        // The group's team matches by day: a round each
        const rounds = Map.groupBy(group.ties, (tie) => tie.day);
        return (
          <Section key={group.group} title={division.groups.length > 1 ? group.group : undefined}>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start">
              {/* The standings, then the power ranking to compare them with */}
              <div className="grid gap-8">
                {group.standings && <Standings standings={group.standings} clubs={clubs} />}
                {group.power && <PowerRanking power={group.power} clubs={clubs} />}
              </div>
              <TeamTies
                teams={teams}
                className="grid gap-6"
                sections={[...rounds].map(([day, list]) => ({
                  key: day,
                  heading: <h3 className="text-lg mb-2">{date(day)}</h3>,
                  ties: list.map((tie) => ({ id: tie.matchId, teams: [tie.home, tie.away], node: <TieRow tie={tie} clubs={clubs} /> })),
                }))}
              />
            </div>
          </Section>
        );
      })}
    </>
  );
}
