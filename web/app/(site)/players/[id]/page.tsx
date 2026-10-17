// One player: club, rating and ranking history in every discipline (with tables by season), their
// biggest rivals over all disciplines, and per discipline their rating, rank, peak, matches, rating
// history, match list and highlights (biggest wins and losses, rating gains and drops).
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import LineChart, { type ChartSeries } from "@/components/LineChart";
import MatchTable from "@/components/MatchTable";
import Tabs from "@/components/Tabs";
import { getClubMap } from "@/lib/clubs";
import { POOLS, POOL_KEYS, getMeta, getPlayer, getRankings } from "@/lib/data";
import { date, num } from "@/lib/format";
import { rankingHref } from "@/lib/rankings";
import type { Player, PlayerPool, Pool, Rival, SeasonRow } from "@/lib/types";

// The best ten men are prerendered at build; every other player page is rendered on its first visit
// and then served from the cache until the next data update (ISR), instead of on every request.
export async function generateStaticParams() {
  const top = (await getRankings("men")).slice(0, 10);
  return top.length ? top.map((p) => ({ id: String(p.id) })) : [{ id: "0" }];
}

export async function generateMetadata({ params }: PageProps<"/players/[id]">): Promise<Metadata> {
  const player = await getPlayer(Number((await params).id));
  return { title: player?.name ?? "Player" };
}

export default function PlayerPage(props: PageProps<"/players/[id]">) {
  return (
    <Suspense fallback={<div className="base-container px-4 base-section text-gray-600">Loading player…</div>}>
      <PlayerContent params={props.params} />
    </Suspense>
  );
}

async function PlayerContent({ params }: Pick<PageProps<"/players/[id]">, "params">) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const [player, clubs, meta] = await Promise.all([getPlayer(Number(id)), getClubMap(), getMeta()]);
  if (!player) notFound();
  const club = player.club ? clubs[player.club] : null;
  const pools = Object.entries(player.pools) as [Pool, PlayerPool][];
  const links = meta?.tournamentLinks ?? {};

  return (
    <>
      <section className="base-section">
        <div className="base-container px-4">
          <Link href="/" className="text-gray-600 hover:text-black">&larr; Rankings</Link>
          <h1 className="h1 mt-4">{player.name}</h1>
          {player.club && (
            <p className="flex items-center gap-3 text-2xl text-gray-700 mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {club?.logo && <img src={club.logo} alt="" className="w-10 h-10 object-contain shrink-0" />}
              {club ? <Link href={`/clubs/${club.slug}`} className="hover:text-blue-600">{player.club}</Link> : player.club}
            </p>
          )}
          <p className="mt-4">
            <Link href={`/head-to-head?a=${player.id}`} className="underline hover:text-blue-600">Compare head to head with another player &rarr;</Link>
          </p>
        </div>
      </section>

      <AllDisciplines player={player} />

      {player.rivals && player.rivals.length > 0 && <Rivals player={player} rivals={player.rivals} />}

      {/* One tab per discipline (no tabs for players with a single discipline) */}
      <section className="base-section">
        <div className="base-container px-4">
          <Tabs
            label="Disciplines"
            param="discipline"
            tabs={pools.map(([pool, p]) => ({ id: pool, label: p.label, content: <Discipline pool={pool} p={p} player={player} links={links} /> }))}
          />
        </div>
      </section>
    </>
  );
}

/** The closest rivals over all disciplines: the biggest in full, then the others */
function Rivals({ player, rivals }: { player: Player; rivals: Rival[] }) {
  const [rival, ...others] = rivals;
  // "4 matches: 1 in men's singles, 1 in men's doubles, 2 in mixed doubles"
  const where = (r: Rival) => {
    const pools = Object.entries(r.pools) as [Pool, number][];
    return pools.length > 1 ? `: ${pools.map(([pool, n]) => `${n} in ${POOLS[pool].toLowerCase()}`).join(", ")}` : ` in ${POOLS[pools[0][0]].toLowerCase()}`;
  };
  return (
    <section className="base-section">
      <div className="base-container px-4">
        <div className="bg-white p-4 md:p-6">
          <h2 className="text-xl mb-1">Biggest rival</h2>
          <p className="text-sm text-gray-600 mb-4">The opponent with the closest matches, in all disciplines together, from at least 3 meetings</p>
          <p className="text-2xl">
            <Link href={`/players/${rival.opponent.id}`} className="hover:text-blue-600">{rival.opponent.name}</Link>
          </p>
          <p className="text-gray-700 mt-1">
            {rival.matches} matches{where(rival)} · {rival.wins} won{rival.draws ? `, ${rival.draws} drawn` : ""}, {rival.losses} lost · average margin {(rival.margin * 100).toFixed(1)}% of points · last met{" "}
            {date(rival.lastPlayed)} ·{" "}
            <Link href={`/head-to-head?a=${player.id}&b=${rival.opponent.id}`} className="underline hover:text-blue-600">head to head</Link>
          </p>
          {others.length > 0 && (
            <>
              <p className="text-sm text-gray-600 mt-4">Also close:</p>
              <ul className="mt-1">
                {others.map((r) => (
                  <li key={r.opponent.id}>
                    <Link href={`/players/${r.opponent.id}`} className="hover:text-blue-600">{r.opponent.name}</Link>{" "}
                    <span className="text-sm text-gray-600">
                      {r.matches} matches{where(r)}, {r.wins}–{r.losses}{r.draws ? `–${r.draws}` : ""}, margin {(r.margin * 100).toFixed(1)}% ·{" "}
                      <Link href={`/head-to-head?a=${player.id}&b=${r.opponent.id}`} className="underline hover:text-blue-600">head to head</Link>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/** Rating and ranking of all disciplines together, with tables by season (precomputed by rate.mjs) */
function AllDisciplines({ player }: { player: Player }) {
  const pools = Object.entries(player.pools) as [Pool, PlayerPool][];
  // slot: a fixed colour per discipline, in the order of POOLS, as on the club pages
  const ratingSeries: (ChartSeries & { pool: Pool })[] = [];
  const rankSeries: (ChartSeries & { pool: Pool })[] = [];
  const seasons = new Map<number, Partial<Record<Pool, SeasonRow>>>();
  for (const [pool, p] of pools) {
    const h = p.history;
    const slot = POOL_KEYS.indexOf(pool);
    if (h && h.ratings.length > 1) ratingSeries.push({ pool, label: p.label, from: h.from, values: h.ratings, slot });
    if (h?.ranks?.some((r) => r !== null)) {
      const among = pool === "mixedDoubles" ? (p.gender === "K" ? " (among women)" : " (among men)") : "";
      rankSeries.push({ pool, label: p.label + among, from: h.from, values: h.ranks, counts: h.rankCounts ?? [], slot });
    }
    for (const row of h?.seasons ?? []) seasons.set(row.season, { ...seasons.get(row.season), [pool]: row });
  }
  const rows = [...seasons].sort(([a], [b]) => a - b);
  if (ratingSeries.length < 2 && !rankSeries.length) return null;

  const seasonTable = (series: typeof ratingSeries, cell: (row: SeasonRow | undefined) => string) => (
    <div className="overflow-x-auto">
      <table className="mt-2 text-left">
        <thead className="text-sm text-gray-600">
          <tr>
            <th scope="col" className="py-1 pr-6 font-normal">Season</th>
            {series.map((s) => (
              <th key={s.pool} scope="col" className="py-1 pr-6 font-normal text-right">{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([season, byPool]) => (
            <tr key={season}>
              <td className="py-1 pr-6">{season}/{season + 1}</td>
              {series.map((s) => (
                <td key={s.pool} className="py-1 pr-6 text-right tabular-nums whitespace-nowrap">{cell(byPool[s.pool])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="base-section">
      <div className="base-container px-4 grid gap-6">
        {ratingSeries.length > 1 && (
          <div className="bg-white p-4 md:p-6">
            <h2 className="text-xl mb-1">Rating history</h2>
            <p className="text-sm text-gray-600 mb-4">
              Rating in each discipline at the end of each week. Doubles ratings spread over a narrower range than singles, so compare how each line moves rather than the levels between singles and doubles.
            </p>
            <LineChart series={ratingSeries} label="Rating" />
            <details className="mt-4">
              <summary className="cursor-pointer text-gray-700 hover:text-black">Rating by season</summary>
              {seasonTable(ratingSeries, (row) => (row?.rating != null ? String(row.rating) : "–"))}
              <p className="text-sm text-gray-600 mt-2">Rating at the end of each season (or the latest week for the current one).</p>
            </details>
          </div>
        )}
        {rankSeries.length > 0 && (
          <div className="bg-white p-4 md:p-6">
            <h2 className="text-xl mb-1">Ranking history</h2>
            <p className="text-sm text-gray-600 mb-4">
              National rank at the end of each week, among players who had played in the last 12 months; men&apos;s disciplines rank only men and women&apos;s only women, and mixed doubles ranks men and women separately. Gaps are periods without a rank. The scale is
              logarithmic, so moving from #100 to #50 looks as big as from #20 to #10.
            </p>
            <LineChart series={rankSeries} label="Rank" rank />
            <details className="mt-4">
              <summary className="cursor-pointer text-gray-700 hover:text-black">Rank by season</summary>
              {seasonTable(rankSeries, (row) => (row?.rank ? `#${row.rank}${row.ranked ? ` of ${num(row.ranked)}` : ""}` : "–"))}
              <p className="text-sm text-gray-600 mt-2">Rank at the end of each season (or the latest week for the current one).</p>
            </details>
          </div>
        )}
      </div>
    </section>
  );
}

const HIGHLIGHTS = [
  { key: "biggestWins", label: "Biggest wins", subtitle: "Wins with the lowest chance of winning before the match" },
  { key: "biggestLosses", label: "Biggest losses", subtitle: "Losses with the highest chance of winning before the match" },
  { key: "biggestGains", label: "Biggest rating gains", subtitle: "The matches that raised the rating most" },
  { key: "biggestDrops", label: "Biggest rating losses", subtitle: "The matches that lowered the rating most" },
] as const;

function Discipline({ pool, p, player, links }: { pool: Pool; p: PlayerPool; player: Player; links: Record<string, number> }) {
  const mixed = pool === "mixedDoubles";
  const history = p.history;
  const log = p.matchLog;
  const highlights = HIGHLIGHTS.filter((h) => (log?.[h.key] ?? []).length > 0);
  return (
    <div>
      <h2 className="text-3xl mb-6">{p.label}</h2>
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4">
          <dt className="text-sm text-gray-600">Rating</dt>
          <dd className="text-3xl font-semibold">
            {Math.round(p.rating)} <span className="text-base font-normal text-gray-500" title="95% range">±{p.plusMinus}</span>
          </dd>
        </div>
        <div className="bg-white p-4">
          <dt className="text-sm text-gray-600">Rank</dt>
          {p.rank ? (
            <>
              <dd className="text-3xl font-semibold">
                <Link href={rankingHref(pool, mixed ? p.gender : null)} className="hover:text-blue-600">#{p.rank}</Link>
              </dd>
              {mixed && <dd className="text-sm text-gray-600">among {p.gender === "K" ? "women" : "men"}</dd>}
            </>
          ) : (
            <dd className="text-xl pt-2">
              Not ranked
              <span className="block text-sm text-gray-600">
                {p.active ? `${pool === "men" || pool === "mensDoubles" ? "Men's disciplines rank only men" : pool === "mixedDoubles" ? "Gender unknown" : "Women's disciplines rank only women"}` : "No matches in the last 12 months"}
              </span>
            </dd>
          )}
        </div>
        <div className="bg-white p-4">
          <dt className="text-sm text-gray-600">Peak</dt>
          <dd className="text-3xl font-semibold">{Math.round(p.peak)}</dd>
        </div>
        <div className="bg-white p-4">
          <dt className="text-sm text-gray-600">Matches</dt>
          <dd className="text-3xl font-semibold">{num(p.matches)}</dd>
          <dd className="text-sm text-gray-600">
            {p.wins} won · {p.draws ? `${p.draws} drawn · ` : ""}{p.losses} lost
          </dd>
        </div>
      </dl>

      {history && history.ratings.length > 1 && (
        <div className="bg-white p-4 md:p-6">
          <h3 className="text-xl mb-1">Rating history</h3>
          <p className="text-sm text-gray-600 mb-4">
            Rating at the end of each week, {date(p.firstPlayed, "monthYear")} to {date(p.lastPlayed, "monthYear")}
          </p>
          <LineChart series={[{ label: p.label, from: history.from, values: history.ratings, clubs: history.clubs ?? [] }]} label="Rating" className="relative h-72" />
          {/* Table view of the chart: rating at the end of each season (July to June), precomputed by rate.mjs */}
          <details className="mt-4">
            <summary className="cursor-pointer text-gray-700 hover:text-black">Rating by season</summary>
            <table className="mt-2 text-left">
              <thead className="text-sm text-gray-600">
                <tr>
                  <th scope="col" className="py-1 pr-8 font-normal">Season</th>
                  <th scope="col" className="py-1 pr-8 font-normal">Club</th>
                  <th scope="col" className="py-1 font-normal text-right">Rating at end</th>
                </tr>
              </thead>
              <tbody>
                {(history.seasons ?? []).map((s) => (
                  <tr key={s.season}>
                    <td className="py-1 pr-8">{s.season}/{s.season + 1}</td>
                    <td className="py-1 pr-8">{s.club}</td>
                    <td className="py-1 text-right tabular-nums">{s.rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>
      )}

      {log && log.all.length > 0 && (
        <div className="grid gap-6 mt-6">
          <MatchTable
            title="Matches"
            // Only the newest are sent with the page; "show all" loads the rest
            matches={log.all.slice(0, 20)}
            limit={20}
            more={{ url: `/api/players/${player.id}/matches?pool=${pool}`, count: log.count ?? log.all.length }}
            pool={pool}
            tournamentLinks={links}
          />
          {/* Biggest wins and losses (by win chance) and biggest rating gains and losses, as tabs in one box */}
          {highlights.length > 0 && (
            <div className="bg-white p-4 md:p-6">
              <h3 className="text-xl mb-3">Highlights</h3>
              <Tabs
                label="Highlights"
                param="highlight"
                id={pool}
                small
                className="mb-4"
                tabs={highlights.map((h) => ({
                  id: h.key,
                  label: h.label,
                  content: <MatchTable title={h.label} subtitle={h.subtitle} matches={log[h.key]} embedded pool={pool} tournamentLinks={links} />,
                }))}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
