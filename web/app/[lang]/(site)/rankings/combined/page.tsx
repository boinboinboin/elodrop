// The combined ranking, men: singles, doubles and mixed doubles together.
// Fully static: rendered once per data update.
import type { Metadata } from "next";
import { Suspense } from "react";
import { CombinedRankings } from "@/components/rankings/Rankings";
import Loading from "@/components/ui/Loading";
import { t } from "@/messages/i18n";
import { pageMetadata } from "@/utils/metadata";
import { combinedRankingHref } from "@/utils/rankings";

export const metadata: Metadata = pageMetadata({
  title: t("rankings.combined.title", { gender: t("rankings.genders.men") }),
  description: t("seo.descriptions.combined", { gender: t("rankings.genders.men") }),
  path: combinedRankingHref("M"),
});

export default function CombinedMenPage() {
  return (
    <Suspense fallback={<Loading label={t("rankings.loading")} section />}>
      <CombinedRankings gender="M" junior={false} />
    </Suspense>
  );
}
