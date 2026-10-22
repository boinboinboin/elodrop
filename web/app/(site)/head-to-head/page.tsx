// Two players head to head (?a=<id>&b=<id>): their record against each other and together,
// winning margins, and per discipline both play their ratings, A's chance of beating B now and
// both rating histories; then the matches. A man and a woman also get a comparison just for fun in
// singles and doubles, with her rating moved onto the men's scale by the gender gap
// (pipeline/gender-gap.mjs).
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { type ChartSeries } from "@/components/charts/LineChart";
import Team from "@/components/clubs/Team";
import PoolName from "@/components/format/PoolName";
import ChanceBar from "@/components/head-to-head/ChanceBar";
import GenderGapNote from "@/components/head-to-head/GenderGapNote";
import HeadToHeadSwitch from "@/components/head-to-head/HeadToHeadSwitch";
import MarginsCard from "@/components/head-to-head/MarginsCard";
import MarginsTable from "@/components/head-to-head/MarginsTable";
import PlayerPicker from "@/components/head-to-head/PlayerPicker";
import RatingHistory from "@/components/head-to-head/RatingHistory";
import RecordScore, { recordSentence } from "@/components/head-to-head/RecordScore";
import SideNumbers from "@/components/head-to-head/SideNumbers";
import SideRating, { rankText } from "@/components/head-to-head/SideRating";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import MatchTable from "@/components/players/MatchTable";
import Loading from "@/components/ui/Loading";
import Section from "@/components/ui/Section";
import Swatch from "@/components/ui/Swatch";
import Tabs from "@/components/ui/Tabs";
import { getGenderGap, getHeadToHead } from "@/data/head-to-head";
import { getMeta } from "@/data/meta";
import { getPlayer } from "@/data/players";
import { getClubMap } from "@/data/sanity";
import { plural, t } from "@/messages/i18n";
import type { ClubEntry, GenderGap, HeadToHead, HeadToHeadCrossover, HeadToHeadPool, Player, Pool } from "@/types";
import { SIDE_COLORS } from "@/utils/chart";
import { headToHeadHref, playerHref } from "@/utils/hrefs";
import { parseId } from "@/utils/parse";
import { POOLS } from "@/utils/pools";

export const metadata: Metadata = { title: t("headToHead.title") };

export default function HeadToHeadPage(props: PageProps<"/head-to-head">) {
  return (
    <Suspense fallback={<Loading section />}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: Pick<PageProps<"/head-to-head">, "searchParams">) {
  const params = await searchParams;
  const idA = parseId(params.a);
  const idB = parseId(params.b);
  const h2h = idA && idB ? await getHeadToHead(idA, idB) : null;
  // Names for the pickers, also when only one player is chosen
  const [playerA, playerB, clubs, meta, gap] = await Promise.all([
    h2h ? h2h.a : idA ? getPlayer(idA) : null,
    h2h ? h2h.b : idB ? getPlayer(idB) : null,
    getClubMap(),
    getMeta(),
    getGenderGap(),
  ]);

  return (
    <>
      <Section>
        <Breadcrumbs trail={[{ label: t("headToHead.title") }]} />
        <h1 className="h1 mt-4">{t("headToHead.title")}</h1>
        <p className="text-2xl max-w-3xl mt-2">{t("headToHead.intro")}</p>
        <HeadToHeadSwitch current="players" />
        <form action="/head-to-head" method="get" className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_auto] items-end max-w-4xl">
          <PlayerPicker key={`a-${idA}`} name="a" label={t("headToHead.form.player")} initial={playerA ? { id: playerA.id, name: playerA.name } : null} />
          <PlayerPicker key={`b-${idB}`} name="b" label={t("headToHead.form.against")} initial={playerB ? { id: playerB.id, name: playerB.name } : null} />
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 border border-black bg-black text-white hover:bg-white hover:text-black transition-colors duration-200 cursor-pointer">{t("headToHead.form.compare")}</button>
            {h2h && idA && idB && (
              <Link href={headToHeadHref(idB, idA)} className="px-4 py-2 border border-black hover:bg-black hover:text-white transition-colors duration-200" title={t("headToHead.form.swapPlayers")}>{t("headToHead.form.swap")}</Link>
            )}
          </div>
        </form>
        {idA && idB && !h2h && <p className="mt-4 text-red-700">{t(idA === idB ? "headToHead.form.twoDifferent" : "headToHead.form.notFound")}</p>}
      </Section>
      {h2h && <Comparison h2h={h2h} clubs={clubs} links={meta?.tournamentLinks ?? {}} gap={gap} />}
    </>
  );
}

function Comparison({ h2h, clubs, links, gap }: { h2h: HeadToHead; clubs: Record<string, ClubEntry>; links: Record<string, number>; gap: GenderGap | null }) {
  const { a, b, record } = h2h;
  const pools = Object.entries(h2h.pools) as [Pool, HeadToHeadPool][];
  return (
    <>
      <Section>
        {/* The two players and their record against each other */}
        <div className="bg-white p-4 md:p-6 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2 sm:gap-4 items-center text-center [overflow-wrap:anywhere]">
          {[a, b].map((player, i) => (
            <div key={player.id} className={i === 0 ? "order-1" : "order-3"}>
              <Swatch color={SIDE_COLORS[i]} className="w-8 h-1 mb-2" />
              <p className="text-lg sm:text-2xl"><Link href={playerHref(player.id)} className="hover:text-blue-600">{player.name}</Link></p>
              {player.club && <p className="text-gray-600"><Team name={player.club} clubs={clubs} size={5} /></p>}
            </div>
          ))}
          <div className="order-2 px-1 sm:px-2 max-w-28 sm:max-w-none">
            <RecordScore record={record} />
            {h2h.togetherRecord.matches > 0 && (
              <p className="text-sm text-gray-600 mt-2">{t("headToHead.record.together", { wins: h2h.togetherRecord.wins, losses: h2h.togetherRecord.losses })}</p>
            )}
          </div>
        </div>
        {h2h.margins.matches > 0 && <MarginsCard margins={h2h.margins} names={[a.name, b.name]} showPool={pools.length > 1} />}
      </Section>

      {pools.length > 0 && (
        <Section title={t("headToHead.now.title")} titleClassName="text-3xl mb-2">
          <p className="text-gray-700 mb-6 max-w-3xl">{t("headToHead.now.intro", { a: a.name, b: b.name })}</p>
          <Tabs label={t("headToHead.now.tabs")} param="discipline" className="mb-6" tabs={pools.map(([pool, p]) => ({ id: pool, label: <PoolName pool={pool} />, content: <PoolComparison pool={pool} p={p} a={a} b={b} showMargins={pools.length > 1} /> }))} />
        </Section>
      )}

      {h2h.crossovers.length > 0 && (
        <Section title={t("headToHead.fun.title")} titleClassName="text-3xl mb-2">
          <p className="text-gray-700 mb-6 max-w-3xl">{t("headToHead.fun.intro", { a: a.name, b: b.name })}</p>
          <Tabs
            label={t("headToHead.fun.title")}
            param="fun"
            className="mb-6"
            tabs={h2h.crossovers.map((c) => ({
              id: c.format,
              label: c.label,
              content: (
                <>
                  <CrossoverComparison c={c} a={a} b={b} />
                  {gap && <GenderGapNote gap={gap} format={c.format} extrapolated={!!(c.a.extrapolated || c.b.extrapolated)} />}
                </>
              ),
            }))}
          />
        </Section>
      )}

      {(h2h.meetings.length > 0 || h2h.together.length > 0) && (
        <section className="base-section">
          <div className="base-container px-4 grid grid-cols-1 gap-6">
            {h2h.meetings.length > 0 && <MatchTable title={t("headToHead.matches.against")} subtitle={t("headToHead.matches.fromSide", { name: a.name })} matches={h2h.meetings} limit={20} showMargin tournamentLinks={links} />}
            {h2h.together.length > 0 && <MatchTable title={t("headToHead.matches.together")} subtitle={t("headToHead.matches.fromSide", { name: a.name })} matches={h2h.together} limit={20} tournamentLinks={links} />}
          </div>
        </section>
      )}
    </>
  );
}

/** The sides' rating histories as chart series (only the sides with more than one week) */
function historySeries(histories: ({ from: string; ratings: (number | null)[] } | null | undefined)[], names: string[], minWeeks = 2): ChartSeries[] {
  const series: ChartSeries[] = [];
  histories.forEach((history, i) => {
    if (history && history.ratings.length >= minWeeks) series.push({ label: names[i], from: history.from, values: history.ratings, slot: i });
  });
  return series;
}

function PoolComparison({ pool, p, a, b, showMargins }: { pool: Pool; p: HeadToHeadPool; a: Player; b: Player; showMargins: boolean }) {
  const series = historySeries([p.a.history, p.b.history], [a.name, b.name]);
  const poolInText = t(`common.poolsInSentence.${pool}`);
  return (
    <div className="bg-white p-4 md:p-6">
      <h3 className="text-xl mb-4">{POOLS[pool]}</h3>
      <div className="grid grid-cols-2 gap-4">
        {[p.a, p.b].map((side, i) => (
          <SideNumbers key={i} right={i === 1} label={[a, b][i].name} value={Math.round(side.rating)}>
            <dd className="text-sm text-gray-600">
              {rankText(side, pool, true)} · {t("headToHead.rank.peak", { rating: Math.round(side.peak) })}
            </dd>
          </SideNumbers>
        ))}
      </div>
      {/* Win chance as a split bar: A's share from the left, B's from the right */}
      <div className="mt-6">
        <ChanceBar names={[a.name, b.name]} chance={p.chance} />
        {p.record.matches > 0 && <p className="text-sm text-gray-600 mt-2">{recordSentence(plural("headToHead.record.metIn", p.record.matches, { pool: poolInText }), a.name, p.record)}</p>}
      </div>
      {showMargins && p.margins.matches > 0 && (
        <>
          <h4 className="text-lg mt-8 mb-2">{t("headToHead.margins.inPool", { pool: poolInText })}</h4>
          <MarginsTable mg={p.margins} names={[a.name, b.name]} showPool={false} />
        </>
      )}
      {series.length === 2 && <RatingHistory title={t("headToHead.history.title")} intro={t("headToHead.history.intro")} series={series} />}
    </div>
  );
}

/** A man against a woman, just for fun: both on the men's scale, the chance and both histories */
function CrossoverComparison({ c, a, b }: { c: HeadToHeadCrossover; a: Player; b: Player }) {
  // Every week of a history counts (the data leaves out histories of one week)
  const series = historySeries(c.history, [a.name, b.name], 1);
  return (
    <div className="bg-white p-4 md:p-6">
      <h3 className="text-xl mb-4">{t("headToHead.fun.onMensScale", { label: c.label })}</h3>
      <div className="grid grid-cols-2 gap-4">
        {[c.a, c.b].map((side, i) => (
          <SideNumbers key={i} right={i === 1} label={[a, b][i].name} value={`${Math.round(side.rating)}${side.extrapolated ? "*" : ""}`}>
            <dd className="text-sm text-gray-600"><SideRating side={side} /></dd>
          </SideNumbers>
        ))}
      </div>
      <div className="mt-6">
        <ChanceBar names={[a.name, b.name]} chance={c.chance} />
        {c.record.matches > 0 && (
          <p className="text-sm text-gray-600 mt-2">
            {recordSentence(plural("headToHead.record.theyMetIn", c.record.matches, { pool: t(`common.poolsInSentence.${c.format === "singles" ? "men" : "mensDoubles"}`) }), a.name, c.record)}
          </p>
        )}
      </div>
      {series.length === 2 && <RatingHistory title={t("headToHead.history.title")} intro={t("headToHead.history.introMensScale")} series={series} />}
    </div>
  );
}
