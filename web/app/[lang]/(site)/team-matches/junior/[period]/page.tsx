// One week's junior team matches (/team-matches/junior/2025-11-10) or a season with its junior divisions and newest
// weekend (/team-matches/junior/2025-26).
import type { Metadata } from "next";
import TeamMatches, { teamMatchesMetadata, teamMatchesSeasonParams } from "@/components/team-matches/TeamMatches";

// Every season with junior team matches is prerendered; weeks are rendered on their first visit and then cached
export const generateStaticParams = () => teamMatchesSeasonParams(true);

export async function generateMetadata({ params }: PageProps<"/[lang]/team-matches/junior/[period]">): Promise<Metadata> {
  return teamMatchesMetadata((await params).period, true);
}

export default function JuniorTeamMatchPeriodPage(props: PageProps<"/[lang]/team-matches/junior/[period]">) {
  return <TeamMatches period={props.params.then((p) => p.period)} junior />;
}
