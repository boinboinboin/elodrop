// A ranking list with the players who haven't played in the last 12 months (no rank) included.
import type { Metadata } from "next";
import { Suspense } from "react";
import { RankingsFor } from "@/components/Rankings";
import { POOLS } from "@/lib/data";
import { RANKING_LISTS } from "@/lib/rankings";

export const generateStaticParams = async () => Object.keys(RANKING_LISTS).map((list) => ({ list }));

export async function generateMetadata({ params }: PageProps<"/rankings/[list]/inactive">): Promise<Metadata> {
  const list = RANKING_LISTS[(await params).list];
  return { title: list ? `${POOLS[list.pool]}${list.gender ? (list.gender === "K" ? ", women" : ", men") : ""}, all players` : "Rankings" };
}

export default function InactiveRankingPage(props: PageProps<"/rankings/[list]/inactive">) {
  return (
    <Suspense fallback={<div className="base-container px-4 text-gray-600">Loading rankings…</div>}>
      <RankingsFor params={props.params} showInactive />
    </Suspense>
  );
}
