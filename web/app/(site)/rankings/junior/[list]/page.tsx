// A junior ranking (U19) other than men's singles (utils/rankings.ts): /rankings/junior/women, /rankings/junior/mixedDoubles-women, ...
import type { Metadata } from "next";
import { Suspense } from "react";
import { JuniorRankingsFor } from "@/components/rankings/Rankings";
import Loading from "@/components/ui/Loading";
import { t } from "@/messages/i18n";
import { pageMetadata } from "@/utils/metadata";
import { juniorRankingHref, RANKING_LISTS, rankingListTitle } from "@/utils/rankings";

export const generateStaticParams = async () => Object.keys(RANKING_LISTS).map((list) => ({ list }));

export async function generateMetadata({ params }: PageProps<"/rankings/junior/[list]">): Promise<Metadata> {
  const list = RANKING_LISTS[(await params).list];
  if (!list) return { title: t("rankings.junior.title", { list: rankingListTitle(list) }) };
  const name = rankingListTitle(list);
  return pageMetadata({ title: t("seo.juniorListTitle", { list: name }), description: t("seo.descriptions.junior", { list: name }), path: juniorRankingHref(list.pool, list.gender) });
}

export default function JuniorRankingPage(props: PageProps<"/rankings/junior/[list]">) {
  return (
    <Suspense fallback={<Loading label={t("rankings.loading")} />}>
      <JuniorRankingsFor params={props.params} />
    </Suspense>
  );
}
