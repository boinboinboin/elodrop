// One player: club, rating and ranking history in every discipline (with tables by season), their
// biggest rivals over all disciplines, and per discipline their rating, rank, peak, matches, rating
// history, match list and highlights (biggest wins and losses, rating gains and drops).
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import LineChart, { type ChartSeries } from "@/components/charts/LineChart";
import PoolName from "@/components/format/PoolName";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import MatchTable from "@/components/players/MatchTable";
import SeasonTable from "@/components/players/SeasonTable";
import { WeekChange } from "@/components/rankings/RankMovement";
import { ArrowRight } from "@/components/SVG";
import Card from "@/components/ui/Card";
import Disclosure from "@/components/ui/Disclosure";
import Loading from "@/components/ui/Loading";
import Section from "@/components/ui/Section";
import StatCard from "@/components/ui/StatCard";
import { TEXT_LINK } from "@/components/ui/styles";
import Tabs from "@/components/ui/Tabs";
import { getMeta } from "@/data/meta";
import { getPlayer } from "@/data/players";
import { getRankings } from "@/data/rankings";
import { getClubMap } from "@/data/sanity";
import { plural, rich, t } from "@/messages/i18n";
import type { Player, PlayerPool, Pool, Rival, SeasonRow } from "@/types";
import { date, EMPTY, num, pct, seasonLabel } from "@/utils/format";
import { clubHref, headToHeadHref, playerHref } from "@/utils/hrefs";
import { parseId } from "@/utils/parse";
import { POOL_KEYS } from "@/utils/pools";
import { rankingHref } from "@/utils/rankings";
import { logoSrc } from "@/utils/clubs";

// The best ten men are prerendered at build; every other player page is rendered on its first visit
// and then served from the cache until the next data update (ISR), instead of on every request.
export async function generateStaticParams() {
  const top = (await getRankings("men")).slice(0, 10);
  return top.length ? top.map((p) => ({ id: String(p.id) })) : [{ id: "0" }];
}

export async function generateMetadata({ params }: PageProps<"/players/[id]">): Promise<Metadata> {
  const player = await getPlayer(Number((await params).id));
  return { title: player?.name ?? t("players.metadata.title") };
}

export default function PlayerPage(props: PageProps<"/players/[id]">) {
  return (
    <Suspense fallback={<Loading label={t("players.loading")} section />}>
      <PlayerContent params={props.params} />
    </Suspense>
  );
}

async function PlayerContent({ params }: Pick<PageProps<"/players/[id]">, "params">) {
  const id = parseId((await params).id);
  if (id === null) notFound();
  const [player, clubs, meta] = await Promise.all([getPlayer(id), getClubMap(), getMeta()]);
  if (!player) notFound();
  const club = player.club ? clubs[player.club] : null;
  const pools = Object.entries(player.pools) as [Pool, PlayerPool][];
  const links = meta?.tournamentLinks ?? {};

  return (
    <>
      <Section>
        <Breadcrumbs trail={[{ label: player.name }]} />
        <h1 className="h1 mt-4">{player.name}</h1>
        {player.club && (
          <p className="flex items-center gap-3 text-2xl text-gray-700 mt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {club?.logo && <img src={logoSrc(club.logo, 10)} alt="" className="w-10 h-10 object-contain shrink-0" />}
            {club ? <Link href={clubHref(club.slug)} className="hover:text-blue-600">{player.club}</Link> : player.club}
          </p>
        )}
        {player.birthYear && <p className="text-gray-600 mt-2">{t("players.born", { year: player.birthYear })}</p>}
        <p className="mt-4">
          <Link href={headToHeadHref(player.id)} className={TEXT_LINK}>{t("players.compare")} <ArrowRight /></Link>
        </p>
      </Section>

      <AllDisciplines player={player} />

      {player.rivals && player.rivals.length > 0 && <Rivals player={player} rivals={player.rivals} />}

      {/* One tab per discipline (no tabs for players with a single discipline) */}
      <Section>
        <Tabs
          label={t("players.disciplines")}
          param="discipline"
          sticky
          tabs={pools.map(([pool, p]) => ({ id: pool, label: <PoolName pool={pool} />, content: <Discipline pool={pool} p={p} player={player} links={links} /> }))}
        />
      </Section>
    </>
  );
}

/** The closest rivals over all disciplines: the biggest in full, then the others */
function Rivals({ player, rivals }: { player: Player; rivals: Rival[] }) {
  const [rival, ...others] = rivals;
  // "4 matches: 1 in men's singles, 1 in men's doubles, 2 in mixed doubles"
  const where = (r: Rival) => {
    const pools = Object.entries(r.pools) as [Pool, number][];
    const matches = plural("common.matches", r.matches);
    return pools.length > 1
      ? t("players.rival.inPools", { matches, list: pools.map(([pool, n]) => t("players.rival.inOnePool", { count: n, pool: t(`common.poolsInSentence.${pool}`) })).join(", ") })
      : t("players.rival.inPool", { matches, pool: t(`common.poolsInSentence.${pools[0][0]}`) });
  };
  // The "head to head" link in a rival's line
  const headToHead = (r: Rival) =>
    function HeadToHeadLink(text: ReactNode) {
      return <Link href={headToHeadHref(player.id, r.opponent.id)} className={TEXT_LINK}>{text}</Link>;
    };
  return (
    <Section>
      <Card>
        <h2 className="text-xl mb-1">{t("players.rival.title")}</h2>
        <p className="text-sm text-gray-600 mb-4">{t("players.rival.subtitle")}</p>
        <p className="text-2xl">
          <Link href={playerHref(rival.opponent.id)} className="hover:text-blue-600">{rival.opponent.name}</Link>
          {rival.opponent.club && <span className="text-base text-gray-600"> · {rival.opponent.club}</span>}
        </p>
        <p className="text-gray-700 mt-1">
          {rich(
            "players.rival.summary",
            { link: headToHead(rival) },
            {
              matches: where(rival),
              record: rival.draws
                ? t("players.rival.recordWithDraws", { wins: rival.wins, draws: rival.draws, losses: rival.losses })
                : t("players.rival.record", { wins: rival.wins, losses: rival.losses }),
              margin: pct(rival.margin, 1),
              date: date(rival.lastPlayed),
            },
          )}
        </p>
        {others.length > 0 && (
          <>
            <p className="text-sm text-gray-600 mt-4">{t("players.rival.alsoClose")}</p>
            <ul className="mt-1">
              {others.map((r) => (
                <li key={r.opponent.id}>
                  <Link href={playerHref(r.opponent.id)} className="hover:text-blue-600">{r.opponent.name}</Link>{" "}
                  <span className="text-sm text-gray-600">
                    {r.opponent.club && `${r.opponent.club} · `}
                    {rich(
                      "players.rival.other",
                      { link: headToHead(r) },
                      {
                        matches: where(r),
                        score: r.draws ? t("players.rival.scoreWithDraws", { wins: r.wins, losses: r.losses, draws: r.draws }) : t("players.rival.score", { wins: r.wins, losses: r.losses }),
                        margin: pct(r.margin, 1),
                      },
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </Section>
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
      const label = pool === "mixedDoubles" ? t(p.gender === "K" ? "players.history.amongWomen" : "players.history.amongMen", { pool: p.label }) : p.label;
      rankSeries.push({ pool, label, from: h.from, values: h.ranks, counts: h.rankCounts ?? [], slot });
    }
    for (const row of h?.seasons ?? []) seasons.set(row.season, { ...seasons.get(row.season), [pool]: row });
  }
  const rows = [...seasons].sort(([a], [b]) => a - b);
  if (ratingSeries.length < 2 && !rankSeries.length) return null;

  return (
    <section className="base-section">
      {/* grid-cols-1: the column may shrink below the charts' measured width, so they fit a phone */}
      <div className="base-container px-4 grid grid-cols-1 gap-6">
        {/* Rating and ranking history in one box, a tab each (one without the other: just that one) */}
        <Card>
          <h2 className="text-xl mb-3">{t("players.history.title")}</h2>
          <Tabs
            label={t("players.history.title")}
            small
            className="mb-4"
            tabs={[
              ...(ratingSeries.length > 1
                ? [
                    {
                      id: "rating",
                      label: t("players.history.rating"),
                      content: (
                        <>
                          <p className="text-sm text-gray-600 mb-4">{t("players.history.ratingIntro")}</p>
                          <LineChart series={ratingSeries} label={t("players.history.rating")} className="relative h-72" />
                          <Disclosure summary={t("players.history.ratingBySeason")} className="mt-4">
                            <SeasonTable pools={ratingSeries.map((s) => s.pool)} rows={rows} cell={(row) => (row?.rating != null ? String(row.rating) : EMPTY)} />
                            <p className="text-sm text-gray-600 mt-2">{t("players.history.ratingBySeasonNote")}</p>
                          </Disclosure>
                        </>
                      ),
                    },
                  ]
                : []),
              ...(rankSeries.length > 0
                ? [
                    {
                      id: "ranking",
                      label: t("players.history.ranking"),
                      content: (
                        <>
                          <p className="text-sm text-gray-600 mb-4">{t("players.history.rankingIntro")}</p>
                          <LineChart series={rankSeries} label={t("players.history.rank")} rank className="relative h-72" />
                          <Disclosure summary={t("players.history.rankBySeason")} className="mt-4">
                            <SeasonTable
                              pools={rankSeries.map((s) => s.pool)}
                              rows={rows}
                              cell={(row) =>
                                row?.rank ? (
                                  <>
                                    {t("common.rankValue", { rank: row.rank })}
                                    {/* "of 1,754" on its own line on phones */}
                                    {row.ranked ? <span className="block sm:inline text-xs sm:text-sm text-gray-500">{t("players.history.ofRanked", { count: num(row.ranked) })}</span> : null}
                                  </>
                                ) : (
                                  EMPTY
                                )
                              }
                            />
                            <p className="text-sm text-gray-600 mt-2">{t("players.history.rankBySeasonNote")}</p>
                          </Disclosure>
                        </>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </Card>
      </div>
    </section>
  );
}

const HIGHLIGHTS = ["biggestWins", "biggestLosses", "biggestGains", "biggestDrops"] as const;

function Discipline({ pool, p, player, links }: { pool: Pool; p: PlayerPool; player: Player; links: Record<string, number> }) {
  const mixed = pool === "mixedDoubles";
  const history = p.history;
  const log = p.matchLog;
  const highlights = HIGHLIGHTS.filter((key) => (log?.[key] ?? []).length > 0);
  // Why an active player has no rank: their gender isn't the discipline's, or it's unknown
  const unranked = pool === "men" || pool === "mensDoubles" ? "players.discipline.menOnly" : mixed ? "players.discipline.genderUnknown" : "players.discipline.womenOnly";
  return (
    <div>
      <h2 className="text-3xl mb-6">{p.label}</h2>
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label={t("players.discipline.rating")}>
          {Math.round(p.rating)} {p.rank !== null && <span className="text-base font-normal"><WeekChange change={p.ratingChange} /></span>}
        </StatCard>
        {p.rank ? (
          <StatCard label={t("players.discipline.rank")} detail={mixed && t(p.gender === "K" ? "players.discipline.amongWomen" : "players.discipline.amongMen")}>
            <Link href={rankingHref(pool, mixed ? p.gender : null)} className="hover:text-blue-600">{t("common.rankValue", { rank: p.rank })}</Link>
          </StatCard>
        ) : (
          <div className="bg-white p-4">
            <dt className="text-sm text-gray-600">{t("players.discipline.rank")}</dt>
            <dd className="text-xl pt-2">
              {t("common.notRanked")}
              <span className="block text-sm text-gray-600">{t(p.active ? unranked : "players.discipline.inactive")}</span>
            </dd>
          </div>
        )}
        <StatCard label={t("players.discipline.peak")}>{Math.round(p.peak)}</StatCard>
        <StatCard
          label={t("players.discipline.matches")}
          detail={p.draws ? t("players.discipline.recordWithDraws", { wins: p.wins, draws: p.draws, losses: p.losses }) : t("players.discipline.record", { wins: p.wins, losses: p.losses })}
        >
          {num(p.matches)}
        </StatCard>
      </dl>

      {history && history.ratings.length > 1 && (
        <Card title={t("players.discipline.ratingHistory")} subtitle={t("players.discipline.ratingHistoryRange", { from: date(p.firstPlayed, "monthYear"), to: date(p.lastPlayed, "monthYear") })}>
          <LineChart series={[{ label: p.label, from: history.from, values: history.ratings, clubs: history.clubs ?? [] }]} label={t("players.discipline.rating")} className="relative h-72" />
          {/* Table view of the chart: rating at the end of each season (July to June), precomputed by rate.mjs */}
          <Disclosure summary={t("players.discipline.ratingBySeason")} className="mt-4">
            <table className="mt-2 text-left">
              <thead className="text-sm text-gray-600">
                <tr>
                  <th scope="col" className="py-1 pr-8 font-normal">{t("common.table.season")}</th>
                  <th scope="col" className="py-1 pr-8 font-normal">{t("common.table.club")}</th>
                  <th scope="col" className="py-1 font-normal text-right">{t("players.discipline.ratingAtEnd")}</th>
                </tr>
              </thead>
              <tbody>
                {(history.seasons ?? []).map((s) => (
                  <tr key={s.season}>
                    <td className="py-1 pr-8">{seasonLabel(s.season)}</td>
                    <td className="py-1 pr-8">{s.club}</td>
                    <td className="py-1 text-right tabular-nums">{s.rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Disclosure>
        </Card>
      )}

      {log && log.all.length > 0 && (
        <div className="grid grid-cols-1 gap-6 mt-6">
          <MatchTable
            title={t("players.matches.title")}
            // Only the newest are sent with the page; "show all" loads the rest
            matches={log.all.slice(0, 20)}
            limit={20}
            more={{ url: `/api/players/${player.id}/matches?pool=${pool}`, count: log.count ?? log.all.length }}
            pool={pool}
            tournamentLinks={links}
          />
          {/* Biggest wins and losses (by win chance) and biggest rating gains and losses, as tabs in one box */}
          {highlights.length > 0 && (
            <Card>
              <h3 className="text-xl mb-3">{t("players.discipline.highlights")}</h3>
              <Tabs
                label={t("players.discipline.highlights")}
                param="highlight"
                id={pool}
                small
                className="mb-4"
                tabs={highlights.map((key) => ({
                  id: key,
                  label: t(`players.highlights.${key}.label`),
                  content: <MatchTable title={t(`players.highlights.${key}.label`)} subtitle={t(`players.highlights.${key}.subtitle`)} matches={log[key]} embedded pool={pool} tournamentLinks={links} />,
                }))}
              />
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
