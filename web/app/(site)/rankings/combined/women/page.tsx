// The combined ranking, women: singles, doubles and mixed doubles together.
// Fully static: rendered once per data update.
import type { Metadata } from "next";
import { Suspense } from "react";
import { CombinedRankings } from "@/components/rankings/Rankings";
import Loading from "@/components/ui/Loading";
import { t } from "@/messages/i18n";

export const metadata: Metadata = { title: t("rankings.combined.title", { gender: t("rankings.genders.women") }) };

export default function CombinedWomenPage() {
  return (
    <Suspense fallback={<Loading label={t("rankings.loading")} section />}>
      <CombinedRankings gender="K" junior={false} />
    </Suspense>
  );
}
