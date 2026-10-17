// Two doubles pairs head to head (?a1=<id>&a2=<id>&b1=<id>&b2=<id>): their record against each
// other and each pair's record together, winning margins, and in the doubles discipline the pairs'
// genders put them in (two men's pairs: men's doubles, two mixed pairs: mixed doubles, ...) the
// pairs' ratings (the sum of the partners'), pair A's chance of beating pair B now and both pairs'
// rating histories; then the matches. Pairs that don't play in the same discipline (a men's pair
// against a women's or mixed pair) get a comparison just for fun on the men's doubles scale, with
// women's ratings moved onto it by the gender gap (pipeline/gender-gap.mjs). Pair A is blue and
// pair B orange throughout.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import GenderGapNote from "@/components/GenderGapNote";
import HeadToHeadSwitch from "@/components/HeadToHeadSwitch";
import LineChart, { type ChartSeries } from "@/components/LineChart";
import MarginsTable from "@/components/MarginsTable";
import MatchTable from "@/components/MatchTable";
import PlayerPicker from "@/components/PlayerPicker";
import SideRating from "@/components/SideRating";
import Tabs from "@/components/Tabs";
import Team from "@/components/Team";
import { getClubMap } from "@/lib/clubs";
import { type DoublesHeadToHead, type DoublesHeadToHeadPool, type GenderGap, type PairKind, KIND_POOLS, POOLS, getDoublesHeadToHead, getGenderGap, getMeta, getPlayer } from "@/lib/data";
import { pct } from "@/lib/format";
import { PALETTE } from "@/lib/chart";
import type { ClubEntry, Player, Pool } from "@/lib/types";

export const metadata: Metadata = { title: "Doubles head to head" };

// Pair colours: the first two palette slots, as on the players' head to head
const COLORS = [PALETTE[0], PALETTE[1]];
const PAIRS = ["Pair A", "Pair B"] as const;
const KINDS: Record<PairKind, string> = { men: "men's pair", women: "women's pair", mixed: "mixed pair" };
const capitalize = (text: string) => text[0].toUpperCase() + text.slice(1);
const FIELDS = ["a1", "a2", "b1", "b2"] as const;

/** A pair's label with its colour: the key that ties every box to its pair */
function PairLabel({ i, className = "" }: { i: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="inline-block w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
      {PAIRS[i]}
    </span>
  );
}

export default function DoublesHeadToHeadPage(props: PageProps<"/head-to-head/doubles">) {
  return (
    <Suspense fallback={<div className="base-container px-4 base-section text-gray-600">Loading…</div>}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}

const playerId = (v: string | string[] | undefined) => (typeof v === "string" && /^\d+$/.test(v.trim()) ? Number(v) : null);
const pairName = (pair: Player[]) => `${pair[0].name} and ${pair[1].name}`;

async function Content({ searchParams }: Pick<PageProps<"/head-to-head/doubles">, "searchParams">) {
  const params = await searchParams;
  const ids = FIELDS.map((field) => playerId(params[field]));
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
      <section className="base-section">
        <div className="base-container px-4">
          <Link href="/" className="text-gray-600 hover:text-black">&larr; Rankings</Link>
          <h1 className="h1 mt-4">Head to head</h1>
          <p className="text-2xl max-w-3xl mt-2">Two doubles pairs&apos; matches against each other, and their chances if they met now.</p>
          <HeadToHeadSwitch current="pairs" />
          <form action="/head-to-head/doubles" method="get" className="mt-6 grid gap-4 md:grid-cols-[1fr_auto_1fr] items-center max-w-4xl">
            {[0, 1].map((i) => (
              <fieldset key={i} className={`bg-white p-4 border-t-4 grid gap-2 ${i === 0 ? "md:order-1" : "md:order-3"}`} style={{ borderTopColor: COLORS[i] }}>
                <legend className="float-left w-full text-lg mb-1"><PairLabel i={i} /></legend>
                {picker(2 * i, "Player")}
                {picker(2 * i + 1, "Partner")}
              </fieldset>
            ))}
            <p className="text-center text-gray-600 md:order-2" aria-hidden="true">vs</p>
            <div className="flex gap-2 md:order-4 md:col-span-3">
              <button type="submit" className="px-4 py-2 border border-black bg-black text-white hover:bg-white hover:text-black transition-colors duration-200 cursor-pointer">Compare</button>
              {h2h && (
                <Link
                  href={`/head-to-head/doubles?a1=${ids[2]}&a2=${ids[3]}&b1=${ids[0]}&b2=${ids[1]}`}
                  className="px-4 py-2 border border-black hover:bg-black hover:text-white transition-colors duration-200"
                  title="Swap the pairs"
                >
                  Swap
                </Link>
              )}
            </div>
          </form>
          {complete && !h2h && <p className="mt-4 text-red-700">{new Set(ids).size < 4 ? "Choose four different players." : "One of the players was not found."}</p>}
        </div>
      </section>
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
      <section className="base-section">
        <div className="base-container px-4">
          {/* The two pairs, their record against each other and each pair's record together */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 md:gap-4 items-stretch text-center">
            {[h2h.a, h2h.b].map((pair, i) => (
              <div key={i} className={`bg-white p-4 md:p-6 border-t-4 ${i === 0 ? "order-1" : "order-3"}`} style={{ borderTopColor: COLORS[i] }}>
                <p className="text-lg mb-3">
                  <PairLabel i={i} />
                  {h2h.kinds[i] && <span className="block text-sm text-gray-600">{capitalize(KINDS[h2h.kinds[i]!])}</span>}
                </p>
                {pair.map((player) => (
                  <div key={player.id} className="mb-2">
                    <p className="text-2xl"><Link href={`/players/${player.id}`} className="hover:text-blue-600">{player.name}</Link></p>
                    {player.club && <p className="text-gray-600"><Team name={player.club} clubs={clubs} size={5} /></p>}
                  </div>
                ))}
                <p className="text-sm text-gray-600">
                  {h2h.together[i].matches ? `Together: ${h2h.together[i].wins} won, ${h2h.together[i].losses} lost` : "Never played together"}
                </p>
              </div>
            ))}
            <div className="order-2 bg-white px-2 md:px-6 py-4 flex flex-col justify-center">
              {record.matches ? (
                <>
                  <p className="text-5xl font-semibold tabular-nums">
                    {record.wins}<span className="text-gray-400 mx-2">–</span>{record.losses}
                  </p>
                  <p className="text-sm text-gray-600">
                    {record.matches} {record.matches === 1 ? "match" : "matches"} against each other{record.draws ? `, ${record.draws} drawn` : ""}, pair A first
                  </p>
                </>
              ) : (
                <p className="text-gray-600">Never met</p>
              )}
            </div>
          </div>
          {h2h.margins.matches > 0 && (
            <div className="bg-white p-4 md:p-6 mt-6">
              <h2 className="text-xl mb-1">Winning margins</h2>
              <p className="text-sm text-gray-600 mb-4">
                Over their {h2h.margins.matches} {h2h.margins.matches === 1 ? "match" : "matches"} against each other with a score (not walkovers), all doubles disciplines.
              </p>
              <MarginsTable mg={h2h.margins} names={names} showPool={pools.length > 1} />
            </div>
          )}
        </div>
      </section>

      {pools.length > 0 ? (
        <section className="base-section">
          <div className="base-container px-4">
            <h2 className="text-3xl mb-2">If they met now</h2>
            <p className="text-gray-700 mb-6 max-w-3xl">
              Current ratings and pair A&apos;s chance of winning against pair B. A pair plays at the sum of its players&apos; ratings, and pairs are compared in the discipline their genders put them
              in: two men&apos;s pairs in men&apos;s doubles, two mixed pairs in mixed doubles.
            </p>
            <Tabs label="Disciplines" param="discipline" className="mb-6" tabs={pools.map(([pool, p]) => ({ id: pool, label: p.label, content: <PoolComparison p={p} h2h={h2h} names={names} showMargins={pools.length > 1} /> }))} />
          </div>
        </section>
      ) : h2h.crossover ? (
        <section className="base-section">
          <div className="base-container px-4">
            <h2 className="text-3xl mb-2">Just for fun</h2>
            <p className="text-gray-700 mb-6 max-w-3xl">
              Pair A is a {KINDS[h2h.kinds[0]!]} and pair B a {KINDS[h2h.kinds[1]!]}, so they don&apos;t play in the same discipline. Here everyone plays on the men&apos;s doubles scale: men at
              their men&apos;s doubles rating, women at their women&apos;s doubles rating moved onto the men&apos;s scale, and a pair at the sum.
            </p>
            <PoolComparison p={h2h.crossover} h2h={h2h} names={names} showMargins={false} />
            {gap && <GenderGapNote gap={gap} format="doubles" extrapolated={[...h2h.crossover.a, ...h2h.crossover.b].some((side) => side.extrapolated)} />}
          </div>
        </section>
      ) : (
        <section className="base-section">
          <div className="base-container px-4">
            <h2 className="text-3xl mb-2">If they met now</h2>
            <p className="text-gray-700 max-w-3xl">{noComparison(h2h)}</p>
          </div>
        </section>
      )}

      {h2h.meetings.length > 0 && (
        <section className="base-section">
          <div className="base-container px-4">
            <MatchTable title="Matches against each other" subtitle={`From pair A's side (${pairName(h2h.a)}), newest first`} matches={h2h.meetings} limit={20} showMargin tournamentLinks={links} />
          </div>
        </section>
      )}
    </>
  );
}

function PoolComparison({ p, h2h, names, showMargins }: { p: DoublesHeadToHeadPool; h2h: DoublesHeadToHead; names: [string, string]; showMargins: boolean }) {
  const { crossover } = p;
  const series: ChartSeries[] = [];
  p.history.forEach((history, i) => {
    if (history) series.push({ label: names[i], from: history.from, values: history.ratings, slot: i });
  });
  const players = [h2h.a, h2h.b];
  return (
    <div className="bg-white p-4 md:p-6">
      <h3 className="text-xl mb-4">{p.label}</h3>
      <div className="grid grid-cols-2 gap-4">
        {[p.a, p.b].map((pair, i) => (
          <dl key={i} className={i === 1 ? "text-right" : ""}>
            <dt className="text-sm text-gray-600">
              <PairLabel i={i} className={i === 1 ? "flex-row-reverse" : ""} /> <span className="sr-only">rating</span>
              {crossover && <span className="block">on the men&apos;s doubles scale</span>}
            </dt>
            <dd className="text-3xl font-semibold tabular-nums">{Math.round(p.ratings[i])}</dd>
            {pair.map((side, j) => (
              <dd key={j} className="text-sm text-gray-600">
                {players[i][j].name}: <SideRating side={side} />
              </dd>
            ))}
          </dl>
        ))}
      </div>
      {/* Win chance as a split bar: pair A's share from the left, pair B's from the right */}
      <div className="mt-6">
        <div className="flex justify-between gap-4 text-sm mb-1 tabular-nums">
          <span><strong className="text-base">{pct(p.chance)}</strong> {names[0]}</span>
          <span className="text-right">{names[1]} <strong className="text-base">{pct(1 - p.chance)}</strong></span>
        </div>
        <div className="flex h-3 gap-0.5" role="img" aria-label={`${names[0]} ${pct(p.chance)}, ${names[1]} ${pct(1 - p.chance)}`}>
          <div className="rounded-l" style={{ width: `${(p.chance * 100).toFixed(1)}%`, background: COLORS[0] }} />
          <div className="rounded-r flex-1" style={{ background: COLORS[1] }} />
        </div>
        {p.record.matches > 0 && (
          <p className="text-sm text-gray-600 mt-2">
            Met {p.record.matches} {p.record.matches === 1 ? "time" : "times"}{crossover ? "" : ` in ${p.label.toLowerCase()}`}: {names[0]} won {p.record.wins}, lost {p.record.losses}{p.record.draws ? `, drew ${p.record.draws}` : ""}.
          </p>
        )}
      </div>
      {showMargins && p.margins.matches > 0 && (
        <>
          <h4 className="text-lg mt-8 mb-2">Winning margins in {p.label.toLowerCase()}</h4>
          <MarginsTable mg={p.margins} names={names} showPool={false} />
        </>
      )}
      {series.length === 2 && (
        <>
          <h4 className="text-lg mt-8 mb-1">Pair rating history</h4>
          <p className="text-sm text-gray-600 mb-4">
            The sum of the partners&apos; ratings at the end of each week both were rated{crossover ? ", on the men's doubles scale" : ""}
          </p>
          <LineChart series={series} label="Pair rating" className="relative h-72" />
        </>
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
    const list = unrated.map(({ player, pool }) => `${player.name} has no rating in ${POOLS[pool!].toLowerCase()}`);
    return `${list.join(", and ")}, so there are no chances to compare.`;
  }
  return "The pairs don't play in the same doubles discipline, so their ratings can't be compared.";
}
