// The newest week's team matches (components/team-matches/TeamMatches.tsx); other weeks and years are at /team-matches/<period>.
import type { Metadata } from "next";
import TeamMatches from "@/components/team-matches/TeamMatches";
import { getI18n } from "@/messages/server";
import { teamMatchesHref } from "@/utils/hrefs";
import { pageMetadata } from "@/utils/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const i18n = await getI18n();
  const { t } = i18n;
  return pageMetadata(i18n, { title: t("teamMatches.metadata.title"), description: t("seo.descriptions.teamMatches"), path: teamMatchesHref() });
}

export default function TeamMatchesPage() {
  return <TeamMatches period={Promise.resolve(null)} />;
}
