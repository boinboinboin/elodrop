// A junior ranking (U19) other than men's singles (utils/rankings.ts): /rankings/junior/women, /rankings/junior/mixedDoubles-women, ...
import type { Metadata } from "next";
import { Suspense } from "react";
import { JuniorRankingsFor } from "@/components/rankings/Rankings";
import Loading from "@/components/ui/Loading";
import { getI18n } from "@/messages/server";
import { pageMetadata } from "@/utils/metadata";
import { juniorRankingHref, RANKING_LISTS, rankingListTitle } from "@/utils/rankings";

export const generateStaticParams = async () => Object.keys(RANKING_LISTS).map((list) => ({ list }));

export async function generateMetadata({ params }: PageProps<"/[lang]/rankings/junior/[list]">): Promise<Metadata> {
  const i18n = await getI18n();
  const { t } = i18n;
  const list = RANKING_LISTS[(await params).list];
  if (!list) return { title: t("rankings.junior.title", { list: rankingListTitle(i18n, list) }) };
  const name = rankingListTitle(i18n, list);
  return pageMetadata(i18n, { title: t("seo.juniorListTitle", { list: name }), description: t("seo.descriptions.junior", { list: name }), path: juniorRankingHref(list.pool, list.gender) });
}

export default async function JuniorRankingPage(props: PageProps<"/[lang]/rankings/junior/[list]">) {
  const { t } = await getI18n();
  return (
    <Suspense fallback={<Loading label={t("rankings.loading")} />}>
      <JuniorRankingsFor params={props.params} />
    </Suspense>
  );
}
