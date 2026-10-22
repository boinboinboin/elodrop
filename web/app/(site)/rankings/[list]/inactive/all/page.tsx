// A ranking list with every player who has ever played in it, inactive ones included (no rank).
import type { Metadata } from "next";
import { Suspense } from "react";
import { RankingsFor } from "@/components/rankings/Rankings";
import Loading from "@/components/ui/Loading";
import { t } from "@/messages/i18n";
import { RANKING_LISTS, rankingListTitle } from "@/utils/rankings";

export const generateStaticParams = async () => Object.keys(RANKING_LISTS).map((list) => ({ list }));

export async function generateMetadata({ params }: PageProps<"/rankings/[list]/inactive/all">): Promise<Metadata> {
  const list = RANKING_LISTS[(await params).list];
  return {
    title: list ? t("rankings.metadata.everyPlayer", { list: rankingListTitle(list) }) : rankingListTitle(list),
    // A very long page of mostly inactive players: not worth indexing
    robots: { index: false },
  };
}

export default function AllPlayersRankingPage(props: PageProps<"/rankings/[list]/inactive/all">) {
  return (
    <Suspense fallback={<Loading label={t("rankings.loading")} />}>
      <RankingsFor params={props.params} showInactive allInactive />
    </Suspense>
  );
}
