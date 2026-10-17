// Two players head to head (?a=<id>&b=<id>): their record against each other and together,
// winning margins, and per discipline both play their ratings, A's chance of beating B now and
// both rating histories; then the matches. A man and a woman also get a comparison just for fun in
// singles and doubles, with her rating moved onto the men's scale by the gender gap
// (pipeline/gender-gap.mjs).
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import LineChart, { type ChartSeries } from "@/components/LineChart";
import GenderGapNote from "@/components/GenderGapNote";
import HeadToHeadSwitch from "@/components/HeadToHeadSwitch";
import MarginsTable from "@/components/MarginsTable";
import MatchTable from "@/components/MatchTable";
import PlayerPicker from "@/components/PlayerPicker";
import SideRating from "@/components/SideRating";
import Tabs from "@/components/Tabs";
import Team from "@/components/Team";
import { getClubMap } from "@/lib/clubs";
import { type GenderGap, type HeadToHead, type HeadToHeadCrossover, type HeadToHeadPool, getGenderGap, getHeadToHead, getMeta, getPlayer } from "@/lib/data";
import { pct } from "@/lib/format";
import { PALETTE } from "@/lib/chart";
import type { ClubEntry, Player, Pool } from "@/lib/types";

export const metadata: Metadata = { title: "Head to head" };

// Series colours: the first two palette slots
const COLORS = [PALETTE[0], PALETTE[1]];

export default function HeadToHeadPage(props: PageProps<"/head-to-head">) {
  return (
    <Suspense fallback={<div className="base-container px-4 base-section text-gray-600">Loading…</div>}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}

const playerId = (v: string | string[] | undefined) => (typeof v === "string" && /^\d+$/.test(v.trim()) ? Number(v) : null);

async function Content({ searchParams }: Pick<PageProps<"/head-to-head">, "searchParams">) {
  const params = await searchParams;
  const idA = playerId(params.a);
  const idB = playerId(params.b);
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
      <section className="base-section">
        <div className="base-container px-4">
          <Link href="/" className="text-gray-600 hover:text-black">&larr; Rankings</Link>
          <h1 className="h1 mt-4">Head to head</h1>
          <p className="text-2xl max-w-3xl mt-2">Two players&apos; matches against each other and together, and their chances if they met now.</p>
          <HeadToHeadSwitch current="players" />
          <form action="/head-to-head" method="get" className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_auto] items-end max-w-4xl">
            <PlayerPicker key={`a-${idA}`} name="a" label="Player" initial={playerA ? { id: playerA.id, name: playerA.name } : null} />
            <PlayerPicker key={`b-${idB}`} name="b" label="Against" initial={playerB ? { id: playerB.id, name: playerB.name } : null} />
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 border border-black bg-black text-white hover:bg-white hover:text-black transition-colors duration-200 cursor-pointer">Compare</button>
              {h2h && (
                <Link href={`/head-to-head?a=${idB}&b=${idA}`} className="px-4 py-2 border border-black hover:bg-black hover:text-white transition-colors duration-200" title="Swap the players">Swap</Link>
              )}
            </div>
          </form>
          {idA && idB && !h2h && <p className="mt-4 text-red-700">{idA === idB ? "Choose two different players." : "One of the players was not found."}</p>}
        </div>
      </section>
      {h2h && <Comparison h2h={h2h} clubs={clubs} links={meta?.tournamentLinks ?? {}} gap={gap} />}
    </>
  );
}

function Comparison({ h2h, clubs, links, gap }: { h2h: HeadToHead; clubs: Record<string, ClubEntry>; links: Record<string, number>; gap: GenderGap | null }) {
  const { a, b, record } = h2h;
  const pools = Object.entries(h2h.pools) as [Pool, HeadToHeadPool][];
  return (
    <>
      <section className="base-section">
        <div className="base-container px-4">
          {/* The two players and their record against each other */}
          <div className="bg-white p-4 md:p-6 grid grid-cols-[1fr_auto_1fr] gap-4 items-center text-center">
            {[a, b].map((player, i) => (
              <div key={player.id} className={i === 0 ? "order-1" : "order-3"}>
                <span className="inline-block w-8 h-1 rounded-full mb-2" style={{ background: COLORS[i] }} />
                <p className="text-2xl"><Link href={`/players/${player.id}`} className="hover:text-blue-600">{player.name}</Link></p>
                {player.club && <p className="text-gray-600"><Team name={player.club} clubs={clubs} size={5} /></p>}
              </div>
            ))}
            <div className="order-2 px-2">
              {record.matches ? (
                <>
                  <p className="text-5xl font-semibold tabular-nums">
                    {record.wins}<span className="text-gray-400 mx-2">–</span>{record.losses}
                  </p>
                  <p className="text-sm text-gray-600">
                    {record.matches} {record.matches === 1 ? "match" : "matches"} against each other{record.draws ? `, ${record.draws} drawn` : ""}
                  </p>
                </>
              ) : (
                <p className="text-gray-600">Never met</p>
              )}
              {h2h.togetherRecord.matches > 0 && <p className="text-sm text-gray-600 mt-2">Together: {h2h.togetherRecord.wins} won, {h2h.togetherRecord.losses} lost</p>}
            </div>
          </div>
          {h2h.margins.matches > 0 && (
            <div className="bg-white p-4 md:p-6 mt-6">
              <h2 className="text-xl mb-1">Winning margins</h2>
              <p className="text-sm text-gray-600 mb-4">
                Over their {h2h.margins.matches} {h2h.margins.matches === 1 ? "match" : "matches"} against each other with a score (not walkovers), all disciplines.
              </p>
              <MarginsTable mg={h2h.margins} names={[a.name, b.name]} showPool={pools.length > 1} />
            </div>
          )}
        </div>
      </section>

      {pools.length > 0 && (
        <section className="base-section">
          <div className="base-container px-4">
            <h2 className="text-3xl mb-2">If they met now</h2>
            <p className="text-gray-700 mb-6 max-w-3xl">
              Current ratings in each discipline both play, and {a.name}&apos;s chance of winning against {b.name}. Singles and men&apos;s or women&apos;s doubles are only compared between players of the same gender. In doubles, the chance is with equally rated partners: a pair&apos;s rating is the sum of
              its players&apos;.
            </p>
            <Tabs label="Disciplines" param="discipline" className="mb-6" tabs={pools.map(([pool, p]) => ({ id: pool, label: p.label, content: <PoolComparison pool={pool} p={p} a={a} b={b} showMargins={pools.length > 1} /> }))} />
          </div>
        </section>
      )}

      {h2h.crossovers.length > 0 && (
        <section className="base-section">
          <div className="base-container px-4">
            <h2 className="text-3xl mb-2">Just for fun</h2>
            <p className="text-gray-700 mb-6 max-w-3xl">
              Men and women are rated in separate disciplines, so their ratings can&apos;t be compared as they are. Here are {a.name}&apos;s and {b.name}&apos;s
              chances if they did, with the woman&apos;s rating moved onto the men&apos;s scale. In doubles, the chance is with equally rated partners.
            </p>
            <Tabs
              label="Just for fun"
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
          </div>
        </section>
      )}

      {(h2h.meetings.length > 0 || h2h.together.length > 0) && (
        <section className="base-section">
          <div className="base-container px-4 grid gap-6">
            {h2h.meetings.length > 0 && <MatchTable title="Matches against each other" subtitle={`From ${a.name}'s side, newest first`} matches={h2h.meetings} limit={20} showMargin tournamentLinks={links} />}
            {h2h.together.length > 0 && <MatchTable title="Together as partners" subtitle={`From ${a.name}'s side, newest first`} matches={h2h.together} limit={20} tournamentLinks={links} />}
          </div>
        </section>
      )}
    </>
  );
}

function PoolComparison({ pool, p, a, b, showMargins }: { pool: Pool; p: HeadToHeadPool; a: Player; b: Player; showMargins: boolean }) {
  const series: ChartSeries[] = [];
  [p.a, p.b].forEach((side, i) => {
    if (side.history && side.history.ratings.length > 1) series.push({ label: [a, b][i].name, from: side.history.from, values: side.history.ratings, slot: i });
  });
  return (
    <div className="bg-white p-4 md:p-6">
      <h3 className="text-xl mb-4">{p.label}</h3>
      <div className="grid grid-cols-2 gap-4">
        {[p.a, p.b].map((side, i) => (
          <dl key={i} className={i === 1 ? "text-right" : ""}>
            <dt className="text-sm text-gray-600">{[a, b][i].name}</dt>
            <dd className="text-3xl font-semibold tabular-nums">
              {Math.round(side.rating)} <span className="text-base font-normal text-gray-500" title="95% range">±{side.plusMinus}</span>
            </dd>
            <dd className="text-sm text-gray-600">
              {side.rank ? `#${side.rank}${pool === "mixedDoubles" ? ` among ${side.gender === "K" ? "women" : "men"}` : ""}` : "Not ranked"} · peak {Math.round(side.peak)}
            </dd>
          </dl>
        ))}
      </div>
      {/* Win chance as a split bar: A's share from the left, B's from the right */}
      <div className="mt-6">
        <div className="flex justify-between text-sm mb-1 tabular-nums">
          <span><strong className="text-base">{pct(p.chance)}</strong> {a.name}</span>
          <span>{b.name} <strong className="text-base">{pct(1 - p.chance)}</strong></span>
        </div>
        <div className="flex h-3 gap-0.5" role="img" aria-label={`${a.name} ${pct(p.chance)}, ${b.name} ${pct(1 - p.chance)}`}>
          <div className="rounded-l" style={{ width: `${(p.chance * 100).toFixed(1)}%`, background: COLORS[0] }} />
          <div className="rounded-r flex-1" style={{ background: COLORS[1] }} />
        </div>
        {p.record.matches > 0 && (
          <p className="text-sm text-gray-600 mt-2">
            Met {p.record.matches} {p.record.matches === 1 ? "time" : "times"} in {p.label.toLowerCase()}: {a.name} won {p.record.wins}, lost {p.record.losses}{p.record.draws ? `, drew ${p.record.draws}` : ""}.
          </p>
        )}
      </div>
      {showMargins && p.margins.matches > 0 && (
        <>
          <h4 className="text-lg mt-8 mb-2">Winning margins in {p.label.toLowerCase()}</h4>
          <MarginsTable mg={p.margins} names={[a.name, b.name]} showPool={false} />
        </>
      )}
      {series.length === 2 && (
        <>
          <h4 className="text-lg mt-8 mb-1">Rating history</h4>
          <p className="text-sm text-gray-600 mb-4">Rating at the end of each week</p>
          <LineChart series={series} label="Rating" className="relative h-72" />
        </>
      )}
    </div>
  );
}

/** A man against a woman, just for fun: both on the men's scale, the chance and both histories */
function CrossoverComparison({ c, a, b }: { c: HeadToHeadCrossover; a: Player; b: Player }) {
  const series: ChartSeries[] = [];
  c.history.forEach((history, i) => {
    if (history) series.push({ label: [a, b][i].name, from: history.from, values: history.ratings, slot: i });
  });
  return (
    <div className="bg-white p-4 md:p-6">
      <h3 className="text-xl mb-4">{c.label}, on the men&apos;s scale</h3>
      <div className="grid grid-cols-2 gap-4">
        {[c.a, c.b].map((side, i) => (
          <dl key={i} className={i === 1 ? "text-right" : ""}>
            <dt className="text-sm text-gray-600">{[a, b][i].name}</dt>
            <dd className="text-3xl font-semibold tabular-nums">{Math.round(side.rating)}{side.extrapolated ? "*" : ""}</dd>
            <dd className="text-sm text-gray-600"><SideRating side={side} /></dd>
          </dl>
        ))}
      </div>
      <div className="mt-6">
        <div className="flex justify-between text-sm mb-1 tabular-nums">
          <span><strong className="text-base">{pct(c.chance)}</strong> {a.name}</span>
          <span>{b.name} <strong className="text-base">{pct(1 - c.chance)}</strong></span>
        </div>
        <div className="flex h-3 gap-0.5" role="img" aria-label={`${a.name} ${pct(c.chance)}, ${b.name} ${pct(1 - c.chance)}`}>
          <div className="rounded-l" style={{ width: `${(c.chance * 100).toFixed(1)}%`, background: COLORS[0] }} />
          <div className="rounded-r flex-1" style={{ background: COLORS[1] }} />
        </div>
        {c.record.matches > 0 && (
          <p className="text-sm text-gray-600 mt-2">
            They have met {c.record.matches} {c.record.matches === 1 ? "time" : "times"} in men&apos;s {c.format}: {a.name} won {c.record.wins}, lost {c.record.losses}
            {c.record.draws ? `, drew ${c.record.draws}` : ""}.
          </p>
        )}
      </div>
      {series.length === 2 && (
        <>
          <h4 className="text-lg mt-8 mb-1">Rating history</h4>
          <p className="text-sm text-gray-600 mb-4">Rating at the end of each week, on the men&apos;s scale</p>
          <LineChart series={series} label="Rating" className="relative h-72" />
        </>
      )}
    </div>
  );
}
