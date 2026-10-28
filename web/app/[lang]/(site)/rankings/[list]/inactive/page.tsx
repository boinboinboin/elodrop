// A ranking list with the players who haven't played in the last 12 months (no rank) included.
import type { Metadata } from "next";
import { Suspense } from "react";
import { RankingsFor } from "@/components/rankings/Rankings";
import Loading from "@/components/ui/Loading";
import { getI18n } from "@/messages/server";
import { pageMetadata } from "@/utils/metadata";
import { RANKING_LISTS, rankingHref, rankingListTitle } from "@/utils/rankings";

export const generateStaticParams = async () => Object.keys(RANKING_LISTS).map((list) => ({ list }));

export async function generateMetadata({ params }: PageProps<"/[lang]/rankings/[list]/inactive">): Promise<Metadata> {
  const i18n = await getI18n();
  const { t } = i18n;
  const list = RANKING_LISTS[(await params).list];
  if (!list) return { title: rankingListTitle(i18n, list) };
  const name = rankingListTitle(i18n, list);
  return pageMetadata(i18n, { title: t("rankings.metadata.allPlayers", { list: name }), description: t("seo.descriptions.rankingsInactive", { list: name }), path: rankingHref(list.pool, list.gender, true) });
}

export default async function InactiveRankingPage(props: PageProps<"/[lang]/rankings/[list]/inactive">) {
  const { t } = await getI18n();
  return (
    <Suspense fallback={<Loading label={t("rankings.loading")} />}>
      <RankingsFor params={props.params} showInactive />
    </Suspense>
  );
}
