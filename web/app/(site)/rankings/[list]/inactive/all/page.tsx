// A ranking list with every player who has ever played in it, inactive ones included (no rank).
import type { Metadata } from "next";
import { Suspense } from "react";
import { RankingsFor } from "@/components/Rankings";
import { POOLS } from "@/lib/data";
import { RANKING_LISTS } from "@/lib/rankings";

export const generateStaticParams = async () => Object.keys(RANKING_LISTS).map((list) => ({ list }));

export async function generateMetadata({ params }: PageProps<"/rankings/[list]/inactive/all">): Promise<Metadata> {
  const list = RANKING_LISTS[(await params).list];
  return {
    title: list ? `${POOLS[list.pool]}${list.gender ? (list.gender === "K" ? ", women" : ", men") : ""}, every player` : "Rankings",
    // A very long page of mostly inactive players: not worth indexing
    robots: { index: false },
  };
}

export default function AllPlayersRankingPage(props: PageProps<"/rankings/[list]/inactive/all">) {
  return (
    <Suspense fallback={<div className="base-container px-4 text-gray-600">Loading rankings…</div>}>
      <RankingsFor params={props.params} showInactive allInactive />
    </Suspense>
  );
}
