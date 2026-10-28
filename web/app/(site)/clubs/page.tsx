// Strongest clubs combined over all five disciplines; each discipline is at /clubs/strongest/<pool>.
import type { Metadata } from "next";
import StrongestClubs from "@/components/clubs/StrongestClubs";
import { t } from "@/messages/i18n";
import { pageMetadata } from "@/utils/metadata";
import { strongestClubsHref } from "@/utils/rankings";

export const metadata: Metadata = pageMetadata({ title: t("clubs.metadata.strongest"), description: t("seo.descriptions.clubs"), path: strongestClubsHref("combined") });

export default function ClubsPage() {
  return <StrongestClubs pool="combined" />;
}
