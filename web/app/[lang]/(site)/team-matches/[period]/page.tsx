// One week's team matches (/team-matches/2025-11-10) or a season with its divisions and newest weekend (/team-matches/2025-26).
import type { Metadata } from "next";
import TeamMatches from "@/components/team-matches/TeamMatches";
import { getTeamMatchesIndex } from "@/data/teamMatches";
import { getI18n } from "@/messages/server";
import { seasonLabel } from "@/utils/format";
import { seasonSlug, teamMatchesHref } from "@/utils/hrefs";
import { pageMetadata } from "@/utils/metadata";

// Every season is prerendered; weeks are rendered on their first visit and then cached
export async function generateStaticParams() {
  const seasons = (await getTeamMatchesIndex())?.seasons ?? [];
  return seasons.length ? seasons.map((s) => ({ period: seasonSlug(s.season) })) : [{ period: "0" }];
}

export async function generateMetadata({ params }: PageProps<"/[lang]/team-matches/[period]">): Promise<Metadata> {
  const i18n = await getI18n();
  const { t, dateRange } = i18n;
  const { period } = await params;
  const index = await getTeamMatchesIndex();
  const bySeason = index?.seasons.find((s) => seasonSlug(s.season) === period);
  if (bySeason) {
    const season = seasonLabel(bySeason.season, true);
    return pageMetadata(i18n, { title: t("teamMatches.metadata.season", { season }), description: t("seo.descriptions.teamMatchesSeason", { season }), path: teamMatchesHref(period) });
  }
  const week = index?.seasons.flatMap((s) => s.weeks).find((w) => w.week === period);
  if (!week) return { title: t("teamMatches.metadata.title") };
  const days = dateRange(week.from, week.to);
  return pageMetadata(i18n, { title: t("teamMatches.metadata.week", { week: days }), description: t("seo.descriptions.teamMatchesWeek", { week: days }), path: teamMatchesHref(period) });
}

export default function TeamMatchPeriodPage(props: PageProps<"/[lang]/team-matches/[period]">) {
  return <TeamMatches period={props.params.then((p) => p.period)} />;
}
