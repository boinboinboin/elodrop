// Men's singles, the first ranking list (the other lists are at /rankings/<list>, utils/rankings.ts).
// Fully static: rendered once per data update.
import type { Metadata } from "next";
import { Suspense } from "react";
import Rankings from "@/components/rankings/Rankings";
import Loading from "@/components/ui/Loading";
import { t } from "@/messages/i18n";
import { RANKING_LISTS, rankingListTitle } from "@/utils/rankings";

export const metadata: Metadata = { title: rankingListTitle(RANKING_LISTS.men) };

export default function RankingsPage() {
  return (
    <Suspense fallback={<Loading label={t("rankings.loading")} section />}>
      <Rankings list={RANKING_LISTS.men} showInactive={false} />
    </Suspense>
  );
}
