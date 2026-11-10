// Eliteserien this season (pipeline/eliteserien.mjs, eliteserien-forecast.mjs): where the season stands, then tabs (kept
// in the URL, ?view=chances): the table so far with the forecast of the rest (the chances of the top 4, the title, 7th
// and 8th), the next day's ties and what's at stake, and the ties after them; the play-offs; the chances over time and
// of each place; the results; the season's players; the teams: their chances head to head, and each team's strongest
// lineup (and play-off lineup) and players, with who may still play in the play-offs. How it works below the tabs. Updated after each day played; reads only eliteserien.json (which also lists the seasons in review), so
// it's refreshed only when that changes.
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Team from "@/components/clubs/Team";
import ForecastTable from "@/components/eliteserien/ForecastTable";
import Later from "@/components/eliteserien/Later";
import NextUp from "@/components/eliteserien/NextUp";
import PlaceChances from "@/components/eliteserien/PlaceChances";
import Playoffs from "@/components/eliteserien/Playoffs";
import Results from "@/components/eliteserien/Results";
import SeasonPlayers from "@/components/eliteserien/SeasonPlayers";
import { heat, teamId } from "@/components/eliteserien/share";
import TrendChart from "@/components/eliteserien/TrendChart";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Disclosure from "@/components/ui/Disclosure";
import ExternalLink from "@/components/ui/ExternalLink";
import Link from "@/components/ui/Link";
import Section from "@/components/ui/Section";
import Tabs from "@/components/ui/Tabs";
import { ROW, TEXT_LINK } from "@/components/ui/styles";
import { getEliteserien } from "@/data/eliteserien";
import { getClubMap } from "@/data/sanity";
import { getI18n } from "@/messages/server";
import type { EliteserienEligibility, EliteserienForecast, EliteserienSnapshot, Loose } from "@/types";
import { EMPTY } from "@/utils/format";
import { ELITESERIEN_HREF, ELITESERIEN_TEN_MATCHES_HREF, eliteserienHref, playerHref, teamDivisionHref } from "@/utils/hrefs";
import { pageMetadata } from "@/utils/metadata";
import { SLOT_POOLS } from "@/utils/pools";
import { DOUBLES_SCALE, expectedScore } from "@/utils/rating";

export async function generateMetadata(): Promise<Metadata> {
  const i18n = await getI18n();
  const { t } = i18n;
  const season = (await getEliteserien())?.season ?? "";
  return pageMetadata(i18n, { title: t("eliteserien.title"), description: t("seo.descriptions.eliteserien", { season }), path: ELITESERIEN_HREF });
}

/** A part of a tab: its heading, an intro and its content, apart from the next one */
function Part({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <div className="mt-12 first:mt-0">
      <h2 className="text-3xl mb-2">{title}</h2>
      {intro && <p className="text-gray-700 mb-4 max-w-3xl">{intro}</p>}
      {children}
    </div>
  );
}

/** A season in review's URL part as its name: "2024-25" → "2024/25" */
const seasonName = (season: string) => season.replace("-", "/");
const DAY_MS = 86_400_000;

// No Suspense around the content: it is then part of the first paint, not a loading text swapped for it
export default async function EliteserienPage() {
  const { t, rich, blocks, num, pct, chance, date } = await getI18n();
  const [data, clubs] = await Promise.all([getEliteserien(), getClubMap()]);
  const teams: Loose[] = data?.teams ?? [];
  const forecast: EliteserienForecast | null = data?.forecast ?? null;
  const history: EliteserienSnapshot[] = data?.history ?? [];
  // Chance against the average Eliteserien opponent in a slot
  const refs = data?.references ?? {};
  const refFor: Record<string, number> = { MS1: refs.MS?.[0] ?? 0, MS2: refs.MS?.[1] ?? 0, WS1: refs.WS?.[0] ?? 0, WS2: refs.WS?.[1] ?? 0, MD: refs.MD ?? 0, WD: refs.WD ?? 0, XD1: refs.XD?.[0] ?? 0, XD2: refs.XD?.[1] ?? 0 };
  const seasons: string[] = data?.reviews ?? [];
  const started = !!forecast?.lastDay;
  // The teams in table order (before the season, by expected points)
  const order = new Map(forecast?.table.map((row, i) => [row.team, i]) ?? []);
  const ordered = [...teams].sort((a, b) => (order.get(a.team) ?? a.rank) - (order.get(b.team) ?? b.rank));
  // The regular-season round still to come, for the players who must play in it
  const comingRound = forecast?.rounds.find((r) => r.name !== "Sluttspill" && r.played < r.ties)?.name ?? null;

  // Where the season stands: before it, after a round's day, or over
  let status = "";
  if (forecast) {
    const round = forecast.rounds.find((r) => r.name === forecast.lastRound);
    const day = round && forecast.lastDay ? Math.round((Date.parse(forecast.lastDay) - Date.parse(round.from)) / DAY_MS) + 1 : 0;
    const playoffsOver = forecast.playoffs.every((b) => b.ties.every((tie) => tie.winner));
    // Before the season the next line says when it begins; without it, this line does
    if (!forecast.lastDay)
      status = forecast.next ? t("eliteserien.status.before") : t("eliteserien.status.beforeOn", { round: forecast.rounds[0]?.name ?? "", date: date(forecast.rounds[0]?.from ?? "", "dayMonthLong") });
    else if (playoffsOver) status = t("eliteserien.status.over");
    else if (forecast.lastRound === "Sluttspill") status = t("eliteserien.status.afterPlayoffs", { day, date: date(forecast.lastDay, "dayMonth") });
    else status = t("eliteserien.status.after", { round: forecast.lastRound ?? "", day, date: date(forecast.lastDay, "dayMonth"), played: forecast.regular.played, total: forecast.regular.total });
  }

  return (
    <>
      <Section>
        <Breadcrumbs trail={[{ label: t("eliteserien.title") }]} />
        <h1 className="h1 mt-4">{t("eliteserien.heading", { season: data?.season ?? "" })}</h1>
        <p className="text-2xl max-w-3xl mt-2">{t("eliteserien.intro")}</p>
        {forecast && (
          <p className="mt-4 text-lg">
            <span className="font-semibold">{status}</span>
            {forecast.next && <span className="block text-gray-700">{t("eliteserien.status.next", { round: forecast.next.round ?? "", date: date(forecast.next.day, "dayMonthLong") })}</span>}
            <span className="block text-base text-gray-600">{t("eliteserien.status.updated")}</span>
          </p>
        )}
        <div className="mt-4 space-y-2">
          {started && data?.division && (
            <p>{rich("eliteserien.status.realTable", { link: (text) => <Link href={teamDivisionHref(data.division.season, data.division.slug)} className={TEXT_LINK}>{text}</Link> })}</p>
          )}
          {seasons.length > 0 && (
            <p>
              {t("eliteserien.earlierSeasons")}{" "}
              {seasons.map((s, i) => (
                <span key={s}>
                  <Link href={eliteserienHref(s)} className={TEXT_LINK}>{seasonName(s)}</Link>
                  {i < seasons.length - 1 && ", "}
                </span>
              ))}
            </p>
          )}
          <p>{rich("eliteserien.tenMatchesLink", { link: (text) => <Link href={ELITESERIEN_TEN_MATCHES_HREF} className={TEXT_LINK}>{text}</Link> })}</p>
        </div>
      </Section>

      {teams.length === 0 || !forecast ? (
        <Section>
          <p>{t("eliteserien.noData")}</p>
        </Section>
      ) : (
        <>
          <Section>
            <Tabs
              label={t("eliteserien.tabs.label")}
              param="view"
              className="flex flex-wrap gap-2 mb-8"
              tabs={[
                {
                  id: "table",
                  label: t("eliteserien.tabs.table"),
                  content: (
                    <>
                      <Part title={t("eliteserien.table.title")} intro={t(started ? "eliteserien.table.intro" : "eliteserien.table.introBefore", { sims: num(forecast.sims) })}>
                        <ForecastTable forecast={forecast} history={history} preseason={data.preseason?.table ?? null} clubs={clubs} />
                        <p className="text-sm text-gray-600 mt-2">{t("eliteserien.table.note")}</p>
                      </Part>
                      {forecast.next && (
                        <Part title={t("eliteserien.next.title", { date: date(forecast.next.day, "dayMonthLong") })} intro={t("eliteserien.next.intro")}>
                          <NextUp next={forecast.next} clubs={clubs} />
                        </Part>
                      )}
                      {forecast.later?.length > 0 && (
                        <Part title={t("eliteserien.later.title")} intro={t("eliteserien.later.intro")}>
                          <Later later={forecast.later} clubs={clubs} />
                        </Part>
                      )}
                    </>
                  ),
                },
                {
                  id: "playoffs",
                  label: t("eliteserien.tabs.playoffs"),
                  content: (
                    <Part title={t("eliteserien.playoffs.title")} intro={t("eliteserien.playoffs.intro")}>
                      <Playoffs forecast={forecast} clubs={clubs} />
                    </Part>
                  ),
                },
                {
                  id: "chances",
                  label: t("eliteserien.tabs.chances"),
                  content: (
                    <>
                      {history.length > 1 && (
                        <Part title={t("eliteserien.trend.title")} intro={t("eliteserien.trend.intro")}>
                          <TrendChart history={history} teams={forecast.table.map((row) => row.team)} />
                        </Part>
                      )}
                      <Part title={t("eliteserien.places.title")} intro={t("eliteserien.places.intro")}>
                        <PlaceChances forecast={forecast} clubs={clubs} />
                      </Part>
                    </>
                  ),
                },
                ...(forecast.results.length > 0
                  ? [
                      {
                        id: "results",
                        label: t("eliteserien.tabs.results"),
                        content: (
                          <Part title={t("eliteserien.results.title")} intro={t("eliteserien.results.intro")}>
                            <Results forecast={forecast} clubs={clubs} />
                          </Part>
                        ),
                      },
                    ]
                  : []),
                ...(forecast.players.length > 0
                  ? [
                      {
                        id: "players",
                        label: t("eliteserien.tabs.players"),
                        content: (
                          <Part title={t("eliteserien.players.title")}>
                            <SeasonPlayers forecast={forecast} clubs={clubs} />
                          </Part>
                        ),
                      },
                    ]
                  : []),
                {
                  id: "teams",
                  label: t("eliteserien.tabs.teams"),
                  content: (
                    <div className="grid grid-cols-1 gap-12">
          <Part title={t("eliteserien.headToHead.title")}>
            <p className="text-gray-700 mb-4">{t("eliteserien.headToHead.intro")}</p>
            <div className="bg-white overflow-x-auto p-2">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th scope="col" className="p-2" />
                    {ordered.map((b) => (
                      <th key={b.team} scope="col" className="p-2 font-normal text-gray-600 text-center"><Team name={b.team} clubs={clubs} size={6} stacked /></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ordered.map((a) => (
                    <tr key={a.team}>
                      <th scope="row" className="p-2 font-normal text-left whitespace-nowrap"><Team name={a.team} clubs={clubs} size={5} /></th>
                      {ordered.map((b) => {
                        if (a.team === b.team) return <td key={b.team} className="p-2 text-center text-gray-300">{EMPTY}</td>;
                        const h = data.headToHead[a.team][b.team];
                        return (
                          <td
                            key={b.team}
                            className="p-2 text-center tabular-nums whitespace-nowrap border-2 border-white text-gray-900"
                            style={{ background: heat(h.win) }}
                            title={t("eliteserien.headToHead.cellTitle", {
                              a: a.team,
                              b: b.team,
                              matches: `${num(h.expected, 1)}–${num(8 - h.expected, 1)}`,
                              points: `${num(h.points, 1)}–${num(4 - h.points, 1)}`,
                              win: pct(h.win),
                              draw: pct(h.draw),
                              loss: pct(h.loss),
                            })}
                          >
                            {chance(h.win)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Part>
          {ordered.map((team) => {
            const players = new Map<string, Loose>(team.players.map((p: Loose) => [String(p.id ?? p.listName), p]));
            const lineupCard = (lineup: Loose, title: string, subtitle: string) => (
              <Card title={title} subtitle={subtitle}>
                <table className="w-full text-left">
                  <tbody>
                    {data.slots.map((s: Loose) => {
                      const l = lineup[s.key];
                      return (
                        <tr key={s.key} className={`${ROW} align-top`}>
                          <td className="py-2 pr-4 text-sm text-gray-600 whitespace-nowrap">{s.label}</td>
                          <td className="py-2 pr-4">
                            {l.players.map((key: number | string, i: number) => {
                              const p = players.get(String(key));
                              return (
                                <span key={String(key)}>
                                  {p?.id ? <Link href={playerHref(p.id, SLOT_POOLS[s.type])} className="hover:text-blue-600">{p.name}</Link> : (p?.name ?? EMPTY)}
                                  {i < l.players.length - 1 && <span className="text-gray-500"> + </span>}
                                </span>
                              );
                            })}
                          </td>
                          <td className="py-2 text-right tabular-nums whitespace-nowrap">{pct(expectedScore(l.rating, refFor[s.key], /^(MD|WD|XD)/.test(s.key) ? DOUBLES_SCALE : undefined))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            );
            return (
              <div key={team.team} id={teamId(team.team)} className="scroll-mt-4">
                <h2 className="text-3xl mb-1 flex items-center gap-3">
                  <Team name={team.team} clubs={clubs} size={10} className="gap-3" />
                </h2>
                <p className="text-gray-700 mb-6">
                  {t("eliteserien.team.summary", { points: num(team.strength.tablePoints, 1), matches: num(team.strength.expected, 2), win: pct(team.strength.win) })}
                </p>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="grid grid-cols-1 gap-6 content-start">
                    {lineupCard(team.lineup, t("eliteserien.team.lineup"), t("eliteserien.team.lineupSubtitle"))}
                    {team.playoffLineup && lineupCard(team.playoffLineup, t("eliteserien.team.playoffLineup"), t("eliteserien.team.playoffLineupSubtitle"))}
                  </div>
                  <Card>
                    <h3 className="text-xl mb-4">{t("eliteserien.team.players")}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm sm:text-base">
                        <thead className="text-sm text-gray-600 border-b border-gray-200">
                          <tr>
                            <th scope="col" className="py-2 pr-2 sm:pr-4 font-normal">{t("common.table.player")}</th>
                            {started && <th scope="col" className="py-2 pr-2 sm:pr-4 font-normal text-right" title={t("eliteserien.team.playedTitle")}>{t("eliteserien.team.played")}</th>}
                            <th scope="col" className="py-2 pr-2 sm:pr-4 font-normal text-right">{t("eliteserien.team.singles")}</th>
                            <th scope="col" className="py-2 pr-2 sm:pr-4 font-normal text-right">{t("eliteserien.team.doubles")}</th>
                            <th scope="col" className="py-2 pr-2 sm:pr-4 font-normal text-right">{t("eliteserien.team.mixed")}</th>
                            <th scope="col" className="py-2 font-normal text-right" title={t("eliteserien.team.pointsTitle")}>{t("eliteserien.team.points")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Men first, then women, each by singles rating (as the note says) */}
                          {[...team.players].sort((a: Loose, b: Loose) => (a.gender === b.gender ? 0 : a.gender === "M" ? -1 : 1) || b.singles - a.singles).map((p: Loose) => {
                            const e: EliteserienEligibility | undefined = p.eliteserien;
                            return (
                              <tr key={String(p.id ?? p.listName)} className={`${ROW} align-top`}>
                                <td className="py-2 pr-2 sm:pr-4">
                                  {p.id ? <Link href={playerHref(p.id)} className="hover:text-blue-600">{p.name}</Link> : p.name}
                                  {p.loanFrom && (
                                    <span className="block w-fit mt-1 sm:inline sm:mt-0 sm:ml-1 align-[0.07em] font-mono text-xs px-1.5 py-0.5 border border-gray-400 rounded text-gray-700 sm:whitespace-nowrap">{t("eliteserien.team.loanFrom", { club: p.loanFrom })}</span>
                                  )}
                                  {started && e?.status === "mustPlay" && comingRound && <span className="block mt-1"><Badge>{t("eliteserien.team.mustPlay", { round: comingRound })}</Badge></span>}
                                  {started && e?.status === "ineligible" && <span className="block mt-1"><Badge tone="red">{t("eliteserien.team.ineligible")}</Badge></span>}
                                  {!p.rated && <span className="block text-sm text-gray-500">{t("eliteserien.team.noRatedMatches")}</span>}
                                </td>
                                {started && <td className="py-2 pr-2 sm:pr-4 text-right tabular-nums text-gray-700">{e?.played || EMPTY}</td>}
                                {(["singles", "doubles", "mixed"] as const).map((kind) => (
                                  <td key={kind} className="py-2 pr-2 sm:pr-4 text-right tabular-nums text-gray-700">
                                    {p.rated ? `${p.estimated?.[kind] ? "≈" : ""}${p[kind]}` : EMPTY}
                                  </td>
                                ))}
                                <td className="py-2 text-right tabular-nums text-gray-500 whitespace-nowrap">{p.points?.singles ?? 0} / {p.points?.mixed ?? 0}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {team.players.some((p: Loose) => p.rated && (p.estimated?.singles || p.estimated?.doubles || p.estimated?.mixed)) && `${t("eliteserien.team.estimatedNote")} `}
                      {t("eliteserien.team.note")}
                      {started && ` ${t("eliteserien.team.eligibilityNote")}`}
                    </p>
                  </Card>
                </div>
              </div>
            );
          })}

                    </div>
                  ),
                },
              ]}
            />
          </Section>

          <Section>
            <Disclosure summary={<span className="text-xl">{t("eliteserien.howItWorksTitle")}</span>}>
              <div className="max-w-3xl mt-4 text-gray-700 space-y-3">
                {blocks("eliteserien.howItWorks.tie", {}, { ranking: data?.rankingPeriod ? t("eliteserien.howItWorks.rankingPeriod", { period: data.rankingPeriod }) : "" })}
                {blocks("eliteserien.howItWorks.forecast", {}, { sims: num(forecast.sims) })}
                <p>
                  {rich("eliteserien.howItWorks.teams", {
                    link: (text) => (data?.source ? <ExternalLink href={data?.source}>{text}</ExternalLink> : text),
                  })}
                </p>
              </div>
            </Disclosure>
          </Section>
        </>
      )}
    </>
  );
}
