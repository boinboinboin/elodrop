// One week's senior team matches (/team-matches/2025-11-10) or a season with its divisions and newest weekend
// (/team-matches/2025-26); the juniors' are at /team-matches/junior/<period>.
import type { Metadata } from "next";
import TeamMatches, { teamMatchesMetadata, teamMatchesSeasonParams } from "@/components/team-matches/TeamMatches";

// Allowed to block a navigation until the page is rendered: its URL (params) is read outside Suspense, on
// purpose (no loading text first); without this, dev warns that the navigation isn't instant
export const instant = false;

// Every season is prerendered; weeks are rendered on their first visit and then cached
export const generateStaticParams = () => teamMatchesSeasonParams(false);

export async function generateMetadata({ params }: PageProps<"/[lang]/team-matches/[period]">): Promise<Metadata> {
  return teamMatchesMetadata((await params).period, false);
}

export default function TeamMatchPeriodPage(props: PageProps<"/[lang]/team-matches/[period]">) {
  return <TeamMatches period={props.params.then((p) => p.period)} />;
}
