// The team match pages' dropdowns (components/team-matches/TeamMatches.tsx, Division.tsx): a season,
// then one of its divisions, listed by region (the national ones first), or all of them (the season's
// page). Senior or junior: each lists only the age's seasons and divisions. `children`: more dropdowns in
// the row (a division's teams).
import type { ReactNode } from "react";
import LinkSelect from "@/components/ui/LinkSelect";
import { isJuniorAgeGroup, NATIONAL, seasonWeeks } from "@/data/teamMatches";
import { getI18n } from "@/messages/server";
import type { TeamMatchesIndex } from "@/types";
import { seasonLabel } from "@/utils/format";
import { seasonSlug, teamDivisionHref, teamMatchesHref } from "@/utils/hrefs";

type Season = TeamMatchesIndex["seasons"][number];

/** The seasons and the season's divisions; division: the current one's slug, or null on the season's (or a weekend's) page */
export default async function Pickers({
  seasons,
  season,
  division,
  junior,
  children,
}: {
  seasons: Season[];
  season: Season;
  division: string | null;
  junior: boolean;
  children?: ReactNode;
}) {
  const { t } = await getI18n();
  // In the data's order (Eliteserien first, then by level), grouped by region so the national one leads
  const divisions = [...Map.groupBy(season.divisions?.filter((d) => isJuniorAgeGroup(d.ageGroup) === junior) ?? [], (d) => d.region).values()].flat();
  return (
    <div className="flex flex-wrap gap-4">
      <LinkSelect
        label={t("teamMatches.season")}
        current={String(season.season)}
        options={seasons
          .filter((s) => seasonWeeks(s, junior).length)
          .map((s) => ({ key: String(s.season), href: teamMatchesHref(seasonSlug(s.season), junior), label: seasonLabel(s.season, true) }))}
        className="w-32"
      />
      {/* (Data from before the divisions has none: the code can be deployed before the next data run) */}
      {!!divisions.length && (
        <LinkSelect
          label={t("teamMatches.divisions.select")}
          current={division ?? ""}
          options={[
            { key: "", href: teamMatchesHref(seasonSlug(season.season), junior), label: t("teamMatches.allDivisions") },
            ...divisions.map((d) => ({
              key: d.slug,
              href: teamDivisionHref(season.season, d.slug),
              // A junior division's age group, unless its name has it ("U15 Vest")
              label: d.ageGroup === "SEN" || d.division.includes(d.ageGroup) ? d.division : `${d.division} · ${d.ageGroup}`,
              group: d.region === NATIONAL ? t("teamMatches.divisions.national") : d.region,
            })),
          ]}
          className="w-full sm:w-80"
        />
      )}
      {children}
    </div>
  );
}
