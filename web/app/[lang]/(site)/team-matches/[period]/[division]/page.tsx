// A division in a season (components/team-matches/Division.tsx): /team-matches/2025-26/1-divisjon
import type { Metadata } from "next";
import Division, { parseSeason } from "@/components/team-matches/Division";
import { getTeamDivision, getTeamMatchesIndex } from "@/data/teamMatches";
import { getI18n } from "@/messages/server";
import { seasonLabel } from "@/utils/format";
import { seasonSlug, teamDivisionHref } from "@/utils/hrefs";
import { pageMetadata } from "@/utils/metadata";

// The newest season's divisions are prerendered; the others are rendered on their first visit and
// then cached. A week's page (the parent's other addresses) has no divisions: a placeholder.
export async function generateStaticParams({ params }: { params: { period: string } }) {
  const index = await getTeamMatchesIndex();
  const newest = index?.seasons[0];
  const divisions = newest && params.period === seasonSlug(newest.season) ? (newest.divisions ?? []) : [];
  return divisions.length ? divisions.map((d) => ({ division: d.slug })) : [{ division: "0" }];
}

export async function generateMetadata({ params }: PageProps<"/[lang]/team-matches/[period]/[division]">): Promise<Metadata> {
  const i18n = await getI18n();
  const { t } = i18n;
  const { period, division: slug } = await params;
  const season = parseSeason(period);
  const division = season === null ? null : await getTeamDivision(season, slug);
  if (season === null || !division) return { title: t("teamMatches.metadata.title") };
  const values = { division: division.division, season: seasonLabel(season, true) };
  return pageMetadata(i18n, { title: t("teamMatches.metadata.division", values), description: t("seo.descriptions.teamMatchesDivision", values), path: teamDivisionHref(season, slug) });
}

export default function TeamDivisionPage(props: PageProps<"/[lang]/team-matches/[period]/[division]">) {
  return <Division params={props.params} />;
}
