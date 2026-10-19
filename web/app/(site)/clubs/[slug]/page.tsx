// A club (CMS entry) with its strength over time and, per discipline, its strength history and
// ranked players.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { clubRule } from "@/components/ClubRule";
import { ArrowLeft } from "@/components/Icons";
import LineChart, { type ChartSeries } from "@/components/LineChart";
import PoolName from "@/components/PoolName";
import { WeekChange } from "@/components/RankMovement";
import SeasonLabel from "@/components/SeasonLabel";
import Tabs from "@/components/Tabs";
import { getClubBySlug, getClubEntries } from "@/lib/clubs";
import { POOLS, POOL_KEYS, getClubHistory, getClubPlayers, getClubsFile } from "@/lib/data";
import { num } from "@/lib/format";
import { strongestClubsHref } from "@/lib/rankings";
import type { ClubEntry, ClubHistoryPool, ClubsFile, Pool } from "@/lib/types";

// A few clubs are prerendered at build; the rest are rendered on their first visit and then served
// from the cache until the data or the club content changes (ISR).
export async function generateStaticParams() {
  const clubs = (await getClubEntries()).slice(0, 5);
  return clubs.length ? clubs.map((c) => ({ slug: c.slug })) : [{ slug: "_" }];
}

export async function generateMetadata({ params }: PageProps<"/clubs/[slug]">): Promise<Metadata> {
  const club = await getClubBySlug(decodeURIComponent((await params).slug));
  return { title: club?.title ?? "Club" };
}

export default function ClubPage(props: PageProps<"/clubs/[slug]">) {
  return (
    <Suspense fallback={<div className="base-container px-4 base-section text-gray-600">Loading club…</div>}>
      <Content params={props.params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<PageProps<"/clubs/[slug]">, "params">) {
  const entry = await getClubBySlug(decodeURIComponent((await params).slug));
  if (!entry) notFound();
  const [history, file] = await Promise.all([entry.nbfClubId ? getClubHistory(entry.nbfClubId) : Promise.resolve({} as Awaited<ReturnType<typeof getClubHistory>>), getClubsFile()]);
  const combinedStanding = file?.clubs.combined.find((c) => c.club === entry.title);
  const players = await Promise.all(POOL_KEYS.map((pool) => getClubPlayers(entry.title, pool)));

  return (
    <>
      <section className="base-section">
        <div className="base-container px-4">
          <Link href="/clubs" className="text-gray-600 hover:text-black"><ArrowLeft /> Strongest clubs</Link>
          <div className="flex items-center gap-6 mt-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {entry.logo && <img src={entry.logo} alt="" className="w-20 h-20 object-contain shrink-0" />}
            <div>
              <h1 className="h1">{entry.title}</h1>
              {entry.fullName && entry.fullName !== entry.title && <p className="text-2xl text-gray-700">{entry.fullName}</p>}
            </div>
          </div>
          <p className="text-gray-600 mt-4">
            {entry.region}
            {combinedStanding && (
              <>
                {" · "}
                <Link href="/clubs" className="underline hover:text-blue-600">#{combinedStanding.rank} of the strongest clubs combined</Link>
              </>
            )}
            {entry.website && (
              <>
                {" · "}
                <a href={entry.website} className="underline hover:text-blue-600" rel="noopener">{entry.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a>
              </>
            )}
          </p>
        </div>
      </section>

      <OverTime history={history} />

      {/* One tab per discipline, as on the player page; the selected tab is kept in the URL (?discipline=mixedDoubles) */}
      <section className="base-section">
        <div className="base-container px-4">
          <Tabs
            label="Disciplines"
            param="discipline"
            tabs={POOL_KEYS.map((pool, i) => ({
              id: pool,
              label: <PoolName pool={pool} />,
              content: <Discipline pool={pool} entry={entry} history={history[pool] ?? null} file={file} players={players[i]} />,
            }))}
          />
        </div>
      </section>
    </>
  );
}

/** All disciplines together and the combined score, over time, with a table by season */
function OverTime({ history }: { history: Partial<Record<Pool | "combined", ClubHistoryPool>> }) {
  const series: (ChartSeries & { pool: Pool })[] = [];
  for (const pool of POOL_KEYS) {
    const h = history[pool];
    if (h && h.strength.length > 1) series.push({ pool, label: POOLS[pool], from: h.from, values: h.strength, ranks: h.rank, counts: h.clubs, slot: POOL_KEYS.indexOf(pool) });
  }
  const combined = history.combined ?? null;
  if (series.length < 2 && !combined) return null;
  const columns: { key: Pool | "combined"; label: string }[] = [...series.map((s) => ({ key: s.pool, label: s.label })), ...(combined ? [{ key: "combined" as const, label: "Combined" }] : [])];
  const seasons = new Map<number, Partial<Record<Pool | "combined", number | null>>>();
  for (const c of columns) for (const row of history[c.key]?.seasons ?? []) seasons.set(row.season, { ...seasons.get(row.season), [c.key]: row.strength });

  return (
    <section className="base-section">
      <div className="base-container px-4">
        <h2 className="text-3xl mb-6">Over time</h2>
        {series.length > 1 && (
          <div className="bg-white p-4 md:p-6 mb-6">
            <h3 className="text-xl mb-1">All disciplines</h3>
            <p className="text-sm text-gray-600 mb-4">
              Club strength in each discipline at the end of each week. Doubles ratings spread over a narrower range than singles, so compare how each line moves rather than the levels between singles and doubles.
            </p>
            <LineChart series={series} label="Strength" rankOf="clubs" />
          </div>
        )}
        {combined && combined.strength.length > 1 && (
          <div className="bg-white p-4 md:p-6 mb-6">
            <h3 className="text-xl mb-1">Combined</h3>
            <p className="text-sm text-gray-600 mb-4">
              Average standard score over all five disciplines, among the clubs with a strength in all five that week: 0 is an average club, +1 one standard deviation above it. Gaps are weeks the club
              wasn&apos;t strong enough to be listed in every discipline.
            </p>
            <LineChart series={[{ label: "Combined score", from: combined.from, values: combined.strength, ranks: combined.rank, counts: combined.clubs }]} label="Combined score" rankOf="clubs" decimals={2} signed className="relative h-72" />
          </div>
        )}
        {/* Table view of both charts: values at the end of each season (July to June) */}
        <details>
          <summary className="cursor-pointer text-gray-700 hover:text-black">Strength by season</summary>
          <div className="overflow-x-auto">
            <table className="mt-2 text-left">
              <thead className="text-sm text-gray-600">
                <tr>
                  <th scope="col" className="py-1 pr-3 sm:pr-6 font-normal">Season</th>
                  {columns.map((c) => <th key={c.key} scope="col" className="py-1 pr-3 sm:pr-6 font-normal text-right whitespace-nowrap">{c.key === "combined" ? c.label : <PoolName pool={c.key} />}</th>)}
                </tr>
              </thead>
              <tbody className="text-sm sm:text-base">
                {[...seasons].sort(([a], [b]) => a - b).map(([season, row]) => (
                  <tr key={season}>
                    <td className="py-1 pr-3 sm:pr-6 whitespace-nowrap"><SeasonLabel season={season} /></td>
                    {columns.map((c) => {
                      const v = row[c.key];
                      return (
                        <td key={c.key} className="py-1 pr-3 sm:pr-6 text-right tabular-nums">
                          {v == null ? <span className="text-gray-400">–</span> : c.key === "combined" ? `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(2)}` : v}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-600 mt-2">Values at the end of each season (or the latest week for the current one).</p>
        </details>
      </div>
    </section>
  );
}

function Discipline({ pool, entry, history, file, players }: { pool: Pool; entry: ClubEntry; history: ClubHistoryPool | null; file: ClubsFile | null; players: Awaited<ReturnType<typeof getClubPlayers>> }) {
  const label = POOLS[pool];
  const standing = file?.clubs[pool].find((c) => c.club === entry.title);
  const rule = file?.clubStrength[pool];
  return (
    <div>
      <h2 className="text-3xl mb-2">{label}</h2>
      {history && history.strength.length > 1 && rule && (
        <div className="bg-white p-4 md:p-6 my-6">
          <h3 className="text-xl mb-1">Strength history</h3>
          <p className="text-sm text-gray-600 mb-4">
            The club&apos;s strength at the end of each week: {clubRule(rule)}, counting players who played for the club at the time. Places it couldn&apos;t fill count at the lowest rating among ranked
            players. Gaps are weeks without any ranked player.
          </p>
          <LineChart series={[{ label: "Club strength", from: history.from, values: history.strength, ranks: history.rank, counts: history.clubs }]} label="Club strength" rankOf="clubs" className="relative h-72" />
          {/* Table view of the chart: strength and rank at the end of each season, precomputed by rate.mjs */}
          <details className="mt-4">
            <summary className="cursor-pointer text-gray-700 hover:text-black">Strength by season</summary>
            <table className="mt-2 text-left">
              <thead className="text-sm text-gray-600">
                <tr>
                  <th scope="col" className="py-1 pr-8 font-normal">Season</th>
                  <th scope="col" className="py-1 pr-8 font-normal text-right">Strength at end</th>
                  <th scope="col" className="py-1 font-normal">Rank</th>
                </tr>
              </thead>
              <tbody>
                {(history.seasons ?? []).map((s) => (
                  <tr key={s.season}>
                    <td className="py-1 pr-8">{s.season}/{s.season + 1}</td>
                    <td className="py-1 pr-8 text-right tabular-nums">{s.strength}</td>
                    <td className="py-1 tabular-nums">#{s.rank} of {s.clubs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>
      )}
      {players.length === 0 ? (
        <p className="text-gray-600">No ranked players: nobody from {entry.title} has played {label.toLowerCase()} in the last 12 months.</p>
      ) : (
        <>
          <p className="text-gray-600 mb-6">
            {num(players.length)} ranked {players.length === 1 ? "player" : "players"}
            {standing && (
              <>
                {" · "}
                <Link href={strongestClubsHref(pool)} className="underline hover:text-blue-600">#{standing.rank} of the strongest clubs</Link> (strength {Math.round(standing.strength)})
              </>
            )}
          </p>
          <div className="bg-white overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-sm text-gray-600 border-b border-gray-200">
                <tr>
                  <th scope="col" className="py-3 px-4 font-normal text-right w-16">#</th>
                  <th scope="col" className="py-3 px-4 font-normal">Player</th>
                  <th scope="col" className="py-3 pl-4 pr-1.5 font-normal text-right">Rating</th>
                  <th scope="col" className="py-3 pr-4 font-normal w-14"><span className="sr-only">Change since last week</span></th>
                  <th scope="col" className="py-3 px-4 font-normal text-right hidden sm:table-cell">Matches</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="py-3 px-4 text-right text-gray-600 tabular-nums">{p.rank}</td>
                    <td className="py-3 px-4">
                      <Link href={`/players/${p.id}`} className="hover:text-blue-600">{p.name}</Link>
                      {pool === "mixedDoubles" && <span className="text-sm text-gray-600"> {p.gender === "K" ? "woman" : "man"}</span>}
                    </td>
                    <td className="py-3 pl-4 pr-1.5 text-right tabular-nums">{Math.round(p.rating)}</td>
                    <td className="py-3 pr-4 whitespace-nowrap"><WeekChange change={p.ratingChange} /></td>
                    <td className="py-3 px-4 text-right text-gray-700 tabular-nums hidden sm:table-cell">{num(p.matches)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-600 mt-2"># is the national rank in {label.toLowerCase()}{pool === "mixedDoubles" ? ", among men or among women" : ""}.</p>
        </>
      )}
    </div>
  );
}
