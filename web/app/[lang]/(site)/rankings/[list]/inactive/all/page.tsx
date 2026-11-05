// A ranking list with every player who has ever played in it, inactive ones included (no rank).
import type { Metadata } from "next";
import { RankingsFor } from "@/components/rankings/Rankings";
import { getI18n } from "@/messages/server";
import { pageMetadata } from "@/utils/metadata";
import { RANKING_LISTS, rankingHref, rankingListTitle } from "@/utils/rankings";

// Allowed to block a navigation until the page is rendered: its URL (params) is read outside Suspense, on
// purpose (no loading text first); without this, dev warns that the navigation isn't instant
export const instant = false;

export const generateStaticParams = async () => Object.keys(RANKING_LISTS).map((list) => ({ list }));

export async function generateMetadata({ params }: PageProps<"/[lang]/rankings/[list]/inactive/all">): Promise<Metadata> {
  const i18n = await getI18n();
  const { t } = i18n;
  const list = RANKING_LISTS[(await params).list];
  if (!list) return { title: rankingListTitle(i18n, list), robots: { index: false } };
  const name = rankingListTitle(i18n, list);
  // A very long page of mostly inactive players: not worth indexing
  return pageMetadata(i18n, { title: t("rankings.metadata.everyPlayer", { list: name }), description: t("seo.descriptions.rankingsInactive", { list: name }), path: `${rankingHref(list.pool, list.gender, true)}/all`, index: false });
}

// No Suspense around the content: it is then part of the first paint, not a loading text swapped for it
export default function AllPlayersRankingPage(props: PageProps<"/[lang]/rankings/[list]/inactive/all">) {
  return <RankingsFor params={props.params} showInactive allInactive />;
}
