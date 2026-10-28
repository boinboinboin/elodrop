// The junior rankings (U19), men's singles (the other lists are at /rankings/junior/<list>).
// Fully static: rendered once per data update.
import type { Metadata } from "next";
import { Suspense } from "react";
import { JuniorRankings } from "@/components/rankings/Rankings";
import Loading from "@/components/ui/Loading";
import { getI18n } from "@/messages/server";
import { pageMetadata } from "@/utils/metadata";
import { juniorRankingHref, RANKING_LISTS, rankingListTitle } from "@/utils/rankings";

export async function generateMetadata(): Promise<Metadata> {
  const i18n = await getI18n();
  const { t } = i18n;
  return pageMetadata(i18n, {
    title: t("seo.juniorListTitle", { list: rankingListTitle(i18n, RANKING_LISTS.men) }),
    description: t("seo.descriptions.junior", { list: rankingListTitle(i18n, RANKING_LISTS.men) }),
    path: juniorRankingHref("men"),
  });
}

export default async function JuniorRankingsPage() {
  const { t } = await getI18n();
  return (
    <Suspense fallback={<Loading label={t("rankings.loading")} section />}>
      <JuniorRankings list={RANKING_LISTS.men} />
    </Suspense>
  );
}
