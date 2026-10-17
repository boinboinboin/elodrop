// An Eliteserien season in review (/eliteserien/2025-26; pipeline/eliteserien-review.mjs): the
// team strengths before each round against what actually happened.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Team from "@/components/Team";
import { getClubMap } from "@/lib/clubs";
import { getEliteserienReview, getMeta, type Loose } from "@/lib/data";
import { dateRange } from "@/lib/format";

// Every season in review is prerendered (and refreshed with the data)
export async function generateStaticParams() {
  const seasons = (await getMeta())?.eliteserien.seasons ?? [];
  return seasons.length ? seasons.map((season) => ({ season })) : [{ season: "0" }];
}

export async function generateMetadata({ params }: PageProps<"/eliteserien/[season]">): Promise<Metadata> {
  const data = await getEliteserienReview((await params).season);
  return { title: data ? `Eliteserien ${data.season} in review` : "Eliteserien" };
}

const DISCIPLINES: Record<string, string> = { MensSingles: "MS", WomensSingles: "WS", MensDoubles: "MD", WomensDoubles: "WD", MixedDoubles: "XD" };
/** "+1.2", "−0.4", "0.0" */
const signed = (x: number, decimals = 1) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x).toFixed(decimals)}`;
const percent = (x: number) => (x >= 0.995 ? ">99%" : x < 0.005 ? "<1%" : `${Math.round(x * 100)}%`);

export default function ReviewPage(props: PageProps<"/eliteserien/[season]">) {
  return (
    <Suspense fallback={<div className="base-container px-4 base-section text-gray-600">Loading season…</div>}>
      <Content params={props.params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<PageProps<"/eliteserien/[season]">, "params">) {
  const { season } = await params;
  const [data, clubs, meta] = await Promise.all([getEliteserienReview(season), getClubMap(), getMeta()]);
  if (!data) notFound();
  const seasons = meta?.eliteserien.seasons ?? [];
  const regulars: Loose[] = data.players.filter((p: Loose) => p.games >= 4);

  return (
    <>
      <section className="base-section">
        <div className="base-container px-4">
          <Link href="/eliteserien" className="text-gray-600 hover:text-black">&larr; Eliteserien</Link>
          <h1 className="h1 mt-4">Eliteserien {data.season} in review</h1>
          {seasons.length > 1 && (
            <nav className="mt-3 flex flex-wrap gap-2" aria-label="Seasons">
              {seasons.map((s) =>
                s === season ? (
                  <span key={s} className="px-3 py-1 border border-black rounded-full" aria-current="page">{s.replace("-", "/")}</span>
                ) : (
                  <Link key={s} href={`/eliteserien/${s}`} className="px-3 py-1 border border-gray-300 rounded-full text-gray-700 hover:border-black hover:text-black">{s.replace("-", "/")}</Link>
                ),
              )}
            </nav>
          )}
          <p className="text-2xl max-w-3xl mt-3">The team strengths before each round against what actually happened.</p>
          <div className="max-w-3xl mt-4 text-gray-700 space-y-2">
            <p>
              Before each round, every team&apos;s best lineup is worked out as for this season, with the players&apos; ratings from the week before and the official ranking from the day before. That gives
              each tie a <strong className="font-semibold">potential</strong>: the expected result if both teams field their best lineup. It is compared with the result{" "}
              <strong className="font-semibold">expected with the lineups actually played</strong> (each match&apos;s win chance from right before it) and with the <strong className="font-semibold">actual result</strong>.
              Walkovers and matches not played are left out, except in the play-offs (see below).
            </p>
            {data.rankingNote && <p>{data.rankingNote}</p>}
            <p>
              Teams are from <a href={data.source ?? "#"} className="underline hover:text-blue-600" rel="noopener">Norges Badmintonforbund&apos;s list</a>, with the players who played for a team without being on
              its list added from their first match.
            </p>
          </div>
        </div>
      </section>

      <section className="base-section">
        <div className="base-container px-4">
          <h2 className="text-3xl mb-2">Before the season</h2>
          <p className="text-gray-700 mb-4 max-w-3xl">
            The predicted regular-season table before the first round, as on the page for this season: expected table points from one tie against each team (4-0 for winning 6-2 or better, 3-1 for 5-3,
            2-2 for 4-4), against the actual table and the final standings after the play-offs.
          </p>
          <div className="bg-white overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-sm text-gray-600 border-b border-gray-200">
                <tr>
                  <th scope="col" className="py-3 px-4 font-normal text-right w-12">Predicted</th>
                  <th scope="col" className="py-3 px-4 font-normal">Team</th>
                  <th scope="col" className="py-3 px-4 font-normal text-right">Expected points</th>
                  <th scope="col" className="py-3 px-4 font-normal text-right">Actual points</th>
                  <th scope="col" className="py-3 px-4 font-normal text-right hidden md:table-cell">Matches won per tie</th>
                  <th scope="col" className="py-3 px-4 font-normal text-right">Regular season</th>
                  <th scope="col" className="py-3 px-4 font-normal text-right">Final</th>
                </tr>
              </thead>
              <tbody>
                {data.preseason.map((t: Loose) => {
                  const off = t.finalRank - t.rank;
                  return (
                    <tr key={t.team} className="border-b border-gray-100 last:border-0">
                      <td className="py-3 px-4 text-right tabular-nums">{t.rank}</td>
                      <td className="py-3 px-4"><Team name={t.team} clubs={clubs} /></td>
                      <td className="py-3 px-4 text-right tabular-nums">{t.tablePoints.toFixed(1)}</td>
                      <td className="py-3 px-4 text-right tabular-nums font-semibold">{t.points}</td>
                      <td className="py-3 px-4 text-right tabular-nums hidden md:table-cell">{t.expected.toFixed(2)} <span className="text-sm text-gray-500">of 8</span></td>
                      <td className="py-3 px-4 text-right tabular-nums">{t.regularRank}</td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {t.finalRank}
                        {off !== 0 && <span className="text-sm text-gray-500"> ({off > 0 ? `${off} lower` : `${-off} higher`})</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="base-section">
        <div className="base-container px-4">
          <h2 className="text-3xl mb-2">Who beat their potential</h2>
          <p className="text-gray-700 mb-4 max-w-3xl">
            Matches won over the season against the potential, split in two: <strong className="font-semibold">lineups</strong> (the expected result with the lineups actually played against the potential:
            players missing or rested, and opponents not at full strength either) and <strong className="font-semibold">performance</strong> (matches won against what the lineups played were expected to
            win). Table points are for the regular season, against the points expected from the potential of each tie.
          </p>
          <div className="bg-white overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-sm text-gray-600 border-b border-gray-200">
                <tr>
                  <th scope="col" className="py-3 px-4 font-normal">Team</th>
                  <th scope="col" className="py-3 px-4 font-normal text-right" title="Expected matches won with both teams at their best">Potential</th>
                  <th scope="col" className="py-3 px-4 font-normal text-right hidden sm:table-cell" title="Expected matches won with the lineups played">Expected</th>
                  <th scope="col" className="py-3 px-4 font-normal text-right">Won</th>
                  <th scope="col" className="py-3 px-4 font-normal text-right">Won − potential</th>
                  <th scope="col" className="py-3 px-4 font-normal text-right hidden md:table-cell">Lineups</th>
                  <th scope="col" className="py-3 px-4 font-normal text-right hidden md:table-cell">Performance</th>
                  <th scope="col" className="py-3 px-4 font-normal text-right" title="Regular-season table points: potential (both teams at their best, round by round) and actual">Table points</th>
                </tr>
              </thead>
              <tbody>
                {data.teams.map((t: Loose) => (
                  <tr key={t.team} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 px-4">
                      <Team name={t.team} clubs={clubs} /> <span className="block text-sm text-gray-600">{t.ties} ties, {t.matches} matches · final {t.finalRank}.</span>
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">{t.potential.toFixed(1)}</td>
                    <td className="py-3 px-4 text-right tabular-nums hidden sm:table-cell">{t.expected.toFixed(1)}</td>
                    <td className="py-3 px-4 text-right tabular-nums">{t.won}</td>
                    <td className="py-3 px-4 text-right tabular-nums font-semibold">{signed(t.won - t.potential)}</td>
                    <td className="py-3 px-4 text-right tabular-nums text-gray-700 hidden md:table-cell">{signed(t.expected - t.potential)}</td>
                    <td className="py-3 px-4 text-right tabular-nums text-gray-700 hidden md:table-cell">{signed(t.won - t.expected)}</td>
                    <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap">{t.points} <span className="text-sm text-gray-500">({signed(t.points - t.potentialPoints)})</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="base-section">
        <div className="base-container px-4">
          <h2 className="text-3xl mb-2">Ties</h2>
          <p className="text-gray-700 mb-4 max-w-3xl">
            Each tie&apos;s expected score and the home team&apos;s chance of winning, with both teams&apos; best lineups (<strong className="font-semibold">potential</strong>) and with the{" "}
            <strong className="font-semibold">lineups actually played</strong> (walkovers counted as won, as in the result), against the actual result. An upset is a tie won by a team that had less than a 30%
            chance with the lineups played.
          </p>
          <p className="text-gray-700 mb-4 max-w-3xl">
            In the play-offs a tie ends as soon as a team has won 5 matches, so the matches left are counted with their listed lineups&apos; chances from before the round. A tie at 4–4 is decided by a golden set:
            the teams take turns striking out disciplines, and one set is played in the last one left. It is taken to be the discipline where the teams&apos; top players or pairs are closest in rating, so there
            are no draws.
          </p>
          {data.rounds.map((round: Loose) => (
            <div key={round.name}>
              <h3 className="text-xl mt-6 mb-2">
                {round.name} <span className="text-base text-gray-600">{dateRange(round.from, round.to, true)}</span>
              </h3>
              <div className="bg-white overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="text-sm text-gray-600 border-b border-gray-200">
                    <tr>
                      <th scope="col" className="py-2 px-4 font-normal">Tie</th>
                      <th scope="col" className="py-2 px-4 font-normal text-right" title="Both teams' best lineups: expected score, and the home team's chance of winning">Potential</th>
                      <th scope="col" className="py-2 px-4 font-normal text-right" title="The lineups actually played: expected score, and the home team's chance of winning">Lineups played</th>
                      <th scope="col" className="py-2 px-4 font-normal text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ties
                      .filter((t: Loose) => t.round === round.name)
                      .map((t: Loose, i: number) => {
                        const homeWon = t.winner === 1;
                        const awayWon = t.winner === 2;
                        // Upsets are judged on the lineups played
                        const upset = (homeWon && t.played.win < 0.3) || (awayWon && t.played.loss < 0.3);
                        return (
                          <tr key={i} className="border-b border-gray-100 last:border-0">
                            <td className="py-2 px-4">
                              <Team name={t.home} clubs={clubs} size={5} className={homeWon ? "font-semibold" : ""} />
                              <span className="text-gray-500 mx-1">–</span>
                              <Team name={t.away} clubs={clubs} size={5} className={awayWon ? "font-semibold" : ""} />
                              {t.playoff && <span className="block text-sm text-gray-600">{t.group}</span>}
                            </td>
                            {[t.potential, t.played].map((odds: Loose, j: number) => {
                              const total = j === 0 || t.playoff ? 8 : t.score[0] + t.score[1];
                              return (
                                <td key={j} className={`py-2 px-4 text-right tabular-nums whitespace-nowrap ${j === 0 ? "text-gray-600" : ""}`}>
                                  {odds.expected.toFixed(1)}–{(total - odds.expected).toFixed(1)}
                                  <span className="block text-sm text-gray-500">{percent(odds.win)} home win</span>
                                  {odds.golden && (
                                    <span className="block text-xs text-gray-500" title="Chance of 4–4, and the golden set's discipline and home win chance">
                                      4–4 {Math.round(odds.drawBefore * 100)}%, golden set {DISCIPLINES[odds.golden.discipline] ?? odds.golden.discipline} {Math.round(odds.golden.chance * 100)}%
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="py-2 px-4 text-right tabular-nums whitespace-nowrap">
                              {t.score[0]}–{t.score[1]}
                              {!t.playoff && <span className="text-sm text-gray-500" title="Table points"> ({t.points[0]}–{t.points[1]})</span>}
                              {t.goldenSet && (
                                <span className="block text-sm text-gray-600">
                                  Golden set {DISCIPLINES[t.goldenSet.discipline] ?? t.goldenSet.discipline}: {t.goldenSet.side1.join(" / ")} – {t.goldenSet.side2.join(" / ")} {t.goldenSet.score.replaceAll("/", "–")}
                                </span>
                              )}
                              {upset && <span className="ml-1 text-xs px-1.5 py-0.5 border border-gray-400 rounded text-gray-700">Upset</span>}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="base-section">
        <div className="base-container px-4">
          <h2 className="text-3xl mb-2">Players</h2>
          <p className="text-gray-700 mb-4 max-w-3xl">
            Matches won against the expected wins from the players&apos; ratings right before each match, for players with at least 4 Eliteserien matches. Doubles partners share their results.
          </p>
          <div className="grid gap-6 lg:grid-cols-2">
            {[
              { title: "Above expectation", list: regulars.slice(0, 10) },
              { title: "Below expectation", list: [...regulars].reverse().slice(0, 10) },
            ].map(({ title, list }) => (
              <div key={title} className="bg-white p-4 md:p-6">
                <h3 className="text-xl mb-4">{title}</h3>
                <table className="w-full text-left">
                  <thead className="text-sm text-gray-600 border-b border-gray-200">
                    <tr>
                      <th scope="col" className="py-2 pr-4 font-normal">Player</th>
                      <th scope="col" className="py-2 pr-4 font-normal text-right">Won</th>
                      <th scope="col" className="py-2 pr-4 font-normal text-right">Expected</th>
                      <th scope="col" className="py-2 font-normal text-right">Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((p: Loose) => (
                      <tr key={p.id} className="border-b border-gray-100 last:border-0">
                        <td className="py-2 pr-4">
                          <Link href={`/players/${p.id}`} className="hover:text-blue-600">{p.name}</Link>
                          <span className="block text-sm text-gray-600"><Team name={p.team} clubs={clubs} size={4} /></span>
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">{p.won} of {p.games}</td>
                        <td className="py-2 pr-4 text-right tabular-nums">{p.expected.toFixed(1)}</td>
                        <td className="py-2 text-right tabular-nums font-semibold">{signed(p.diff)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      </section>

      {data.changes?.length > 0 && (
        <section className="base-section">
          <div className="base-container px-4">
            <h2 className="text-xl mb-2">Changes to the list</h2>
            <p className="text-gray-700 mb-2">Players who played for a team without being on its list, counted for the team they played for:</p>
            <ul className="text-gray-700 list-disc pl-6">
              {data.changes.map((c: Loose) => (
                <li key={c.id}>
                  <Link href={`/players/${c.id}`} className="hover:text-blue-600">{c.name}</Link>, <Team name={c.team} clubs={clubs} size={4} />: {c.change}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
