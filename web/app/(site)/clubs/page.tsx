// Strongest clubs combined over all five disciplines; each discipline is at /clubs/strongest/<pool>.
import type { Metadata } from "next";
import StrongestClubs from "@/components/clubs/StrongestClubs";
import { t } from "@/messages/i18n";

export const metadata: Metadata = { title: t("clubs.metadata.strongest") };

export default function ClubsPage() {
  return <StrongestClubs pool="combined" />;
}
