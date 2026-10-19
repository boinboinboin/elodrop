// Eliteserien team strengths (pipeline/eliteserien.mjs): the predicted table, head-to-head chances
// between the teams, and each team's strongest lineup and players.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "@/components/Icons";
import Team from "@/components/Team";
import { getClubMap } from "@/lib/clubs";
import { expectedScore, getEliteserien, getMeta, type Loose } from "@/lib/data";

export const metadata: Metadata = { title: "Eliteserien" };

const teamId = (team: string) => `team-${team.toLowerCase().replace(/[^a-z0-9æøå]+/g, "-")}`;
const percent = (x: number) => `${Math.round(x * 100)}%`;

export default function EliteserienPage() {
  return (
    <Suspense fallback={<div className="base-container px-4 base-section text-gray-600">Loading Eliteserien…</div>}>
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
      <section className="base-section">
        <div className="base-container px-4">
          <Link href="/" className="text-gray-600 hover:text-black"><ArrowLeft /> Rankings</Link>
          <h1 className="h1 mt-4">Eliteserien {data?.season ?? ""}</h1>
          <p className="text-2xl max-w-3xl mt-2">How strong the eight teams are, from their players&apos; ratings.</p>
          {seasons.length > 0 && (
            <p className="mt-2">
              Earlier seasons in review, predicted against actual results:{" "}
              {seasons.map((s, i) => (
                <span key={s}>
                  <Link href={`/eliteserien/${s}`} className="underline hover:text-blue-600">{s.replace("-", "/")}</Link>
                  {i < seasons.length - 1 && ", "}
                </span>
              ))}
            </p>
          )}
          <div className="max-w-3xl mt-4 text-gray-700 space-y-2">
            <p>
              A tie is 8 matches: 2 men&apos;s singles, 2 women&apos;s singles, 1 men&apos;s doubles, 1 women&apos;s doubles and 2 mixed doubles, and a player plays at most 2 of them. Each team is assumed to
              field the lineup that gives it the most expected match wins against an average Eliteserien opponent. As the rules require, the first singles player has more official ranking points than the
              second, and the first mixed pair more combined mixed doubles points than the second{data?.rankingPeriod ? ` (ranking ${data.rankingPeriod})` : ""}. Win chances use the same formula as the
              ratings, match against match, and a tie is won with 5 matches and drawn at 4-4. Table points per tie are as in the league: 4-0 for winning 6-2 or better, 3-1 for 5-3 and 2-2 for 4-4.
            </p>
            <p>
              Teams are from <a href={data?.source ?? "#"} className="underline hover:text-blue-600" rel="noopener">Norges Badmintonforbund&apos;s list</a>, including players on loan from other clubs.
              Players without a doubles or mixed rating are counted as starting doubles from their singles rating (marked ≈).
            </p>
          </div>
        </div>
      </section>

      {teams.length === 0 ? (
        <section className="base-section">
          <div className="base-container px-4"><p>No team strengths yet: run pipeline/eliteserien.mjs after rate.mjs.</p></div>
        </section>
      ) : (
        <>
          <section className="base-section">
            <div className="base-container px-4">
              <h2 className="text-3xl mb-2">Predicted table</h2>
              <p className="text-gray-700 mb-4 max-w-3xl">The regular season, with one tie against each other team, by expected table points.</p>
              <div className="bg-white overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="text-sm text-gray-600 border-b border-gray-200">
                    <tr>
                      <th scope="col" className="py-3 px-4 font-normal text-right w-12">#</th>
                      <th scope="col" className="py-3 px-4 font-normal">Team</th>
                      <th scope="col" className="py-3 px-4 font-normal text-right" title="Expected table points from one tie against each of the other seven teams">Table points</th>
                      <th scope="col" className="py-3 px-4 font-normal text-right hidden md:table-cell" title="Average over ties against the other seven teams">Matches won per tie</th>
                      <th scope="col" className="py-3 px-4 font-normal text-right">Wins tie</th>
                      <th scope="col" className="py-3 px-4 font-normal text-right hidden sm:table-cell">Draw</th>
                      <th scope="col" className="py-3 px-4 font-normal text-right hidden sm:table-cell">Loses tie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((t) => (
                      <tr key={t.team} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="py-3 px-4 text-right text-gray-600 tabular-nums">{t.rank}</td>
                        <td className="py-3 px-4">
                          <a href={`#${teamId(t.team)}`} className="flex items-center gap-2 hover:text-blue-600">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {clubs[t.team]?.logo && <img src={clubs[t.team].logo!} alt="" className="w-6 h-6 object-contain" />}
                            {t.team}
                          </a>
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums font-semibold">{t.strength.tablePoints.toFixed(1)}</td>
                        <td className="py-3 px-4 text-right tabular-nums hidden md:table-cell">{t.strength.expected.toFixed(2)} <span className="text-sm text-gray-500">of 8</span></td>
                        <td className="py-3 px-4 text-right tabular-nums">{percent(t.strength.win)}</td>
                        <td className="py-3 px-4 text-right tabular-nums hidden sm:table-cell">{percent(t.strength.draw)}</td>
                        <td className="py-3 px-4 text-right tabular-nums hidden sm:table-cell">{percent(t.strength.loss)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-gray-600 mt-2">Expected values: table points add up over the seven ties (28 at most), the other columns are averages per tie.</p>
            </div>
          </section>

          <section className="base-section">
            <div className="base-container px-4">
              <h2 className="text-3xl mb-2">Head to head</h2>
              <p className="text-gray-700 mb-4">Chance that the team on the left wins a tie against the team at the top. Hover for the expected score.</p>
              <div className="bg-white overflow-x-auto p-2">
                <table className="text-sm">
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
                          if (a.team === b.team) return <td key={b.team} className="p-2 text-center text-gray-300">–</td>;
                          const h = data.headToHead[a.team][b.team];
                          // One blue, deeper with the chance; white text on the deep cells
                          return (
                            <td
                              key={b.team}
                              className={`p-2 text-center tabular-nums border-2 border-white ${h.win > 0.55 ? "text-white" : "text-gray-900"}`}
                              style={{ background: `rgba(42, 120, 214, ${(0.08 + h.win * 0.82).toFixed(2)})` }}
                              title={`${a.team} against ${b.team}: expected ${h.expected.toFixed(1)}–${(8 - h.expected).toFixed(1)} in matches, ${h.points.toFixed(1)}–${(4 - h.points).toFixed(1)} in table points; wins ${percent(h.win)}, draws ${percent(h.draw)}, loses ${percent(h.loss)}`}
                            >
                              {h.win >= 0.995 ? ">99%" : h.win < 0.005 ? "<1%" : percent(h.win)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {teams.map((t) => {
            const players = new Map<string, Loose>(t.players.map((p: Loose) => [String(p.id ?? p.listName), p]));
            return (
              <section key={t.team} className="base-section scroll-mt-4" id={teamId(t.team)}>
                <div className="base-container px-4">
                  <h2 className="text-3xl mb-1 flex items-center gap-3">
                    {t.rank}. <Team name={t.team} clubs={clubs} size={10} className="gap-3" />
                  </h2>
                  <p className="text-gray-700 mb-6">
                    {t.strength.tablePoints.toFixed(1)} expected table points · {t.strength.expected.toFixed(2)} matches won per tie · wins {percent(t.strength.win)} of ties
                  </p>
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="bg-white p-4 md:p-6">
                      <h3 className="text-xl mb-1">Strongest lineup</h3>
                      <p className="text-sm text-gray-600 mb-4">With the chance of winning each match against an average Eliteserien opponent</p>
                      <table className="w-full text-left">
                        <tbody>
                          {data.slots.map((s: Loose) => {
                            const l = t.lineup[s.key];
                            return (
                              <tr key={s.key} className="border-b border-gray-100 last:border-0 align-top">
                                <td className="py-2 pr-4 text-sm text-gray-600 whitespace-nowrap">{s.label}</td>
                                <td className="py-2 pr-4">
                                  {l.players.map((key: number | string, i: number) => {
                                    const p = players.get(String(key));
                                    return (
                                      <span key={String(key)}>
                                        {p?.id ? <Link href={`/players/${p.id}`} className="hover:text-blue-600">{p.name}</Link> : p?.name}
                                        {i < l.players.length - 1 && <span className="text-gray-500"> + </span>}
                                      </span>
                                    );
                                  })}
                                </td>
                                <td className="py-2 text-right tabular-nums whitespace-nowrap">{percent(expectedScore(l.rating, refFor[s.key]))}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="bg-white p-4 md:p-6">
                      <h3 className="text-xl mb-4">Players</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="text-sm text-gray-600 border-b border-gray-200">
                            <tr>
                              <th scope="col" className="py-2 pr-4 font-normal">Player</th>
                              <th scope="col" className="py-2 pr-4 font-normal text-right">Singles</th>
                              <th scope="col" className="py-2 pr-4 font-normal text-right">Doubles</th>
                              <th scope="col" className="py-2 pr-4 font-normal text-right">Mixed</th>
                              <th scope="col" className="py-2 font-normal text-right" title="Official ranking points: singles / mixed doubles">Points</th>
                            </tr>
                          </thead>
                          <tbody>
                            {t.players.map((p: Loose) => (
                              <tr key={String(p.id ?? p.listName)} className="border-b border-gray-100 last:border-0 align-top">
                                <td className="py-2 pr-4">
                                  {p.id ? <Link href={`/players/${p.id}`} className="hover:text-blue-600">{p.name}</Link> : p.name}
                                  {p.loanFrom && <span className="ml-1 text-xs px-1.5 py-0.5 border border-gray-400 rounded text-gray-700 whitespace-nowrap">Loan from {p.loanFrom}</span>}
                                  {!p.rated && <span className="block text-sm text-gray-500">No rated matches</span>}
                                </td>
                                {(["singles", "doubles", "mixed"] as const).map((kind) => (
                                  <td key={kind} className="py-2 pr-4 text-right tabular-nums text-gray-700">
                                    {p.rated ? `${p.estimated?.[kind] ? "≈" : ""}${p[kind]}` : "–"}
                                  </td>
                                ))}
                                <td className="py-2 text-right tabular-nums text-gray-500 whitespace-nowrap">{p.points?.singles ?? 0} / {p.points?.mixed ?? 0}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        ≈ estimated: no rating in that discipline yet. Points: official ranking points in singles / mixed doubles, which decide who plays first singles and first mixed. Men first, then
                        women, by singles rating.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </>
      )}
    </>
  );
}
