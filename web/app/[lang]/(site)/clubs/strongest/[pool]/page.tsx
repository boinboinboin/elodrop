// Strongest clubs in one discipline: /clubs/strongest/men, /clubs/strongest/mixedDoubles, ...
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StrongestClubs from "@/components/clubs/StrongestClubs";
import { getI18n } from "@/messages/server";
import { pageMetadata } from "@/utils/metadata";
import { POOL_KEYS, isPool } from "@/utils/pools";
import { strongestClubsHref } from "@/utils/rankings";

export const generateStaticParams = async () => POOL_KEYS.map((pool) => ({ pool }));

export async function generateMetadata({ params }: PageProps<"/[lang]/clubs/strongest/[pool]">): Promise<Metadata> {
  const i18n = await getI18n();
  const { t } = i18n;
  const { pool } = await params;
  if (!isPool(pool)) return { title: t("clubs.metadata.strongest") };
  const name = t(`common.poolsInSentence.${pool}`);
  return pageMetadata(i18n, { title: t("clubs.metadata.strongestPool", { pool: name }), description: t("seo.descriptions.clubsPool", { pool: name }), path: strongestClubsHref(pool) });
}

// No Suspense around the content: it is then part of the first paint, not a loading text swapped for it
export default function StrongestClubsPage(props: PageProps<"/[lang]/clubs/strongest/[pool]">) {
  return <Content params={props.params} />;
}

async function Content({ params }: Pick<PageProps<"/[lang]/clubs/strongest/[pool]">, "params">) {
  const { pool } = await params;
  if (!isPool(pool)) notFound();
  return <StrongestClubs pool={pool} />;
}
