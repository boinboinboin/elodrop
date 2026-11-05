// A junior ranking (U19) other than men's singles (utils/rankings.ts): /rankings/junior/women, /rankings/junior/mixedDoubles-women, ...
import type { Metadata } from "next";
import { JuniorRankingsFor } from "@/components/rankings/Rankings";
import { getI18n } from "@/messages/server";
import { pageMetadata } from "@/utils/metadata";
import { juniorRankingHref, RANKING_LISTS, rankingListTitle } from "@/utils/rankings";

// Allowed to block a navigation until the page is rendered: its URL (params) is read outside Suspense, on
// purpose (no loading text first); without this, dev warns that the navigation isn't instant
export const instant = false;

export const generateStaticParams = async () => Object.keys(RANKING_LISTS).map((list) => ({ list }));

export async function generateMetadata({ params }: PageProps<"/[lang]/rankings/junior/[list]">): Promise<Metadata> {
  const i18n = await getI18n();
  const { t } = i18n;
  const list = RANKING_LISTS[(await params).list];
  if (!list) return { title: t("rankings.junior.title", { list: rankingListTitle(i18n, list) }) };
  const name = rankingListTitle(i18n, list);
  return pageMetadata(i18n, { title: t("seo.juniorListTitle", { list: name }), description: t("seo.descriptions.junior", { list: name }), path: juniorRankingHref(list.pool, list.gender) });
}

// No Suspense around the content: it is then part of the first paint, not a loading text swapped for it
export default function JuniorRankingPage(props: PageProps<"/[lang]/rankings/junior/[list]">) {
  return <JuniorRankingsFor params={props.params} />;
}
