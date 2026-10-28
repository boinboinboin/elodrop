// The junior rankings (U19), men's singles (the other lists are at /rankings/junior/<list>).
// Fully static: rendered once per data update.
import type { Metadata } from "next";
import { Suspense } from "react";
import { JuniorRankings } from "@/components/rankings/Rankings";
import Loading from "@/components/ui/Loading";
import { t } from "@/messages/i18n";
import { pageMetadata } from "@/utils/metadata";
import { juniorRankingHref, RANKING_LISTS, rankingListTitle } from "@/utils/rankings";

export const metadata: Metadata = pageMetadata({
  title: t("seo.juniorListTitle", { list: rankingListTitle(RANKING_LISTS.men) }),
  description: t("seo.descriptions.junior", { list: rankingListTitle(RANKING_LISTS.men) }),
  path: juniorRankingHref("men"),
});

export default function JuniorRankingsPage() {
  return (
    <Suspense fallback={<Loading label={t("rankings.loading")} section />}>
      <JuniorRankings list={RANKING_LISTS.men} />
    </Suspense>
  );
}
