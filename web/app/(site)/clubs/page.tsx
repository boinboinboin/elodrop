// Strongest clubs combined over all five disciplines; each discipline is at /clubs/strongest/<pool>.
import type { Metadata } from "next";
import StrongestClubs from "@/components/StrongestClubs";

export const metadata: Metadata = { title: "Strongest clubs" };

export default function ClubsPage() {
  return <StrongestClubs pool="combined" />;
}
