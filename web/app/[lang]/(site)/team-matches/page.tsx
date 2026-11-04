// The newest week's senior team matches (components/team-matches/TeamMatches.tsx); other weeks and years are at
// /team-matches/<period>, the juniors' at /team-matches/junior.
import type { Metadata } from "next";
import TeamMatches, { teamMatchesMetadata } from "@/components/team-matches/TeamMatches";

export const generateMetadata = (): Promise<Metadata> => teamMatchesMetadata(null, false);

export default function TeamMatchesPage() {
  return <TeamMatches period={Promise.resolve(null)} />;
}
