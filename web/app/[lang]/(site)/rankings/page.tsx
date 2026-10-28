// Men's singles, the first ranking list (the other lists are at /rankings/<list>, utils/rankings.ts).
// Fully static: rendered once per data update.
import type { Metadata } from "next";
import { Suspense } from "react";
import Rankings from "@/components/rankings/Rankings";
import Loading from "@/components/ui/Loading";
import { getI18n } from "@/messages/server";
import { pageMetadata } from "@/utils/metadata";
import { RANKING_LISTS, rankingHref, rankingListTitle } from "@/utils/rankings";

export async function generateMetadata(): Promise<Metadata> {
  const i18n = await getI18n();
  const { t } = i18n;
  return pageMetadata(i18n, {
    title: t("seo.listTitle", { list: rankingListTitle(i18n, RANKING_LISTS.men) }),
    description: t("seo.descriptions.rankings", { list: rankingListTitle(i18n, RANKING_LISTS.men) }),
    path: rankingHref("men"),
  });
}

export default async function RankingsPage() {
  const { t } = await getI18n();
  return (
    <Suspense fallback={<Loading label={t("rankings.loading")} section />}>
      <Rankings list={RANKING_LISTS.men} showInactive={false} />
    </Suspense>
  );
}
