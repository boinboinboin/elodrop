// An Eliteserien season in review (/eliteserien/2025-26; pipeline/eliteserien-review.mjs): the
// team strengths before each round against what actually happened.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import Team from "@/components/clubs/Team";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import Card from "@/components/ui/Card";
import Link from "@/components/ui/Link";
import Loading from "@/components/ui/Loading";
import Section from "@/components/ui/Section";
import { ROW, TEXT_LINK } from "@/components/ui/styles";
import { getEliteserienReview } from "@/data/eliteserien";
import { getMeta } from "@/data/meta";
import { getClubMap } from "@/data/sanity";
import { getI18n } from "@/messages/server";
import type { Loose, Pool } from "@/types";
import { eliteserienHref, playerHref } from "@/utils/hrefs";
import { pageMetadata } from "@/utils/metadata";

// Every season in review is prerendered (and refreshed with the data)
export async function generateStaticParams() {
  const seasons = (await getMeta())?.eliteserien.seasons ?? [];
  return seasons.length ? seasons.map((season) => ({ season })) : [{ season: "0" }];
}

export async function generateMetadata({ params }: PageProps<"/[lang]/eliteserien/[season]">): Promise<Metadata> {
  const i18n = await getI18n();
  const { t } = i18n;
  const { season } = await params;
  const data = await getEliteserienReview(season);
  if (!data) return { title: t("eliteserien.title") };
  return pageMetadata(i18n, { title: t("eliteserien.review.title", { season: data.season }), description: t("seo.descriptions.eliteserienSeason", { season: data.season }), path: eliteserienHref(season) });
}

/** The golden set's discipline (as in the data, "MixedDoubles") as a pool */
const DISCIPLINE_POOLS: Record<string, Pool> = { MensSingles: "men", WomensSingles: "women", MensDoubles: "mensDoubles", WomensDoubles: "womensDoubles", MixedDoubles: "mixedDoubles" };
/** A season in review's URL part as its name: "2024-25" → "2024/25" */
const seasonName = (season: string) => season.replace("-", "/");
const strong = (text: ReactNode) => <strong className="font-semibold">{text}</strong>;

export default async function ReviewPage(props: PageProps<"/[lang]/eliteserien/[season]">) {
  const { t } = await getI18n();
  return (
    <Suspense fallback={<Loading label={t("eliteserien.review.loading")} section />}>
      <Content params={props.params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<PageProps<"/[lang]/eliteserien/[season]">, "params">) {
  const { t, plural, rich, num, pct, signed, dateRange, poolCodes } = await getI18n();
  const disciplineCode = (discipline: string) => (DISCIPLINE_POOLS[discipline] ? poolCodes[DISCIPLINE_POOLS[discipline]] : discipline);
  /** "+1.2", "−0.4", "0.0" */
  const diff = (x: number) => signed(x, 1, "");
  const { season } = await params;
  const [data, clubs, meta] = await Promise.all([getEliteserienReview(season), getClubMap(), getMeta()]);
  if (!data) notFound();
  const seasons = meta?.eliteserien.seasons ?? [];
  const regulars: Loose[] = data.players.filter((p: Loose) => p.games >= 4);

  return (
    <>
      <Section>
        <Breadcrumbs trail={[{ label: t("eliteserien.title"), href: "/eliteserien" }, { label: data.season }]} />
        <h1 className="h1 mt-4">{t("eliteserien.review.title", { season: data.season })}</h1>
        {seasons.length > 1 && (
          <nav className="mt-3 flex flex-wrap gap-2" aria-label={t("eliteserien.review.seasons")}>
            {seasons.map((s) =>
              s === season ? (
                <span key={s} className="px-3 py-1 border border-black rounded-full" aria-current="page">{seasonName(s)}</span>
              ) : (
                <Link key={s} href={eliteserienHref(s)} className="px-3 py-1 border border-gray-300 rounded-full text-gray-700 hover:border-black hover:text-black">{seasonName(s)}</Link>
              ),
            )}
          </nav>
        )}
        <p className="text-2xl max-w-3xl mt-3">{t("eliteserien.review.intro")}</p>
        <div className="max-w-3xl mt-4 text-gray-700 space-y-2">
          <p>{rich("eliteserien.review.howItWorks", { strong })}</p>
          {data.rankingNote && <p>{data.rankingNote}</p>}
          <p>
            {rich("eliteserien.review.teams", {
              link: (text) => (
                <a href={data.source ?? "#"} className={TEXT_LINK} rel="noopener">
                  {text}
                </a>
              ),
            })}
          </p>
        </div>
      </Section>

      <Section title={t("eliteserien.review.preseason.title")} titleClassName="text-3xl mb-2" intro={t("eliteserien.review.preseason.intro")}>
        <div className="bg-white overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-sm text-gray-600 border-b border-gray-200">
              <tr>
                <th scope="col" className="py-3 px-4 font-normal text-right w-12">{t("eliteserien.review.preseason.predicted")}</th>
                <th scope="col" className="py-3 px-4 font-normal">{t("eliteserien.review.preseason.team")}</th>
                <th scope="col" className="py-3 px-4 font-normal text-right">{t("eliteserien.review.preseason.expectedPoints")}</th>
                <th scope="col" className="py-3 px-4 font-normal text-right">{t("eliteserien.review.preseason.actualPoints")}</th>
                <th scope="col" className="py-3 px-4 font-normal text-right hidden md:table-cell">{t("eliteserien.review.preseason.matchesPerTie")}</th>
                <th scope="col" className="py-3 px-4 font-normal text-right">{t("eliteserien.review.preseason.regularSeason")}</th>
                <th scope="col" className="py-3 px-4 font-normal text-right">{t("eliteserien.review.preseason.final")}</th>
              </tr>
            </thead>
            <tbody>
              {data.preseason.map((team: Loose) => {
                const off = team.finalRank - team.rank;
                return (
                  <tr key={team.team} className={ROW}>
                    <td className="py-3 px-4 text-right tabular-nums">{team.rank}</td>
                    <td className="py-3 px-4"><Team name={team.team} clubs={clubs} /></td>
                    <td className="py-3 px-4 text-right tabular-nums">{num(team.tablePoints, 1)}</td>
                    <td className="py-3 px-4 text-right tabular-nums font-semibold">{team.points}</td>
                    <td className="py-3 px-4 text-right tabular-nums hidden md:table-cell">
                      {num(team.expected, 2)} <span className="text-sm text-gray-500">{t("eliteserien.table.ofEight")}</span>
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">{team.regularRank}</td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      {team.finalRank}
                      {off !== 0 && (
                        <span className="text-sm text-gray-500"> {t(off > 0 ? "eliteserien.review.preseason.lower" : "eliteserien.review.preseason.higher", { places: Math.abs(off) })}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title={t("eliteserien.review.potential.title")} titleClassName="text-3xl mb-2" intro={rich("eliteserien.review.potential.intro", { strong })}>
        <div className="bg-white overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-sm text-gray-600 border-b border-gray-200">
              <tr>
                <th scope="col" className="py-3 px-4 font-normal">{t("eliteserien.review.potential.team")}</th>
                <th scope="col" className="py-3 px-4 font-normal text-right" title={t("eliteserien.review.potential.potentialTitle")}>{t("eliteserien.review.potential.potential")}</th>
                <th scope="col" className="py-3 px-4 font-normal text-right hidden sm:table-cell" title={t("eliteserien.review.potential.expectedTitle")}>{t("eliteserien.review.potential.expected")}</th>
                <th scope="col" className="py-3 px-4 font-normal text-right">{t("eliteserien.review.potential.won")}</th>
                <th scope="col" className="py-3 px-4 font-normal text-right">{t("eliteserien.review.potential.wonMinusPotential")}</th>
                <th scope="col" className="py-3 px-4 font-normal text-right hidden md:table-cell">{t("eliteserien.review.potential.lineups")}</th>
                <th scope="col" className="py-3 px-4 font-normal text-right hidden md:table-cell">{t("eliteserien.review.potential.performance")}</th>
                <th scope="col" className="py-3 px-4 font-normal text-right" title={t("eliteserien.review.potential.tablePointsTitle")}>{t("eliteserien.review.potential.tablePoints")}</th>
              </tr>
            </thead>
            <tbody>
              {data.teams.map((team: Loose) => (
                <tr key={team.team} className={ROW}>
                  <td className="py-3 px-4">
                    <Team name={team.team} clubs={clubs} />{" "}
                    <span className="block text-sm text-gray-600">
                      {t("eliteserien.review.potential.teamSummary", {
                        ties: plural("eliteserien.review.potential.ties", team.ties),
                        matches: plural("common.matches", team.matches),
                        rank: team.finalRank,
                      })}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">{num(team.potential, 1)}</td>
                  <td className="py-3 px-4 text-right tabular-nums hidden sm:table-cell">{num(team.expected, 1)}</td>
                  <td className="py-3 px-4 text-right tabular-nums">{team.won}</td>
                  <td className="py-3 px-4 text-right tabular-nums font-semibold">{diff(team.won - team.potential)}</td>
                  <td className="py-3 px-4 text-right tabular-nums text-gray-700 hidden md:table-cell">{diff(team.expected - team.potential)}</td>
                  <td className="py-3 px-4 text-right tabular-nums text-gray-700 hidden md:table-cell">{diff(team.won - team.expected)}</td>
                  <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap">
                    {team.points} <span className="text-sm text-gray-500">({diff(team.points - team.potentialPoints)})</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title={t("eliteserien.review.ties.title")} titleClassName="text-3xl mb-2" intro={rich("eliteserien.review.ties.intro", { strong })}>
        <p className="text-gray-700 mb-4 max-w-3xl">{t("eliteserien.review.ties.playoffs")}</p>
        {data.rounds.map((round: Loose) => (
          <div key={round.name}>
            <h3 className="text-xl mt-6 mb-2">
              {round.name} <span className="text-base text-gray-600">{dateRange(round.from, round.to, true)}</span>
            </h3>
            <div className="bg-white overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-sm text-gray-600 border-b border-gray-200">
                  <tr>
                    <th scope="col" className="py-2 px-4 font-normal">{t("eliteserien.review.ties.tie")}</th>
                    <th scope="col" className="py-2 px-4 font-normal text-right" title={t("eliteserien.review.ties.potentialTitle")}>{t("eliteserien.review.ties.potential")}</th>
                    <th scope="col" className="py-2 px-4 font-normal text-right" title={t("eliteserien.review.ties.playedTitle")}>{t("eliteserien.review.ties.played")}</th>
                    <th scope="col" className="py-2 px-4 font-normal text-right">{t("eliteserien.review.ties.result")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ties
                    .filter((tie: Loose) => tie.round === round.name)
                    .map((tie: Loose, i: number) => {
                      const homeWon = tie.winner === 1;
                      const awayWon = tie.winner === 2;
                      // Upsets are judged on the lineups played
                      const upset = (homeWon && tie.played.win < 0.3) || (awayWon && tie.played.loss < 0.3);
                      return (
                        <tr key={i} className={ROW}>
                          <td className="py-2 px-4">
                            <Team name={tie.home} clubs={clubs} size={5} className={homeWon ? "font-semibold" : ""} />
                            <span className="text-gray-500 mx-1">–</span>
                            <Team name={tie.away} clubs={clubs} size={5} className={awayWon ? "font-semibold" : ""} />
                            {tie.playoff && <span className="block text-sm text-gray-600">{tie.group}</span>}
                          </td>
                          {[tie.potential, tie.played].map((odds: Loose, j: number) => {
                            const total = j === 0 || tie.playoff ? 8 : tie.score[0] + tie.score[1];
                            return (
                              <td key={j} className={`py-2 px-4 text-right tabular-nums whitespace-nowrap ${j === 0 ? "text-gray-600" : ""}`}>
                                {num(odds.expected, 1)}–{num(total - odds.expected, 1)}
                                <span className="block text-sm text-gray-500">{t("eliteserien.review.ties.homeWin", { chance: pct(odds.win) })}</span>
                                {odds.golden && (
                                  <span className="block text-xs text-gray-500" title={t("eliteserien.review.ties.goldenOddsTitle")}>
                                    {t("eliteserien.review.ties.goldenOdds", { draw: pct(odds.drawBefore), discipline: disciplineCode(odds.golden.discipline), chance: pct(odds.golden.chance) })}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          <td className="py-2 px-4 text-right tabular-nums whitespace-nowrap">
                            {tie.score[0]}–{tie.score[1]}
                            {!tie.playoff && (
                              <span className="text-sm text-gray-500" title={t("eliteserien.review.ties.tablePoints")}>
                                {" "}
                                ({tie.points[0]}–{tie.points[1]})
                              </span>
                            )}
                            {tie.goldenSet && (
                              <span className="block text-sm text-gray-600">
                                {t("eliteserien.review.ties.goldenSet", {
                                  discipline: disciplineCode(tie.goldenSet.discipline),
                                  side1: tie.goldenSet.side1.join(" / "),
                                  side2: tie.goldenSet.side2.join(" / "),
                                  score: tie.goldenSet.score.replaceAll("/", "–"),
                                })}
                              </span>
                            )}
                            {upset && <span className="ml-1 text-xs px-1.5 py-0.5 border border-gray-400 rounded text-gray-700">{t("eliteserien.review.ties.upset")}</span>}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </Section>

      <Section title={t("eliteserien.review.players.title")} titleClassName="text-3xl mb-2" intro={t("eliteserien.review.players.intro")}>
        <div className="grid gap-6 lg:grid-cols-2">
          {[
            { key: "above", title: t("eliteserien.review.players.above"), list: regulars.slice(0, 10) },
            { key: "below", title: t("eliteserien.review.players.below"), list: [...regulars].reverse().slice(0, 10) },
          ].map(({ key, title, list }) => (
            <Card key={key}>
              <h3 className="text-xl mb-4">{title}</h3>
              <table className="w-full text-left">
                <thead className="text-sm text-gray-600 border-b border-gray-200">
                  <tr>
                    <th scope="col" className="py-2 pr-4 font-normal">{t("eliteserien.review.players.player")}</th>
                    <th scope="col" className="py-2 pr-4 font-normal text-right">{t("eliteserien.review.players.won")}</th>
                    <th scope="col" className="py-2 pr-4 font-normal text-right">{t("eliteserien.review.players.expected")}</th>
                    <th scope="col" className="py-2 font-normal text-right">{t("eliteserien.review.players.difference")}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p: Loose) => (
                    <tr key={p.id} className={ROW}>
                      <td className="py-2 pr-4">
                        <Link href={playerHref(p.id)} className="hover:text-blue-600">{p.name}</Link>
                        <span className="block text-sm text-gray-600"><Team name={p.team} clubs={clubs} size={4} /></span>
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">{t("eliteserien.review.players.wonOf", { won: p.won, games: p.games })}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{num(p.expected, 1)}</td>
                      <td className="py-2 text-right tabular-nums font-semibold">{diff(p.diff)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ))}
        </div>
      </Section>

      {data.changes?.length > 0 && (
        <Section title={t("eliteserien.review.changes.title")} titleClassName="text-xl mb-2">
          <p className="text-gray-700 mb-2">{t("eliteserien.review.changes.intro")}</p>
          <ul className="text-gray-700 list-disc pl-6">
            {data.changes.map((c: Loose) => (
              <li key={c.id}>
                <Link href={playerHref(c.id)} className="hover:text-blue-600">{c.name}</Link>, <Team name={c.team} clubs={clubs} size={4} />: {c.change}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
