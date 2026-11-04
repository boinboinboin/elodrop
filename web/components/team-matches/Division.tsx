// One division in a season (/team-matches/2025-26/eliteserien-2025-2026; pipeline/team-matches.mjs):
// each of its groups (the regular season, the playoffs) with its power ranking and its team matches,
// round by round.
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PowerRanking from "@/components/team-matches/PowerRanking";
import TieRow from "@/components/team-matches/TieRow";
import Loading from "@/components/ui/Loading";
import Section from "@/components/ui/Section";
import { getClubMap } from "@/data/sanity";
import { getTeamDivision, isJuniorAgeGroup } from "@/data/teamMatches";
import { getI18n } from "@/messages/server";
import { seasonLabel } from "@/utils/format";
import { seasonSlug, teamMatchesHref } from "@/utils/hrefs";

/** The national divisions' region (Eliteserien, the national finals): shown as "National" */
const NATIONAL = "Norges Badminton Forbund";

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
  const [division, clubs] = await Promise.all([getTeamDivision(season, slug), getClubMap()]);
  if (!division) notFound();
  const ties = division.groups.reduce((n, g) => n + g.ties.length, 0);
  const junior = isJuniorAgeGroup(division.ageGroup);

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
      </Section>
      {division.groups.map((group) => {
        // The group's team matches by day: a round each
        const rounds = Map.groupBy(group.ties, (tie) => tie.day);
        return (
          <Section key={group.group} title={division.groups.length > 1 ? group.group : undefined}>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start">
              {group.power ? <PowerRanking power={group.power} clubs={clubs} /> : <div />}
              <div className="grid gap-6">
                {[...rounds].map(([day, list]) => (
                  <div key={day}>
                    <h3 className="text-lg mb-2">{date(day)}</h3>
                    <ul className="grid gap-2">
                      {list.map((tie) => <TieRow key={tie.matchId} tie={tie} clubs={clubs} />)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        );
      })}
    </>
  );
}
