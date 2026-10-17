// A ranking list other than the front page's (lib/rankings.ts): /rankings/women, /rankings/mixedDoubles-women, ...
import type { Metadata } from "next";
import { Suspense } from "react";
import { RankingsFor } from "@/components/Rankings";
import { POOLS } from "@/lib/data";
import { RANKING_LISTS } from "@/lib/rankings";

export const generateStaticParams = async () => Object.keys(RANKING_LISTS).map((list) => ({ list }));

export async function generateMetadata({ params }: PageProps<"/rankings/[list]">): Promise<Metadata> {
  const list = RANKING_LISTS[(await params).list];
  return { title: list ? `${POOLS[list.pool]}${list.gender ? (list.gender === "K" ? ", women" : ", men") : ""}` : "Rankings" };
}

export default function RankingPage(props: PageProps<"/rankings/[list]">) {
  return (
    <Suspense fallback={<div className="base-container px-4 text-gray-600">Loading rankings…</div>}>
      <RankingsFor params={props.params} showInactive={false} />
    </Suspense>
  );
}
