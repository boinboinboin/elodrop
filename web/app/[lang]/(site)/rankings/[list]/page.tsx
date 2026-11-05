// A ranking list other than the front page's (utils/rankings.ts): /rankings/women, /rankings/mixedDoubles-women, ...
import type { Metadata } from "next";
import { RankingsFor } from "@/components/rankings/Rankings";
import { getI18n } from "@/messages/server";
import { pageMetadata } from "@/utils/metadata";
import { RANKING_LISTS, rankingHref, rankingListTitle } from "@/utils/rankings";

export const generateStaticParams = async () => Object.keys(RANKING_LISTS).map((list) => ({ list }));

export async function generateMetadata({ params }: PageProps<"/[lang]/rankings/[list]">): Promise<Metadata> {
  const i18n = await getI18n();
  const { t } = i18n;
  const list = RANKING_LISTS[(await params).list];
  if (!list) return { title: rankingListTitle(i18n, list) };
  const name = rankingListTitle(i18n, list);
  return pageMetadata(i18n, { title: t("seo.listTitle", { list: name }), description: t("seo.descriptions.rankings", { list: name }), path: rankingHref(list.pool, list.gender) });
}

// No Suspense around the content: it is then part of the first paint, not a loading text swapped for it
export default function RankingPage(props: PageProps<"/[lang]/rankings/[list]">) {
  return <RankingsFor params={props.params} showInactive={false} />;
}
