// What if an Eliteserien tie were 10 matches (pipeline/eliteserien-ten-matches.mjs): this season's
// teams with a 3rd men's singles and a 2nd men's doubles, against today's 8 matches.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import Team from "@/components/clubs/Team";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import Card from "@/components/ui/Card";
import Loading from "@/components/ui/Loading";
import Section from "@/components/ui/Section";
import { ROW, TEXT_LINK } from "@/components/ui/styles";
import { getEliteserienTenMatches } from "@/data/eliteserien";
import { getClubMap } from "@/data/sanity";
import { rich, t } from "@/messages/i18n";
import type { Loose } from "@/types";
import { logoSrc } from "@/utils/clubs";
import { chance, EMPTY, pct, signed, toneClass } from "@/utils/format";
import { ELITESERIEN_HREF, ELITESERIEN_TEN_MATCHES_HREF, playerHref } from "@/utils/hrefs";
import { pageMetadata } from "@/utils/metadata";
import { DOUBLES_SCALE, expectedScore } from "@/utils/rating";

export const metadata: Metadata = pageMetadata({ title: t("eliteserien.tenMatches.title"), description: t("seo.descriptions.tenMatches"), path: ELITESERIEN_TEN_MATCHES_HREF });

const teamId = (team: string) => `team-${team.toLowerCase().replace(/[^a-z0-9æøå]+/g, "-")}`;
/** The reference opponent of a slot: MS3 → references.MS[2], WD → references.WD[0] */
const refOf = (refs: Loose, slot: string) => refs[slot.replace(/\d$/, "")]?.[(Number(slot.at(-1)) || 1) - 1] ?? 0;
/** "−1.3" table points, coloured */
const Change = ({ value, decimals = 1 }: { value: number; decimals?: number }) => (
  <span className={value === 0 ? "text-gray-500" : toneClass(value)}>{signed(value, decimals)}</span>
);

export default function TenMatchesPage() {
  return (
    <Suspense fallback={<Loading label={t("eliteserien.tenMatches.loading")} section />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const [data, clubs] = await Promise.all([getEliteserienTenMatches(), getClubMap()]);
  const teams: Loose[] = data?.teams ?? [];
  const pointsChange = (team: Loose) => team.strength.ten.tablePoints - team.strength.eight.tablePoints;
  const byPoints = [...teams].sort((a, b) => pointsChange(b) - pointsChange(a));
  const moves = teams.filter((team) => team.rank.ten !== team.rank.eight);
  const slotLabel = (key: string) => [...(data?.slots.ten ?? []), ...(data?.slots.eight ?? [])].find((s: Loose) => s.key === key)?.label ?? key;
  // A match's name, short on phones ("MS3", "XD1": the slot's key) and in full from sm up
  const SlotName = ({ slot }: { slot: string }) => (
    <>
      <abbr className="sm:hidden no-underline" title={slotLabel(slot)}>{slot}</abbr>
      <span className="hidden sm:inline">{slotLabel(slot)}</span>
    </>
  );
  const slotNames = (slots: string[]) =>
    slots.length
      ? slots.map((slot, i) => (
          <span key={slot}>
            <SlotName slot={slot} />
            {i < slots.length - 1 && ", "}
          </span>
        ))
      : t("eliteserien.tenMatches.team.none");

  return (
    <>
      <Section>
        <Breadcrumbs trail={[{ label: t("eliteserien.title"), href: ELITESERIEN_HREF }, { label: t("eliteserien.tenMatches.title") }]} />
        <h1 className="h1 mt-4">{t("eliteserien.tenMatches.heading")}</h1>
        <p className="text-2xl max-w-3xl mt-2">{t("eliteserien.tenMatches.intro", { season: data?.season ?? "" })}</p>
        {data && (
          <div className="mt-6 max-w-3xl bg-white border-l-4 p-4 md:p-6 space-y-2" style={{ borderColor: "var(--color-chart-5)" }} role="note">
            <h2 className="text-xl">{t("eliteserien.tenMatches.disclaimer.title")}</h2>
            <p>{t("eliteserien.tenMatches.disclaimer.text")}</p>
            {data.added.map((a: Loose) => {
              const inEight = teams.find((team) => team.team === a.team)?.players.find((p: Loose) => p.id === a.id)?.eight.length > 0;
              return (
                <p key={a.id}>
                  {rich(
                    "eliteserien.tenMatches.disclaimer.added",
                    { player: (text) => <Link href={playerHref(a.id)} className={TEXT_LINK}>{text}</Link> },
                    { reason: a.reason, name: a.name, club: a.club ?? EMPTY, team: a.team },
                  )}{" "}
                  {inEight
                    ? t("eliteserien.tenMatches.disclaimer.addedEight", { name: a.name, team: a.team })
                    : rich("eliteserien.tenMatches.disclaimer.addedNotEight", { link: (text) => <Link href={ELITESERIEN_HREF} className={TEXT_LINK}>{text}</Link> }, { name: a.name, team: a.team })}
                </p>
              );
            })}
          </div>
        )}
        <p className="max-w-3xl mt-4 text-gray-700">
          {t("eliteserien.tenMatches.howItWorks", { ranking: data?.rankingPeriod ? t("eliteserien.tenMatches.rankingPeriod", { period: data.rankingPeriod }) : "" })}
        </p>
      </Section>

      {teams.length === 0 ? (
        <Section>
          <p>{t("eliteserien.noData")}</p>
        </Section>
      ) : (
        <>
          <Section title={t("eliteserien.tenMatches.findings.title")} titleClassName="text-3xl mb-2">
            <ul className="max-w-3xl list-disc pl-5 space-y-1">
              <li>{t("eliteserien.tenMatches.findings.men")}</li>
              {[
                ["gain", byPoints[0]],
                ["loss", byPoints.at(-1)],
              ].map(([kind, team]) => (
                <li key={kind}>
                  {t(kind === "gain" ? "eliteserien.tenMatches.findings.gain" : "eliteserien.tenMatches.findings.loss", {
                    team: team.team,
                    change: signed(pointsChange(team), 1),
                    from: team.strength.eight.tablePoints.toFixed(1),
                    to: team.strength.ten.tablePoints.toFixed(1),
                  })}
                </li>
              ))}
              <li>
                {moves.length
                  ? t("eliteserien.tenMatches.findings.moves", {
                      moves: moves.map((team) => t("eliteserien.tenMatches.findings.move", { team: team.team, from: team.rank.eight, to: team.rank.ten })).join(", "),
                    })
                  : t("eliteserien.tenMatches.findings.noMoves")}
              </li>
            </ul>
          </Section>

          <Section title={t("eliteserien.tenMatches.table.title")} titleClassName="text-3xl mb-2" intro={t("eliteserien.tenMatches.table.intro")}>
            <div className="bg-white overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-sm text-gray-600 border-b border-gray-200">
                  <tr>
                    <th scope="col" className="py-3 px-4 font-normal text-right w-12" title={t("eliteserien.tenMatches.table.placeTitle")}>{t("common.table.rank")}</th>
                    <th scope="col" className="py-3 px-4 font-normal">{t("eliteserien.tenMatches.table.team")}</th>
                    <th scope="col" className="py-3 px-4 font-normal text-right" title={t("eliteserien.tenMatches.table.tablePointsTitle")}>{t("eliteserien.tenMatches.table.tablePoints")}</th>
                    <th scope="col" className="py-3 px-4 font-normal text-right hidden md:table-cell" title={t("eliteserien.tenMatches.table.matchesTitle")}>{t("eliteserien.tenMatches.table.matches")}</th>
                    <th scope="col" className="py-3 px-4 font-normal text-right">{t("eliteserien.tenMatches.table.winsTie")}</th>
                    <th scope="col" className="py-3 px-4 font-normal text-right hidden sm:table-cell">{t("eliteserien.tenMatches.table.draw")}</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((team) => {
                    const [a, b] = [team.strength.eight, team.strength.ten];
                    // Each cell: the value with 10 matches, and with 8 underneath
                    const withEight = (value: string) => <span className="block text-sm text-gray-500">{t("eliteserien.tenMatches.table.withEight", { value })}</span>;
                    return (
                      <tr key={team.team} className={`${ROW} hover:bg-gray-50 align-top`}>
                        <td className="py-3 px-4 text-right tabular-nums text-gray-600">
                          {team.rank.ten}
                          {team.rank.ten !== team.rank.eight && <span className="block text-sm text-gray-500">({team.rank.eight})</span>}
                        </td>
                        <td className="py-3 px-4">
                          <a href={`#${teamId(team.team)}`} className="flex items-center gap-2 hover:text-blue-600">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {clubs[team.team]?.logo && <img src={logoSrc(clubs[team.team].logo!, 6)} alt="" className="w-6 h-6 object-contain" />}
                            {team.team}
                          </a>
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap">
                          <span className="font-semibold">{b.tablePoints.toFixed(1)}</span> <span className="text-sm"><Change value={pointsChange(team)} /></span>
                          {withEight(a.tablePoints.toFixed(1))}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums hidden md:table-cell">
                          {b.expected.toFixed(2)} <span className="text-sm text-gray-500">{t("eliteserien.tenMatches.table.ofTen")}</span>
                          <span className="block text-sm text-gray-500">{a.expected.toFixed(2)} {t("eliteserien.table.ofEight")}</span>
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums">
                          {pct(b.win)}
                          {withEight(pct(a.win))}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums hidden sm:table-cell">
                          {pct(b.draw)}
                          {withEight(pct(a.draw))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-gray-600 mt-2">{t("eliteserien.tenMatches.table.note")}</p>
          </Section>

          <Section title={t("eliteserien.tenMatches.headToHead.title")} titleClassName="text-3xl mb-2">
            <p className="text-gray-700 mb-4">{t("eliteserien.tenMatches.headToHead.intro")}</p>
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
                        const h = data.headToHead.ten[a.team][b.team];
                        const h8 = data.headToHead.eight[a.team][b.team];
                        const change = Math.round(h.win * 100) - Math.round(h8.win * 100);
                        // As on the Eliteserien page: the theme's first chart colour, deeper with the chance
                        return (
                          <td
                            key={b.team}
                            className="p-2 text-center tabular-nums border-2 border-white text-gray-900"
                            style={{ background: `color-mix(in srgb, var(--color-chart-1) ${Math.round(6 + h.win * 56)}%, var(--color-white))` }}
                            title={t("eliteserien.tenMatches.headToHead.cellTitle", {
                              a: a.team,
                              b: b.team,
                              matches: `${h.expected.toFixed(1)}–${(10 - h.expected).toFixed(1)}`,
                              points: `${h.points.toFixed(1)}–${(4 - h.points).toFixed(1)}`,
                              win: pct(h.win),
                              draw: pct(h.draw),
                              loss: pct(h.loss),
                              win8: pct(h8.win),
                              matches8: `${h8.expected.toFixed(1)}–${(8 - h8.expected).toFixed(1)}`,
                            })}
                          >
                            {chance(h.win)}
                            <span className="block text-xs text-gray-700">{signed(change, 0)}</span>
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
            const players = new Map<string, Loose>(team.players.map((p: Loose) => [String(p.id ?? p.name), p]));
            const names = (keys: (number | string)[]) => keys.map((key) => players.get(String(key))?.name ?? String(key));
            const changed: Loose[] = team.players.filter((p: Loose) => p.eight.join() !== p.ten.join());
            return (
              <Section key={team.team} className="scroll-mt-4" id={teamId(team.team)}>
                <h2 className="text-3xl mb-1 flex items-center gap-3">
                  {team.rank.ten}. <Team name={team.team} clubs={clubs} size={10} className="gap-3" />
                </h2>
                <p className="text-gray-700 mb-6">
                  {t("eliteserien.tenMatches.team.summary", {
                    points: team.strength.ten.tablePoints.toFixed(1),
                    change: signed(pointsChange(team), 1),
                    matches: team.strength.ten.expected.toFixed(2),
                    win: pct(team.strength.ten.win),
                  })}
                </p>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <Card title={t("eliteserien.tenMatches.team.lineup")} subtitle={t("eliteserien.tenMatches.team.lineupSubtitle")}>
                    <table className="w-full text-left">
                      <tbody>
                        {data.slots.ten.map((s: Loose) => {
                          const l = team.lineup.ten[s.key];
                          const before = data.sameSlot[s.key] ? team.lineup.eight[data.sameSlot[s.key]] : null;
                          const differs = before && before.players.join() !== l.players.join();
                          return (
                            <tr key={s.key} className={`${ROW} align-top`}>
                              <td className="py-2 pr-4 text-sm text-gray-600 whitespace-nowrap">
                                <SlotName slot={s.key} />
                                {/* Under the short name on phones, beside the full name from sm up */}
                                {s.added && <span className="block w-fit mt-1 sm:inline sm:mt-0 sm:ml-1 text-xs px-1.5 py-0.5 border border-gray-400 rounded text-gray-700">{t("eliteserien.tenMatches.team.new")}</span>}
                              </td>
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
                                {differs && <span className="block text-sm text-gray-500">{t("eliteserien.tenMatches.team.was", { players: names(before.players).join(" + ") })}</span>}
                              </td>
                              <td className="py-2 text-right tabular-nums whitespace-nowrap">
                                {pct(expectedScore(l.rating, refOf(data.references.ten, s.key), /^(MD|WD|XD)/.test(s.key) ? DOUBLES_SCALE : undefined))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </Card>
                  <Card title={t("eliteserien.tenMatches.team.changes")} subtitle={t("eliteserien.tenMatches.team.changesSubtitle")}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="text-sm text-gray-600 border-b border-gray-200">
                          <tr>
                            <th scope="col" className="py-2 pr-4 font-normal">{t("eliteserien.tenMatches.team.player")}</th>
                            <th scope="col" className="py-2 pr-4 font-normal">{t("eliteserien.tenMatches.team.eight")}</th>
                            <th scope="col" className="py-2 font-normal">{t("eliteserien.tenMatches.team.ten")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {changed.map((p) => (
                            <tr key={String(p.id ?? p.name)} className={`${ROW} align-top`}>
                              <td className="py-2 pr-4">
                                {p.id ? <Link href={playerHref(p.id)} className="hover:text-blue-600">{p.name}</Link> : p.name}
                                {/* Under the name on phones, beside it from sm up */}
                                {p.added && <span className="block w-fit mt-1 sm:inline sm:mt-0 sm:ml-1 text-xs px-1.5 py-0.5 border border-gray-400 rounded text-gray-700 whitespace-nowrap">{t("eliteserien.tenMatches.team.added")}</span>}
                              </td>
                              <td className="py-2 pr-4 text-sm text-gray-600">{slotNames(p.eight)}</td>
                              <td className="py-2 text-sm">{slotNames(p.ten)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
