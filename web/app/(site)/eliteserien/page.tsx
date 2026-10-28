// Eliteserien team strengths (pipeline/eliteserien.mjs): the predicted table, head-to-head chances
// between the teams, and each team's strongest lineup and players.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import Team from "@/components/clubs/Team";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import Card from "@/components/ui/Card";
import Loading from "@/components/ui/Loading";
import Section from "@/components/ui/Section";
import { ROW, TEXT_LINK } from "@/components/ui/styles";
import { getEliteserien } from "@/data/eliteserien";
import { getMeta } from "@/data/meta";
import { getClubMap } from "@/data/sanity";
import { rich, t } from "@/messages/i18n";
import type { Loose } from "@/types";
import { logoSrc } from "@/utils/clubs";
import { chance, EMPTY, pct } from "@/utils/format";
import { ELITESERIEN_HREF, ELITESERIEN_TEN_MATCHES_HREF, eliteserienHref, playerHref } from "@/utils/hrefs";
import { pageMetadata } from "@/utils/metadata";
import { DOUBLES_SCALE, expectedScore } from "@/utils/rating";

export async function generateMetadata(): Promise<Metadata> {
  const season = (await getMeta())?.eliteserien.current ?? "";
  return pageMetadata({ title: t("eliteserien.title"), description: t("seo.descriptions.eliteserien", { season }), path: ELITESERIEN_HREF });
}

const teamId = (team: string) => `team-${team.toLowerCase().replace(/[^a-z0-9æøå]+/g, "-")}`;
/** A season in review's URL part as its name: "2024-25" → "2024/25" */
const seasonName = (season: string) => season.replace("-", "/");

export default function EliteserienPage() {
  return (
    <Suspense fallback={<Loading label={t("eliteserien.loading")} section />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const [data, clubs, meta] = await Promise.all([getEliteserien(), getClubMap(), getMeta()]);
  const teams: Loose[] = data?.teams ?? [];
  // Chance against the average Eliteserien opponent in a slot
  const refs = data?.references ?? {};
  const refFor: Record<string, number> = { MS1: refs.MS?.[0] ?? 0, MS2: refs.MS?.[1] ?? 0, WS1: refs.WS?.[0] ?? 0, WS2: refs.WS?.[1] ?? 0, MD: refs.MD ?? 0, WD: refs.WD ?? 0, XD1: refs.XD?.[0] ?? 0, XD2: refs.XD?.[1] ?? 0 };
  const seasons = meta?.eliteserien.seasons ?? [];

  return (
    <>
      <Section>
        <Breadcrumbs trail={[{ label: t("eliteserien.title") }]} />
        <h1 className="h1 mt-4">{t("eliteserien.heading", { season: data?.season ?? "" })}</h1>
        <p className="text-2xl max-w-3xl mt-2">{t("eliteserien.intro")}</p>
        {seasons.length > 0 && (
          <p className="mt-2">
            {t("eliteserien.earlierSeasons")}{" "}
            {seasons.map((s, i) => (
              <span key={s}>
                <Link href={eliteserienHref(s)} className={TEXT_LINK}>{seasonName(s)}</Link>
                {i < seasons.length - 1 && ", "}
              </span>
            ))}
          </p>
        )}
        <p className="mt-2">
          {rich("eliteserien.tenMatchesLink", {
            link: (text) => (
              <Link href={ELITESERIEN_TEN_MATCHES_HREF} className={TEXT_LINK}>
                {text}
              </Link>
            ),
          })}
        </p>
        <div className="max-w-3xl mt-4 text-gray-700 space-y-2">
          <p>{t("eliteserien.howItWorks.tie", { ranking: data?.rankingPeriod ? t("eliteserien.howItWorks.rankingPeriod", { period: data.rankingPeriod }) : "" })}</p>
          <p>
            {rich("eliteserien.howItWorks.teams", {
              link: (text) => (
                <a href={data?.source ?? "#"} className={TEXT_LINK} rel="noopener">
                  {text}
                </a>
              ),
            })}
          </p>
        </div>
      </Section>

      {teams.length === 0 ? (
        <Section>
          <p>{t("eliteserien.noData")}</p>
        </Section>
      ) : (
        <>
          <Section title={t("eliteserien.table.title")} titleClassName="text-3xl mb-2" intro={t("eliteserien.table.intro")}>
            <div className="bg-white overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-sm text-gray-600 border-b border-gray-200">
                  <tr>
                    <th scope="col" className="py-3 px-4 font-normal text-right w-12">{t("common.table.rank")}</th>
                    <th scope="col" className="py-3 px-4 font-normal">{t("eliteserien.table.team")}</th>
                    <th scope="col" className="py-3 px-4 font-normal text-right" title={t("eliteserien.table.tablePointsTitle")}>{t("eliteserien.table.tablePoints")}</th>
                    <th scope="col" className="py-3 px-4 font-normal text-right hidden md:table-cell" title={t("eliteserien.table.matchesPerTieTitle")}>{t("eliteserien.table.matchesPerTie")}</th>
                    <th scope="col" className="py-3 px-4 font-normal text-right">{t("eliteserien.table.winsTie")}</th>
                    <th scope="col" className="py-3 px-4 font-normal text-right hidden sm:table-cell">{t("eliteserien.table.draw")}</th>
                    <th scope="col" className="py-3 px-4 font-normal text-right hidden sm:table-cell">{t("eliteserien.table.losesTie")}</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((team) => (
                    <tr key={team.team} className={`${ROW} hover:bg-gray-50`}>
                      <td className="py-3 px-4 text-right text-gray-600 tabular-nums">{team.rank}</td>
                      <td className="py-3 px-4">
                        <a href={`#${teamId(team.team)}`} className="flex items-center gap-2 hover:text-blue-600">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {clubs[team.team]?.logo && <img src={logoSrc(clubs[team.team].logo!, 6)} alt="" className="w-6 h-6 object-contain" />}
                          {team.team}
                        </a>
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums font-semibold">{team.strength.tablePoints.toFixed(1)}</td>
                      <td className="py-3 px-4 text-right tabular-nums hidden md:table-cell">
                        {team.strength.expected.toFixed(2)} <span className="text-sm text-gray-500">{t("eliteserien.table.ofEight")}</span>
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">{pct(team.strength.win)}</td>
                      <td className="py-3 px-4 text-right tabular-nums hidden sm:table-cell">{pct(team.strength.draw)}</td>
                      <td className="py-3 px-4 text-right tabular-nums hidden sm:table-cell">{pct(team.strength.loss)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-gray-600 mt-2">{t("eliteserien.table.note")}</p>
          </Section>

          <Section title={t("eliteserien.headToHead.title")} titleClassName="text-3xl mb-2">
            <p className="text-gray-700 mb-4">{t("eliteserien.headToHead.intro")}</p>
            <div className="bg-white overflow-x-auto p-2">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th scope="col" className="p-2" />
                    {teams.map((b) => (
                      <th key={b.team} scope="col" className="p-2 font-normal text-gray-600 text-center"><Team name={b.team} clubs={clubs} size={6} stacked /></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {teams.map((a) => (
                    <tr key={a.team}>
                      <th scope="row" className="p-2 font-normal text-left whitespace-nowrap"><Team name={a.team} clubs={clubs} size={5} /></th>
                      {teams.map((b) => {
                        if (a.team === b.team) return <td key={b.team} className="p-2 text-center text-gray-300">{EMPTY}</td>;
                        const h = data.headToHead[a.team][b.team];
                        // The theme's first chart colour, deeper with the chance; light enough at its deepest (62%)
                        // for dark text on every cell, in every theme
                        return (
                          <td
                            key={b.team}
                            className="p-2 text-center tabular-nums border-2 border-white text-gray-900"
                            style={{ background: `color-mix(in srgb, var(--color-chart-1) ${Math.round(6 + h.win * 56)}%, var(--color-white))` }}
                            title={t("eliteserien.headToHead.cellTitle", {
                              a: a.team,
                              b: b.team,
                              matches: `${h.expected.toFixed(1)}–${(8 - h.expected).toFixed(1)}`,
                              points: `${h.points.toFixed(1)}–${(4 - h.points).toFixed(1)}`,
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
          </Section>

          {teams.map((team) => {
            const players = new Map<string, Loose>(team.players.map((p: Loose) => [String(p.id ?? p.listName), p]));
            return (
              <Section key={team.team} className="scroll-mt-4" id={teamId(team.team)}>
                <h2 className="text-3xl mb-1 flex items-center gap-3">
                  {team.rank}. <Team name={team.team} clubs={clubs} size={10} className="gap-3" />
                </h2>
                <p className="text-gray-700 mb-6">
                  {t("eliteserien.team.summary", { points: team.strength.tablePoints.toFixed(1), matches: team.strength.expected.toFixed(2), win: pct(team.strength.win) })}
                </p>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <Card title={t("eliteserien.team.lineup")} subtitle={t("eliteserien.team.lineupSubtitle")}>
                    <table className="w-full text-left">
                      <tbody>
                        {data.slots.map((s: Loose) => {
                          const l = team.lineup[s.key];
                          return (
                            <tr key={s.key} className={`${ROW} align-top`}>
                              <td className="py-2 pr-4 text-sm text-gray-600 whitespace-nowrap">{s.label}</td>
                              <td className="py-2 pr-4">
                                {l.players.map((key: number | string, i: number) => {
                                  const p = players.get(String(key));
                                  return (
                                    <span key={String(key)}>
                                      {p?.id ? <Link href={playerHref(p.id)} className="hover:text-blue-600">{p.name}</Link> : p?.name}
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
                  <Card>
                    <h3 className="text-xl mb-4">{t("eliteserien.team.players")}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="text-sm text-gray-600 border-b border-gray-200">
                          <tr>
                            <th scope="col" className="py-2 pr-4 font-normal">{t("common.table.player")}</th>
                            <th scope="col" className="py-2 pr-4 font-normal text-right">{t("eliteserien.team.singles")}</th>
                            <th scope="col" className="py-2 pr-4 font-normal text-right">{t("eliteserien.team.doubles")}</th>
                            <th scope="col" className="py-2 pr-4 font-normal text-right">{t("eliteserien.team.mixed")}</th>
                            <th scope="col" className="py-2 font-normal text-right" title={t("eliteserien.team.pointsTitle")}>{t("eliteserien.team.points")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {team.players.map((p: Loose) => (
                            <tr key={String(p.id ?? p.listName)} className={`${ROW} align-top`}>
                              <td className="py-2 pr-4">
                                {p.id ? <Link href={playerHref(p.id)} className="hover:text-blue-600">{p.name}</Link> : p.name}
                                {p.loanFrom && (
                                  <span className="ml-1 text-xs px-1.5 py-0.5 border border-gray-400 rounded text-gray-700 whitespace-nowrap">{t("eliteserien.team.loanFrom", { club: p.loanFrom })}</span>
                                )}
                                {!p.rated && <span className="block text-sm text-gray-500">{t("eliteserien.team.noRatedMatches")}</span>}
                              </td>
                              {(["singles", "doubles", "mixed"] as const).map((kind) => (
                                <td key={kind} className="py-2 pr-4 text-right tabular-nums text-gray-700">
                                  {p.rated ? `${p.estimated?.[kind] ? "≈" : ""}${p[kind]}` : EMPTY}
                                </td>
                              ))}
                              <td className="py-2 text-right tabular-nums text-gray-500 whitespace-nowrap">{p.points?.singles ?? 0} / {p.points?.mixed ?? 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{t("eliteserien.team.note")}</p>
                  </Card>
                </div>
              </Section>
            );
          })}
        </>
      )}
    </>
  );
}
