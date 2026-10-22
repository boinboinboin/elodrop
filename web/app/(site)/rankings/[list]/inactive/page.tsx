// A ranking list with the players who haven't played in the last 12 months (no rank) included.
import type { Metadata } from "next";
import { Suspense } from "react";
import { RankingsFor } from "@/components/rankings/Rankings";
import Loading from "@/components/ui/Loading";
import { t } from "@/messages/i18n";
import { RANKING_LISTS, rankingListTitle } from "@/utils/rankings";

export const generateStaticParams = async () => Object.keys(RANKING_LISTS).map((list) => ({ list }));

export async function generateMetadata({ params }: PageProps<"/rankings/[list]/inactive">): Promise<Metadata> {
  const list = RANKING_LISTS[(await params).list];
  return { title: list ? t("rankings.metadata.allPlayers", { list: rankingListTitle(list) }) : rankingListTitle(list) };
}

export default function InactiveRankingPage(props: PageProps<"/rankings/[list]/inactive">) {
  return (
    <Suspense fallback={<Loading label={t("rankings.loading")} />}>
      <RankingsFor params={props.params} showInactive />
    </Suspense>
  );
}
