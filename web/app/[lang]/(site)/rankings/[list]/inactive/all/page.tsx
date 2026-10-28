// A ranking list with every player who has ever played in it, inactive ones included (no rank).
import type { Metadata } from "next";
import { Suspense } from "react";
import { RankingsFor } from "@/components/rankings/Rankings";
import Loading from "@/components/ui/Loading";
import { t } from "@/messages/i18n";
import { pageMetadata } from "@/utils/metadata";
import { RANKING_LISTS, rankingHref, rankingListTitle } from "@/utils/rankings";

export const generateStaticParams = async () => Object.keys(RANKING_LISTS).map((list) => ({ list }));

export async function generateMetadata({ params }: PageProps<"/rankings/[list]/inactive/all">): Promise<Metadata> {
  const list = RANKING_LISTS[(await params).list];
  if (!list) return { title: rankingListTitle(list), robots: { index: false } };
  const name = rankingListTitle(list);
  // A very long page of mostly inactive players: not worth indexing
  return pageMetadata({ title: t("rankings.metadata.everyPlayer", { list: name }), description: t("seo.descriptions.rankingsInactive", { list: name }), path: `${rankingHref(list.pool, list.gender, true)}/all`, index: false });
}

export default function AllPlayersRankingPage(props: PageProps<"/rankings/[list]/inactive/all">) {
  return (
    <Suspense fallback={<Loading label={t("rankings.loading")} />}>
      <RankingsFor params={props.params} showInactive allInactive />
    </Suspense>
  );
}
