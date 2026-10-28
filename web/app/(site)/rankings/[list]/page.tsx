// A ranking list other than the front page's (utils/rankings.ts): /rankings/women, /rankings/mixedDoubles-women, ...
import type { Metadata } from "next";
import { Suspense } from "react";
import { RankingsFor } from "@/components/rankings/Rankings";
import Loading from "@/components/ui/Loading";
import { t } from "@/messages/i18n";
import { pageMetadata } from "@/utils/metadata";
import { RANKING_LISTS, rankingHref, rankingListTitle } from "@/utils/rankings";

export const generateStaticParams = async () => Object.keys(RANKING_LISTS).map((list) => ({ list }));

export async function generateMetadata({ params }: PageProps<"/rankings/[list]">): Promise<Metadata> {
  const list = RANKING_LISTS[(await params).list];
  if (!list) return { title: rankingListTitle(list) };
  const name = rankingListTitle(list);
  return pageMetadata({ title: t("seo.listTitle", { list: name }), description: t("seo.descriptions.rankings", { list: name }), path: rankingHref(list.pool, list.gender) });
}

export default function RankingPage(props: PageProps<"/rankings/[list]">) {
  return (
    <Suspense fallback={<Loading label={t("rankings.loading")} />}>
      <RankingsFor params={props.params} showInactive={false} />
    </Suspense>
  );
}
