// Strongest clubs combined over all five disciplines; each discipline is at /clubs/strongest/<pool>.
import type { Metadata } from "next";
import StrongestClubs from "@/components/clubs/StrongestClubs";
import { getI18n } from "@/messages/server";
import { pageMetadata } from "@/utils/metadata";
import { strongestClubsHref } from "@/utils/rankings";

export async function generateMetadata(): Promise<Metadata> {
  const i18n = await getI18n();
  const { t } = i18n;
  return pageMetadata(i18n, { title: t("clubs.metadata.strongest"), description: t("seo.descriptions.clubs"), path: strongestClubsHref("combined") });
}

export default function ClubsPage() {
  return <StrongestClubs pool="combined" />;
}
