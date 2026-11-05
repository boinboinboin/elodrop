// The combined ranking, women: singles, doubles and mixed doubles together.
// Fully static: rendered once per data update.
import type { Metadata } from "next";
import { CombinedRankings } from "@/components/rankings/Rankings";
import { getI18n } from "@/messages/server";
import { pageMetadata } from "@/utils/metadata";
import { combinedRankingHref } from "@/utils/rankings";

export async function generateMetadata(): Promise<Metadata> {
  const i18n = await getI18n();
  const { t } = i18n;
  return pageMetadata(i18n, {
    title: t("rankings.combined.title", { gender: t("rankings.genders.women") }),
    description: t("seo.descriptions.combined", { gender: t("rankings.genders.women") }),
    path: combinedRankingHref("K"),
  });
}

// No Suspense around the content: it is then part of the first paint, not a loading text swapped for it
export default function CombinedWomenPage() {
  return <CombinedRankings gender="K" junior={false} />;
}
