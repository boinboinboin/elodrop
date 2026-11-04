// The newest week's junior team matches (U13 to U19; components/team-matches/TeamMatches.tsx); other weeks and years
// are at /team-matches/junior/<period>.
import type { Metadata } from "next";
import TeamMatches, { teamMatchesMetadata } from "@/components/team-matches/TeamMatches";

export const generateMetadata = (): Promise<Metadata> => teamMatchesMetadata(null, true);

export default function JuniorTeamMatchesPage() {
  return <TeamMatches period={Promise.resolve(null)} junior />;
}
