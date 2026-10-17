// Strongest clubs in one discipline: /clubs/strongest/men, /clubs/strongest/mixedDoubles, ...
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import StrongestClubs from "@/components/StrongestClubs";
import { POOLS, POOL_KEYS, isPool } from "@/lib/data";

export const generateStaticParams = async () => POOL_KEYS.map((pool) => ({ pool }));

export async function generateMetadata({ params }: PageProps<"/clubs/strongest/[pool]">): Promise<Metadata> {
  const { pool } = await params;
  return { title: isPool(pool) ? `Strongest clubs: ${POOLS[pool].toLowerCase()}` : "Strongest clubs" };
}

export default function StrongestClubsPage(props: PageProps<"/clubs/strongest/[pool]">) {
  return (
    <Suspense fallback={<div className="base-container px-4 base-section text-gray-600">Loading clubs…</div>}>
      <Content params={props.params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<PageProps<"/clubs/strongest/[pool]">, "params">) {
  const { pool } = await params;
  if (!isPool(pool)) notFound();
  return <StrongestClubs pool={pool} />;
}
