// One week's team matches (/team-matches/2025-11-10) or a year's newest week (/team-matches/2025).
import { getISOWeek, getISOWeekYear, parseISO } from "date-fns";
import type { Metadata } from "next";
import TeamMatches from "@/components/team-matches/TeamMatches";
import { getTeamMatchesIndex } from "@/data/teamMatches";
import { getI18n } from "@/messages/server";
import { teamMatchesHref } from "@/utils/hrefs";
import { pageMetadata } from "@/utils/metadata";

// Every year is prerendered; weeks are rendered on their first visit and then cached
export async function generateStaticParams() {
  const years = (await getTeamMatchesIndex())?.years ?? [];
  return years.length ? years.map((period) => ({ period })) : [{ period: "0" }];
}

export async function generateMetadata({ params }: PageProps<"/[lang]/team-matches/[period]">): Promise<Metadata> {
  const i18n = await getI18n();
  const { t } = i18n;
  const { period } = await params;
  if (/^\d{4}$/.test(period)) return pageMetadata(i18n, { title: t("teamMatches.metadata.year", { year: period }), description: t("seo.descriptions.teamMatchesYear", { year: period }), path: teamMatchesHref(period) });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(period)) return { title: t("teamMatches.metadata.title") };
  const week = `${getISOWeek(parseISO(period))}, ${getISOWeekYear(parseISO(period))}`;
  return pageMetadata(i18n, { title: t("teamMatches.metadata.week", { week }), description: t("seo.descriptions.teamMatchesWeek", { week }), path: teamMatchesHref(period) });
}

export default function TeamMatchPeriodPage(props: PageProps<"/[lang]/team-matches/[period]">) {
  return <TeamMatches period={props.params.then((p) => p.period)} />;
}
