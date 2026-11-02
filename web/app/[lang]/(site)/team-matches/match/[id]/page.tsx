// One league team match (/team-matches/match/13061; pipeline/team-matches.mjs): the result, each
// team's chance with the lineups played, and every match with the players' ratings, its win chance and
// whether it was an upset.
import { getISOWeek, parseISO } from "date-fns";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Team from "@/components/clubs/Team";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PlayerLine from "@/components/players/PlayerLine";
import Badge from "@/components/ui/Badge";
import Link from "@/components/ui/Link";
import Loading from "@/components/ui/Loading";
import Section from "@/components/ui/Section";
import StatCard from "@/components/ui/StatCard";
import { ROW, STICKY_HEAD } from "@/components/ui/styles";
import { getClubMap } from "@/data/sanity";
import { getTeamMatch } from "@/data/teamMatches";
import { getI18n } from "@/messages/server";
import type { ClubEntry, TeamMatchGame, TeamMatchPlayer } from "@/types";
import { doublesHeadToHeadHref, headToHeadHref, teamMatchesHref, teamMatchHref } from "@/utils/hrefs";
import { pageMetadata } from "@/utils/metadata";
import { parseId } from "@/utils/parse";

// Team matches are rendered on their first visit and then cached
export async function generateStaticParams() {
  return [{ id: "0" }];
}

export async function generateMetadata({ params }: PageProps<"/[lang]/team-matches/match/[id]">): Promise<Metadata> {
  const i18n = await getI18n();
  const { t, date } = i18n;
  const id = parseId((await params).id);
  const tie = id === null ? null : await getTeamMatch(id);
  if (!tie) return { title: t("teamMatches.metadata.title") };
  const values = { home: tie.home, away: tie.away, date: date(tie.day), division: tie.division, score: `${tie.score[0]}–${tie.score[1]}` };
  return pageMetadata(i18n, { title: t("teamMatches.metadata.match", values), description: t("seo.descriptions.teamMatch", values), path: teamMatchHref(tie.matchId) });
}

export default async function TeamMatchPage(props: PageProps<"/[lang]/team-matches/match/[id]">) {
  const { t } = await getI18n();
  return (
    <Suspense fallback={<Loading label={t("teamMatches.match.loading")} section />}>
      <Content params={props.params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<PageProps<"/[lang]/team-matches/match/[id]">, "params">) {
  const { t, date, pct, pools, poolCodes } = await getI18n();
  const id = parseId((await params).id);
  const [tie, clubs] = await Promise.all([id === null ? null : getTeamMatch(id), getClubMap()]);
  if (!tie) notFound();
  // The start time, when known ("12:00"; some only have the day)
  const time = tie.time.length > 10 ? tie.time.slice(11, 16) : null;
  // A draw can't happen with an odd number of matches or a golden set
  const canDraw = !!tie.winChance && tie.winChance.draw > 0;
  const week = getISOWeek(parseISO(tie.week));
  const homeWon = tie.winner === 1;
  const awayWon = tie.winner === 2;
  /** "1. HS" as "MS1" (phones) and "Men's singles 1" */
  const number = (game: string) => game.match(/^(\d+)\./)?.[1] ?? "";
  const golden = tie.goldenSet;

  return (
    <>
      <Section>
        <Breadcrumbs
          trail={[
            { label: t("teamMatches.breadcrumb"), href: teamMatchesHref() },
            { label: `${t("teamMatches.weekOf", { week })}, ${tie.week.slice(0, 4)}`, href: teamMatchesHref(tie.week) },
            { label: `${tie.home} – ${tie.away}` },
          ]}
        />
        <p className="mt-4 text-gray-600">
          {tie.division} · {tie.group}
        </p>
        <h1 className="h1 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <Team name={tie.home} club={tie.homeClub} clubs={clubs} size={10} className={homeWon ? "" : "font-normal"} />
          <span className="text-gray-500">–</span>
          <Team name={tie.away} club={tie.awayClub} clubs={clubs} size={10} className={awayWon ? "" : "font-normal"} />
        </h1>
        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-4xl sm:text-5xl font-semibold tabular-nums">
            {tie.score[0]}–{tie.score[1]}
          </span>
          {tie.upset && <span title={t("teamMatches.upsetTitle")}><Badge>{t("teamMatches.upset")}</Badge></span>}
        </p>
        <p className="mt-2 text-gray-600">
          <time dateTime={tie.time}>{date(tie.day, "long")}{time && time !== "00:00" && `, ${time}`}</time>
        </p>
        {golden && (
          <p className="mt-1 text-gray-600">
            {t("eliteserien.review.ties.goldenSet", {
              discipline: golden.pool ? poolCodes[golden.pool] : "",
              side1: golden.side1.map((p) => p.name).join(" / "),
              side2: golden.side2.map((p) => p.name).join(" / "),
              score: golden.score.replaceAll("/", "–"),
            })}
          </p>
        )}
      </Section>

      {tie.games.length > 0 && (
        <Section title={t("teamMatches.match.chances")} titleClassName="text-2xl mb-4">
          {tie.winChance ? (
            <dl className={`grid gap-3 ${canDraw ? "sm:grid-cols-3" : "sm:grid-cols-2"}`} title={t("teamMatches.match.chancesTitle")}>
              <StatCard label={t("teamMatches.match.wins", { team: tie.home })}>{pct(tie.winChance.win)}</StatCard>
              {canDraw && <StatCard label={t("teamMatches.match.draw")}>{pct(tie.winChance.draw)}</StatCard>}
              <StatCard label={t("teamMatches.match.wins", { team: tie.away })}>{pct(tie.winChance.loss)}</StatCard>
            </dl>
          ) : (
            <p className="text-gray-600">{t("teamMatches.match.notRated")}</p>
          )}
        </Section>
      )}

      <Section title={t("teamMatches.matches")} titleClassName="text-2xl mb-2" intro={tie.games.length > 0 ? t("teamMatches.match.explanation") : undefined}>
        {tie.games.length ? (
          <div className="bg-white overflow-x-clip">
            <table className="w-full text-left">
              <thead className={STICKY_HEAD}>
                <tr>
                  <th scope="col" className="py-2 pl-2 pr-1 sm:px-4 font-normal">{t("teamMatches.match.match")}</th>
                  <th scope="col" className="py-2 px-2 sm:px-4 font-normal">
                    {tie.home}
                    <span className="sm:hidden"> – {tie.away}</span>
                  </th>
                  <th scope="col" className="hidden sm:table-cell py-2 px-4 font-normal">{tie.away}</th>
                  <th scope="col" className="py-2 px-2 sm:px-4 font-normal text-right">{t("teamMatches.match.score")}</th>
                  <th scope="col" className="hidden sm:table-cell py-2 px-4 font-normal text-right" title={t("teamMatches.match.chanceTitle")}>{t("teamMatches.match.chance")}</th>
                </tr>
              </thead>
              <tbody>
                {tie.games.map((g, i) => (
                  <tr key={i} className={`${ROW} align-top`}>
                    <td className="py-2 pl-2 pr-1 sm:px-4 whitespace-nowrap">
                      {g.pool ? (
                        <>
                          <abbr className="sm:hidden no-underline" title={`${pools[g.pool]} ${number(g.game)}`}>{poolCodes[g.pool]}{number(g.game)}</abbr>
                          <span className="hidden sm:inline">{pools[g.pool]} {number(g.game)}</span>
                        </>
                      ) : (
                        g.game
                      )}
                      <HeadToHead g={g} />
                    </td>
                    {/* On phones both sides in one cell, home above away */}
                    <td className="py-2 px-2 sm:px-4 max-sm:[overflow-wrap:anywhere]">
                      <Side players={g.side1} won={g.winner === 1} clubs={clubs} />
                      <span className="sm:hidden block text-sm text-gray-500">–</span>
                      <span className="sm:hidden">
                        <Side players={g.side2} won={g.winner === 2} clubs={clubs} />
                      </span>
                    </td>
                    <td className="hidden sm:table-cell py-2 px-4">
                      <Side players={g.side2} won={g.winner === 2} clubs={clubs} />
                    </td>
                    <td className="py-2 px-2 sm:px-4 text-right tabular-nums">
                      <Score g={g} />
                      {g.winChance != null && <span className="sm:hidden block text-sm text-gray-500" title={t("teamMatches.match.chanceTitle")}>{pct(g.winChance)}</span>}
                      {g.upset && <span className="block mt-1" title={t("teamMatches.match.upsetTitle")}><Badge>{t("teamMatches.upset")}</Badge></span>}
                    </td>
                    <td className="hidden sm:table-cell py-2 px-4 text-right tabular-nums">{g.winChance != null ? pct(g.winChance) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-600">{t("teamMatches.match.noMatches")}</p>
        )}
      </Section>
    </>
  );
}

/** A side's players, one per line, with their rating before and its change; the winners bold */
function Side({ players, won, clubs }: { players: TeamMatchPlayer[]; won: boolean; clubs: Record<string, ClubEntry> }) {
  return players.map((p) => <PlayerLine key={p.id} p={p} clubs={clubs} bold={won} rating />);
}

/** The sets, one per line on phones ("21–12"), or why there's no score */
async function Score({ g }: { g: TeamMatchGame }) {
  const { t } = await getI18n();
  if (g.walkover) return <span className="text-sm text-gray-600">{t("teamMatches.match.walkover")}</span>;
  if (!g.winner || !g.score) return <span className="text-sm text-gray-600">{t("teamMatches.match.notPlayed")}</span>;
  const sets = g.score.split(",").map((set) => set.replace("/", "–"));
  return (
    <span className="whitespace-nowrap">
      {sets.map((set, i) => (
        <span key={i} className="block sm:inline">
          {set}
          {i < sets.length - 1 && <span className="hidden sm:inline">, </span>}
        </span>
      ))}
    </span>
  );
}

/** A link to the two players' or pairs' head to head, when both sides are complete */
async function HeadToHead({ g }: { g: TeamMatchGame }) {
  const { t } = await getI18n();
  const [a, b] = [g.side1.map((p) => p.id), g.side2.map((p) => p.id)];
  const href =
    a.length === 1 && b.length === 1 ? headToHeadHref(a[0], b[0]) : a.length === 2 && b.length === 2 && new Set([...a, ...b]).size === 4 ? doublesHeadToHeadHref(a, b) : null;
  return href && <Link href={href} className="block text-sm text-gray-600 underline hover:text-blue-600">{t("teamMatches.match.headToHead")}</Link>;
}
