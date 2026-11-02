// One league team match (/team-matches/match/13061; pipeline/team-matches.mjs): the result, each
// team's chance with the lineups played, and every match with the players' ratings, its win chance and
// whether it was an upset.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Team from "@/components/clubs/Team";
import ChanceBar from "@/components/head-to-head/ChanceBar";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PlayerLine from "@/components/players/PlayerLine";
import Badge from "@/components/ui/Badge";
import Link from "@/components/ui/Link";
import Loading from "@/components/ui/Loading";
import Section from "@/components/ui/Section";
import Swatch from "@/components/ui/Swatch";
import { getClubMap } from "@/data/sanity";
import { getTeamMatch } from "@/data/teamMatches";
import { getI18n } from "@/messages/server";
import type { ClubEntry, TeamMatchGame } from "@/types";
import { SIDE_COLORS } from "@/utils/chart";
import { seasonLabel } from "@/utils/format";
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
  const { t, date, num } = await getI18n();
  const id = parseId((await params).id);
  const [tie, clubs] = await Promise.all([id === null ? null : getTeamMatch(id), getClubMap()]);
  if (!tie) notFound();
  // The start time, when known ("12:00"; some only have the day)
  const time = tie.time.length > 10 ? tie.time.slice(11, 16) : null;
  const names: [string, string] = [tie.home, tie.away];
  // The expected score with the lineups played: the rated matches' chances plus the walkovers
  const rated = tie.games.filter((g) => g.winChance != null);
  const walkovers = [1, 2].map((side) => tie.games.filter((g) => g.walkover && g.winner === side).length);
  const expectedHome = rated.reduce((sum, g) => sum + (g.winChance ?? 0), 0) + walkovers[0];
  const expectedAway = rated.length - (expectedHome - walkovers[0]) + walkovers[1];
  const golden = tie.goldenSet;

  return (
    <>
      <Section>
        <Breadcrumbs
          trail={[
            { label: t("teamMatches.breadcrumb"), href: teamMatchesHref() },
            // The season, at this team match's week
            { label: seasonLabel(tie.season, true), href: teamMatchesHref(tie.week) },
            { label: `${tie.home} – ${tie.away}` },
          ]}
        />
        <h1 className="h1 mt-4">{tie.home} – {tie.away}</h1>
        <p className="mt-2 text-gray-600">
          {tie.division} · {tie.group} · <time dateTime={tie.time}>{date(tie.day, "long")}{time && time !== "00:00" && `, ${time}`}</time>
        </p>

        {/* The scoreboard: the teams in their colours either side of the score, then the chances before */}
        <div className="bg-white p-4 md:p-6 mt-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2 sm:gap-6 items-center text-center [overflow-wrap:anywhere]">
            {[0, 1].map((i) => (
              <div key={i} className={i === 0 ? "order-1" : "order-3"}>
                <Swatch color={SIDE_COLORS[i]} className="w-8 h-1 mb-3" />
                <p className={`text-lg sm:text-2xl ${tie.winner === i + 1 ? "font-semibold" : ""}`}>
                  <Team name={names[i]} club={i === 0 ? tie.homeClub : tie.awayClub} clubs={clubs} size={12} stacked />
                </p>
              </div>
            ))}
            <div className="order-2 px-1 sm:px-4">
              <p className="text-5xl sm:text-6xl font-semibold tabular-nums whitespace-nowrap">
                {tie.score[0]}<span className="text-gray-400 mx-1 sm:mx-2">–</span>{tie.score[1]}
              </p>
              <p className="text-sm text-gray-600 mt-1">{tie.winner ? t("teamMatches.match.won", { team: names[tie.winner - 1] }) : t("teamMatches.match.draw")}</p>
              {tie.upset && <p className="mt-2" title={t("teamMatches.upsetTitle")}><Badge>{t("teamMatches.upset")}</Badge></p>}
            </div>
          </div>
          {tie.games.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg mb-3" title={t("teamMatches.match.chancesTitle")}>{t("teamMatches.match.chances")}</h2>
              {tie.winChance ? (
                <>
                  <ChanceBar names={names} chance={tie.winChance.win} draw={tie.winChance.draw} />
                  <p className="text-sm text-gray-600 mt-2 tabular-nums">{t("teamMatches.match.expected", { home: num(expectedHome, 1), away: num(expectedAway, 1) })}</p>
                </>
              ) : (
                <p className="text-gray-600">{t("teamMatches.match.notRated")}</p>
              )}
            </div>
          )}
        </div>
      </Section>

      <Section title={t("teamMatches.matches")} titleClassName="text-3xl mb-2" intro={tie.games.length > 0 ? t("teamMatches.match.explanation") : undefined}>
        {tie.games.length ? (
          <ol className="grid gap-2">
            {tie.games.map((g, i) => <GameRow key={i} g={g} clubs={clubs} />)}
            {golden && (
              <GameRow
                g={{ game: "", pool: golden.pool, side1: golden.side1, side2: golden.side2, winner: golden.winner, score: golden.score, walkover: false, winChance: null, upset: false }}
                label={t("teamMatches.match.goldenSet")}
                clubs={clubs}
              />
            )}
          </ol>
        ) : (
          <p className="text-gray-600">{t("teamMatches.match.noMatches")}</p>
        )}
      </Section>
    </>
  );
}

/**
 * One match as a row of the scoreboard: the discipline on the left, the upset label in the middle and the
 * head to head link on the right along the top, then the home side on the left, the away side on the right (the winners bold)
 * and between them the sets (side by side from md up) and the sides' chances as a bar
 */
async function GameRow({ g, clubs, label }: { g: TeamMatchGame; clubs: Record<string, ClubEntry>; label?: string }) {
  const { t, pct, pools, poolCodes } = await getI18n();
  const n = g.game.match(/^(\d+)\./)?.[1] ?? "";
  const name = label ?? (g.pool ? `${pools[g.pool]} ${n}` : g.game);
  const code = label ?? (g.pool ? `${poolCodes[g.pool]}${n}` : g.game);
  return (
    <li className="bg-white p-3 sm:p-4">
      {/* The top line: the discipline, the upset label in the middle and the head to head link */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mb-2">
        <abbr className="font-mono text-xs text-gray-600 no-underline justify-self-start" title={name}>{code}</abbr>
        {g.upset ? <span title={t("teamMatches.match.upsetTitle")}><Badge>{t("teamMatches.upset")}</Badge></span> : <span />}
        <span className="justify-self-end"><HeadToHead g={g} /></span>
      </div>
      {/* The middle has a fixed width, so every match's chance bar is as long */}
      <div className="grid grid-cols-[minmax(0,1fr)_6rem_minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_11rem_minmax(0,1fr)] gap-2 sm:gap-6 items-center max-sm:[overflow-wrap:anywhere]">
        <div>
          {g.side1.map((p) => <PlayerLine key={p.id} p={p} clubs={clubs} bold={g.winner === 1} muted={g.winner === 2} rating />)}
        </div>
        <div className="text-center">
          <Score g={g} />
          {g.winChance != null && (
            <div className="mt-1.5" title={t("teamMatches.match.chanceTitle")}>
              <div className="flex h-1.5 gap-0.5" role="img" aria-label={`${pct(g.winChance)} – ${pct(1 - g.winChance)}`}>
                <div className="rounded-l" style={{ width: `${(g.winChance * 100).toFixed(1)}%`, background: SIDE_COLORS[0] }} />
                <div className="rounded-r flex-1" style={{ background: SIDE_COLORS[1] }} />
              </div>
              <div className="flex justify-between gap-2 text-xs text-gray-500 tabular-nums mt-0.5" aria-hidden="true">
                <span>{pct(g.winChance)}</span>
                <span>{pct(1 - g.winChance)}</span>
              </div>
            </div>
          )}
        </div>
        <div>
          {g.side2.map((p) => <PlayerLine key={p.id} p={p} clubs={clubs} bold={g.winner === 2} muted={g.winner === 1} rating right />)}
        </div>
      </div>
    </li>
  );
}

/** The sets ("21–12"), one per line on phones and side by side from md up, or why there's no score */
async function Score({ g }: { g: TeamMatchGame }) {
  const { t } = await getI18n();
  if (g.walkover) return <p className="text-sm text-gray-600">{t("teamMatches.match.walkover")}</p>;
  if (!g.winner || !g.score) return <p className="text-sm text-gray-600">{t("teamMatches.match.notPlayed")}</p>;
  return (
    <p className="tabular-nums leading-snug md:flex md:justify-center md:gap-3">
      {g.score.split(",").map((set, i) => <span key={i} className="block whitespace-nowrap">{set.replace("/", "–")}</span>)}
    </p>
  );
}

/** A link to the two players' or pairs' head to head, when both sides are complete */
async function HeadToHead({ g }: { g: TeamMatchGame }) {
  const { t } = await getI18n();
  const [a, b] = [g.side1.map((p) => p.id), g.side2.map((p) => p.id)];
  const href =
    a.length === 1 && b.length === 1 ? headToHeadHref(a[0], b[0]) : a.length === 2 && b.length === 2 && new Set([...a, ...b]).size === 4 ? doublesHeadToHeadHref(a, b) : null;
  return href && <Link href={href} className="text-xs text-gray-600 underline hover:text-blue-600 whitespace-nowrap">{t("teamMatches.match.headToHead")}</Link>;
}
