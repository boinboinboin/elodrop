// Two doubles pairs head to head (?a1=<id>&a2=<id>&b1=<id>&b2=<id>): their record against each
// other and each pair's record together, winning margins, and in the doubles discipline the pairs'
// genders put them in (two men's pairs: men's doubles, two mixed pairs: mixed doubles, ...) the
// pairs' ratings (the average of the partners'), pair A's chance of beating pair B now and both pairs'
// rating histories; then the matches. Pairs that don't play in the same discipline (a men's pair
// against a women's or mixed pair) get a comparison just for fun on the men's doubles scale, with
// women's ratings moved onto it by the gender gap (pipeline/gender-gap.mjs). Pair A is blue and
// pair B orange throughout.
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
import SideRating from "@/components/head-to-head/SideRating";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import MatchTable from "@/components/players/MatchTable";
import Loading from "@/components/ui/Loading";
import Section from "@/components/ui/Section";
import Swatch from "@/components/ui/Swatch";
import Tabs from "@/components/ui/Tabs";
import { getDoublesHeadToHead, getGenderGap } from "@/data/head-to-head";
import { getMeta } from "@/data/meta";
import { getPlayer } from "@/data/players";
import { getClubMap } from "@/data/sanity";
import { plural, t } from "@/messages/i18n";
import type { ClubEntry, DoublesHeadToHead, DoublesHeadToHeadPool, GenderGap, PairKind, Player, Pool } from "@/types";
import { SIDE_COLORS } from "@/utils/chart";
import { capitalize } from "@/utils/format";
import { doublesHeadToHeadHref, playerHref } from "@/utils/hrefs";
import { parseId } from "@/utils/parse";
import { KIND_POOLS } from "@/utils/pools";

export const metadata: Metadata = { title: t("headToHead.doublesTitle") };

const PAIRS = [t("headToHead.pairs.a"), t("headToHead.pairs.b")] as const;
const kindName = (kind: PairKind) => t(`headToHead.pairs.kinds.${kind}`);
const FIELDS = ["a1", "a2", "b1", "b2"] as const;

/** A pair's label with its colour: the key that ties every box to its pair */
function PairLabel({ i, className = "" }: { i: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <Swatch color={SIDE_COLORS[i]} className="w-3 h-3" />
      {PAIRS[i]}
    </span>
  );
}

export default function DoublesHeadToHeadPage(props: PageProps<"/head-to-head/doubles">) {
  return (
    <Suspense fallback={<Loading section />}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}

const pairName = (pair: Player[]) => t("headToHead.pairs.names", { a: pair[0].name, b: pair[1].name });

async function Content({ searchParams }: Pick<PageProps<"/head-to-head/doubles">, "searchParams">) {
  const params = await searchParams;
  const ids = FIELDS.map((field) => parseId(params[field]));
  const complete = ids.every((id) => id !== null);
  const h2h = complete ? await getDoublesHeadToHead(...(ids as [number, number, number, number])) : null;
  // Names for the pickers, also when only some players are chosen
  const [players, clubs, meta, gap] = await Promise.all([
    h2h ? [...h2h.a, ...h2h.b] : Promise.all(ids.map((id) => (id ? getPlayer(id) : null))),
    getClubMap(),
    getMeta(),
    getGenderGap(),
  ]);
  const picker = (i: number, label: string) => {
    const p = players[i];
    return <PlayerPicker key={`${FIELDS[i]}-${ids[i]}`} name={FIELDS[i]} label={label} initial={p ? { id: p.id, name: p.name } : null} />;
  };

  return (
    <>
      <Section>
        <Breadcrumbs trail={[{ label: t("headToHead.title"), href: "/head-to-head" }, { label: t("headToHead.doublesCrumb") }]} />
        <h1 className="h1 mt-4">{t("headToHead.title")}</h1>
        <p className="text-2xl max-w-3xl mt-2">{t("headToHead.introDoubles")}</p>
        <HeadToHeadSwitch current="pairs" />
        <form action="/head-to-head/doubles" method="get" className="mt-6 grid gap-4 md:grid-cols-[1fr_auto_1fr] items-center max-w-4xl">
          {[0, 1].map((i) => (
            <fieldset key={i} className={`bg-white p-4 border-t-4 grid gap-2 ${i === 0 ? "md:order-1" : "md:order-3"}`} style={{ borderTopColor: SIDE_COLORS[i] }}>
              <legend className="float-left w-full text-lg mb-1"><PairLabel i={i} /></legend>
              {picker(2 * i, t("headToHead.form.player"))}
              {picker(2 * i + 1, t("headToHead.form.partner"))}
            </fieldset>
          ))}
          <p className="text-center text-gray-600 md:order-2" aria-hidden="true">{t("headToHead.form.vs")}</p>
          <div className="flex gap-2 md:order-4 md:col-span-3">
            <button type="submit" className="px-4 py-2 border border-black bg-black text-white hover:bg-white hover:text-black transition-colors duration-200 cursor-pointer">{t("headToHead.form.compare")}</button>
            {h2h && (
              <Link
                href={doublesHeadToHeadHref([ids[2]!, ids[3]!], [ids[0]!, ids[1]!])}
                className="px-4 py-2 border border-black hover:bg-black hover:text-white transition-colors duration-200"
                title={t("headToHead.form.swapPairs")}
              >
                {t("headToHead.form.swap")}
              </Link>
            )}
          </div>
        </form>
        {complete && !h2h && <p className="mt-4 text-red-700">{t(new Set(ids).size < 4 ? "headToHead.form.fourDifferent" : "headToHead.form.notFound")}</p>}
      </Section>
      {h2h && <Comparison h2h={h2h} clubs={clubs} links={meta?.tournamentLinks ?? {}} gap={gap} />}
    </>
  );
}

function Comparison({ h2h, clubs, links, gap }: { h2h: DoublesHeadToHead; clubs: Record<string, ClubEntry>; links: Record<string, number>; gap: GenderGap | null }) {
  const { record } = h2h;
  const pools = Object.entries(h2h.pools) as [Pool, DoublesHeadToHeadPool][];
  const names: [string, string] = [PAIRS[0], PAIRS[1]];
  return (
    <>
      <Section>
        {/* The two pairs, their record against each other and each pair's record together */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2 md:gap-4 items-stretch text-center [overflow-wrap:anywhere]">
          {[h2h.a, h2h.b].map((pair, i) => (
            <div key={i} className={`bg-white p-3 sm:p-4 md:p-6 border-t-4 ${i === 0 ? "order-1" : "order-3"}`} style={{ borderTopColor: SIDE_COLORS[i] }}>
              <p className="text-lg mb-3">
                <PairLabel i={i} />
                {h2h.kinds[i] && <span className="block text-sm text-gray-600">{capitalize(kindName(h2h.kinds[i]!))}</span>}
              </p>
              {pair.map((player) => (
                <div key={player.id} className="mb-2">
                  <p className="text-lg sm:text-2xl"><Link href={playerHref(player.id)} className="hover:text-blue-600">{player.name}</Link></p>
                  {player.club && <p className="text-gray-600"><Team name={player.club} clubs={clubs} size={5} /></p>}
                </div>
              ))}
              <p className="text-sm text-gray-600">
                {h2h.together[i].matches ? t("headToHead.record.together", { wins: h2h.together[i].wins, losses: h2h.together[i].losses }) : t("headToHead.record.neverTogether")}
              </p>
            </div>
          ))}
          <div className="order-2 bg-white px-2 md:px-6 py-4 flex flex-col justify-center max-w-28 sm:max-w-none">
            <RecordScore record={record} pairs />
          </div>
        </div>
        {h2h.margins.matches > 0 && <MarginsCard margins={h2h.margins} names={names} showPool={pools.length > 1} doubles />}
      </Section>

      {pools.length > 0 ? (
        <Section title={t("headToHead.now.title")} titleClassName="text-3xl mb-2">
          <p className="text-gray-700 mb-6 max-w-3xl">{t("headToHead.now.introDoubles")}</p>
          <Tabs label={t("headToHead.now.tabs")} param="discipline" className="mb-6" tabs={pools.map(([pool, p]) => ({ id: pool, label: <PoolName pool={pool} />, content: <PoolComparison pool={pool} p={p} h2h={h2h} names={names} showMargins={pools.length > 1} /> }))} />
        </Section>
      ) : h2h.crossover ? (
        <Section title={t("headToHead.fun.title")} titleClassName="text-3xl mb-2">
          <p className="text-gray-700 mb-6 max-w-3xl">{t("headToHead.fun.introDoubles", { kindA: kindName(h2h.kinds[0]!), kindB: kindName(h2h.kinds[1]!) })}</p>
          <PoolComparison pool={null} p={h2h.crossover} h2h={h2h} names={names} showMargins={false} />
          {gap && <GenderGapNote gap={gap} format="doubles" extrapolated={[...h2h.crossover.a, ...h2h.crossover.b].some((side) => side.extrapolated)} />}
        </Section>
      ) : (
        <Section title={t("headToHead.now.title")} titleClassName="text-3xl mb-2">
          <p className="text-gray-700 max-w-3xl">{noComparison(h2h)}</p>
        </Section>
      )}

      {h2h.meetings.length > 0 && (
        <Section>
          <MatchTable title={t("headToHead.matches.against")} subtitle={t("headToHead.matches.fromPairA", { pair: pairName(h2h.a) })} matches={h2h.meetings} limit={20} showMargin tournamentLinks={links} />
        </Section>
      )}
    </>
  );
}

/** `pool`: the discipline compared, null for the crossover (everyone on the men's doubles scale) */
function PoolComparison({ pool, p, h2h, names, showMargins }: { pool: Pool | null; p: DoublesHeadToHeadPool; h2h: DoublesHeadToHead; names: [string, string]; showMargins: boolean }) {
  const { crossover } = p;
  const series: ChartSeries[] = [];
  p.history.forEach((history, i) => {
    if (history) series.push({ label: names[i], from: history.from, values: history.ratings, slot: i });
  });
  const players = [h2h.a, h2h.b];
  const poolInText = pool && t(`common.poolsInSentence.${pool}`);
  return (
    <div className="bg-white p-4 md:p-6">
      <h3 className="text-xl mb-4">{p.label}</h3>
      <div className="grid grid-cols-2 gap-4">
        {[p.a, p.b].map((pair, i) => (
          <SideNumbers
            key={i}
            right={i === 1}
            label={
              <>
                <PairLabel i={i} className={i === 1 ? "flex-row-reverse" : ""} /> <span className="sr-only">{t("headToHead.pairs.rating")}</span>
                {crossover && <span className="block">{t("headToHead.fun.onMensDoublesScale")}</span>}
              </>
            }
            value={Math.round(p.ratings[i])}
          >
            {pair.map((side, j) => (
              <dd key={j} className="text-sm text-gray-600">
                {players[i][j].name}: <SideRating side={side} />
              </dd>
            ))}
          </SideNumbers>
        ))}
      </div>
      {/* Win chance as a split bar: pair A's share from the left, pair B's from the right */}
      <div className="mt-6">
        <ChanceBar names={names} chance={p.chance} />
        {p.record.matches > 0 && (
          <p className="text-sm text-gray-600 mt-2">
            {recordSentence(crossover || !poolInText ? plural("headToHead.record.met", p.record.matches) : plural("headToHead.record.metIn", p.record.matches, { pool: poolInText }), names[0], p.record)}
          </p>
        )}
      </div>
      {showMargins && p.margins.matches > 0 && poolInText && (
        <>
          <h4 className="text-lg mt-8 mb-2">{t("headToHead.margins.inPool", { pool: poolInText })}</h4>
          <MarginsTable mg={p.margins} names={names} showPool={false} />
        </>
      )}
      {series.length === 2 && (
        <RatingHistory
          title={t("headToHead.history.pairTitle")}
          intro={t(crossover ? "headToHead.history.pairIntroMensScale" : "headToHead.history.pairIntro")}
          series={series}
          label={t("headToHead.history.pairLabel")}
        />
      )}
    </div>
  );
}

/** Why there are no chances: a player has no rating in the discipline (their pair's own, for pairs of different kinds) */
function noComparison(h2h: DoublesHeadToHead): string {
  const [ka, kb] = h2h.kinds;
  const shared = h2h.disciplines[0];
  const poolOf = (i: number) => shared ?? (i < 2 ? ka && KIND_POOLS[ka] : kb && KIND_POOLS[kb]);
  const unrated = [...h2h.a, ...h2h.b].map((player, i) => ({ player, pool: poolOf(i) })).filter(({ player, pool }) => pool && !player.pools[pool]);
  if (unrated.length) {
    const list = unrated.map(({ player, pool }) => t("headToHead.now.unrated", { name: player.name, pool: t(`common.poolsInSentence.${pool!}`) }));
    return t("headToHead.now.noChances", { list: list.join(t("headToHead.now.unratedJoin")) });
  }
  return t("headToHead.now.differentDisciplines");
}
