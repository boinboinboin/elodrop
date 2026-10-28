// Strongest clubs in one discipline: /clubs/strongest/men, /clubs/strongest/mixedDoubles, ...
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import StrongestClubs from "@/components/clubs/StrongestClubs";
import Loading from "@/components/ui/Loading";
import { t } from "@/messages/i18n";
import { pageMetadata } from "@/utils/metadata";
import { POOL_KEYS, isPool } from "@/utils/pools";
import { strongestClubsHref } from "@/utils/rankings";

export const generateStaticParams = async () => POOL_KEYS.map((pool) => ({ pool }));

export async function generateMetadata({ params }: PageProps<"/clubs/strongest/[pool]">): Promise<Metadata> {
  const { pool } = await params;
  if (!isPool(pool)) return { title: t("clubs.metadata.strongest") };
  const name = t(`common.poolsInSentence.${pool}`);
  return pageMetadata({ title: t("clubs.metadata.strongestPool", { pool: name }), description: t("seo.descriptions.clubsPool", { pool: name }), path: strongestClubsHref(pool) });
}

export default function StrongestClubsPage(props: PageProps<"/clubs/strongest/[pool]">) {
  return (
    <Suspense fallback={<Loading label={t("clubs.loadingClubs")} section />}>
      <Content params={props.params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<PageProps<"/clubs/strongest/[pool]">, "params">) {
  const { pool } = await params;
  if (!isPool(pool)) notFound();
  return <StrongestClubs pool={pool} />;
}
