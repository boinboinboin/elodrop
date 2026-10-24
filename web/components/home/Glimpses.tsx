// The front page cards' glimpses of the site's pages (components/home/HomeCard.tsx), each from the
// same data as its page, and each shown its own way: the number ones as a list, the strongest clubs
// with their logos, the predicted Eliteserien table as bars, the week's biggest upset as one big
// chance, the next tournament's luckiest draw, and the top two men head to head as a split bar.
import Link from "next/link";
import Team from "@/components/clubs/Team";
import ChanceBar from "@/components/head-to-head/ChanceBar";
import RankMovement from "@/components/rankings/RankMovement";
import { ArrowRight } from "@/components/SVG";
import { ROW, TEXT_LINK } from "@/components/ui/styles";
import { getClubsFile } from "@/data/clubs";
import { getEliteserien } from "@/data/eliteserien";
import { getRankings } from "@/data/rankings";
import { getClubMap } from "@/data/sanity";
import { getTournament, getTournamentsIndex } from "@/data/tournaments";
import { getUpsetsIndex } from "@/data/upsets";
import { t } from "@/messages/i18n";
import type { Entry, Loose, TournamentEvent } from "@/types";
import { date, dateRange, num, pct, signed, toneClass } from "@/utils/format";
import { headToHeadHref, playerHref, tournamentHref } from "@/utils/hrefs";
import { POOLS } from "@/utils/pools";
import { expectedScore } from "@/utils/rating";
import { RANKING_LISTS, rankingHref, rankingListTitle } from "@/utils/rankings";
import { eventTitle, noLuck } from "@/utils/tournament";
import { Teaser } from "./HomeCard";

const NoData = () => <p className="text-gray-600">{t("home.noData")}</p>;

/** Rankings: the number one of every list */
export async function RankingsGlimpse() {
  const lists = Object.values(RANKING_LISTS);
  const leaders = await Promise.all(lists.map(async (list) => ({ list, player: (await getRankings(list.pool, false, list.gender))[0] })));
  if (!leaders.some((l) => l.player)) return <NoData />;
  return (
    <>
      <Teaser>{t("home.rankings.teaser")}</Teaser>
      <ul>
        {leaders.map(({ list, player }) =>
          player ? (
            <li key={rankingHref(list.pool, list.gender)} className={`${ROW} py-1.5 flex items-baseline justify-between gap-3`}>
              <span className="min-w-0">
                <Link href={playerHref(player.id)} className="font-semibold hover:text-blue-600">{player.name}</Link>
                <Link href={rankingHref(list.pool, list.gender)} className="block text-sm text-gray-600 hover:text-blue-600">{rankingListTitle(list)}</Link>
              </span>
              <span className="text-xl font-semibold tabular-nums">{Math.round(player.rating)}</span>
            </li>
          ) : null,
        )}
      </ul>
    </>
  );
}

/** Clubs: the five strongest over all disciplines, with their logos and their move since last week */
export async function ClubsGlimpse() {
  const [file, clubs] = await Promise.all([getClubsFile(), getClubMap()]);
  const top = file?.clubs.combined.slice(0, 5) ?? [];
  if (!top.length) return <NoData />;
  return (
    <>
      <Teaser>{t("home.clubs.teaser")}</Teaser>
      <ol>
        {top.map((c) => (
          <li key={c.club} className={`${ROW} py-2 flex items-center gap-3`}>
            <span className="w-6 text-gray-500 tabular-nums">{c.rank}</span>
            <Team name={c.club} clubs={clubs} size={7} className="flex-1 min-w-0 text-lg" />
            <RankMovement rank={c.rank} previous={c.previousRank} />
            <span className="w-14 text-right tabular-nums">{signed(c.score, 2, "")}</span>
          </li>
        ))}
      </ol>
    </>
  );
}

/** Eliteserien: the predicted table, each team's expected table points as a bar */
export async function EliteserienGlimpse() {
  const [data, clubs] = await Promise.all([getEliteserien(), getClubMap()]);
  const teams: Loose[] = data?.teams ?? [];
  if (!teams.length) return <NoData />;
  const most = Math.max(...teams.map((team) => team.strength.tablePoints));
  return (
    <>
      <Teaser>{t("home.eliteserien.teaser", { season: data.season })}</Teaser>
      <ol className="space-y-1.5">
        {teams.map((team) => (
          <li key={team.team} className="grid grid-cols-[7.5rem_1fr] items-center gap-3">
            <Team name={team.team} clubs={clubs} size={5} className="min-w-0 truncate text-sm" />
            <span className="flex items-center gap-2" title={t("home.eliteserien.points", { points: num(team.strength.tablePoints, 1) })}>
              <span className="h-3 rounded-r" style={{ width: `${(team.strength.tablePoints / most) * 85}%`, background: "var(--color-chart-3)" }} />
              <span className="text-sm tabular-nums text-gray-700">{num(team.strength.tablePoints, 1)}</span>
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}

/** Upsets: the latest week's biggest, its winners' chance in large type */
export async function UpsetsGlimpse() {
  const latest = (await getUpsetsIndex())?.latest;
  const upset = latest?.matches.reduce((a, b) => (b.winChance < a.winChance ? b : a), latest.matches[0]);
  if (!latest || !upset) return <NoData />;
  const names = (side: typeof upset.winners) =>
    side.map((p, i) => (
      <span key={p.id}>
        {i > 0 && " / "}
        <Link href={playerHref(p.id)} className="hover:text-blue-600">{p.name}</Link>
      </span>
    ));
  return (
    <>
      <Teaser>{t("home.upsets.teaser", { week: date(latest.week) })}</Teaser>
      <p>
        <span className="text-6xl font-semibold tabular-nums tracking-tight">{pct(upset.winChance)}</span>{" "}
        <span className="text-gray-600">{t("home.upsets.chance")}</span>
      </p>
      <p className="mt-3 text-lg">
        <strong className="font-semibold">{names(upset.winners)}</strong> <span className="text-gray-600">{t("home.upsets.beat")}</span> {names(upset.losers)}
      </p>
      <p className="mt-1 text-sm text-gray-600 tabular-nums">
        {upset.score} · {POOLS[upset.pool]} · {upset.event}
      </p>
    </>
  );
}

/** Tournament draws: the next tournament (or the newest one played) and its luckiest draw, and how the favourites have done this season */
export async function TournamentsGlimpse() {
  const index = await getTournamentsIndex();
  const all = index?.tournaments ?? [];
  // "Today" is the day of the data update, which the page is rendered with
  const now = index?.generatedAt.slice(0, 10) ?? "";
  const coming = all.filter((x) => !x.cancelled && x.endDate && x.endDate >= now).sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""));
  const summary = coming[0] ?? all.find((x) => x.played > 0);
  if (!index || !summary) return <NoData />;
  const tour = await getTournament(summary.cup2000Id);
  // The entry with the most draw luck, over the events that have any
  const luckiest = (tour?.events ?? [])
    .filter((e) => !noLuck(e))
    .flatMap((e) => e.entries.filter((x) => x.luck).map((x) => ({ e, x, luck: x.luck!.score })))
    .reduce<{ e: TournamentEvent; x: Entry; luck: number } | null>((a, b) => (!a || b.luck > a.luck ? b : a), null);
  const ev = index.evaluation;
  return (
    <>
      <Teaser>{t("home.tournaments.next")}</Teaser>
      <Link href={tournamentHref(summary.cup2000Id)} className="text-lg font-semibold hover:text-blue-600">{summary.name}</Link>
      <p className="text-sm text-gray-600 tabular-nums">{dateRange(summary.startDate, summary.endDate)}</p>
      {luckiest && (
        <div className="mt-4 border-l-4 pl-3" style={{ borderColor: "var(--color-chart-5)" }}>
          <p className="text-sm text-gray-600">{t("home.tournaments.luckiest")}</p>
          <p>
            {luckiest.x.players.map((p) => p.name).join(" / ")}{" "}
            <span className={`font-semibold tabular-nums ${toneClass(luckiest.luck)}`}>
              {t(luckiest.e.placement ? "home.tournaments.places" : "home.tournaments.rounds", { luck: signed(luckiest.luck) })}
            </span>
          </p>
          <p className="text-sm text-gray-600">{eventTitle(luckiest.e)}</p>
        </div>
      )}
      {ev?.winners > 0 && (
        <p className="mt-4 text-sm text-gray-700">{t("home.tournaments.season", { won: ev.favouritesWon, winners: ev.winners, expected: num(ev.favouritesExpected) })}</p>
      )}
    </>
  );
}

/** Head to head: the top two in men's singles and each one's chance against the other */
export async function HeadToHeadGlimpse() {
  const [a, b] = await getRankings("men");
  if (!a || !b) return <NoData />;
  return (
    <>
      <Teaser>{t("home.headToHead.teaser")}</Teaser>
      <ChanceBar names={[a.name, b.name]} chance={expectedScore(a.rating, b.rating)} />
      <div className="flex justify-between gap-4 mt-1 text-sm text-gray-600 tabular-nums">
        <span>{Math.round(a.rating)}</span>
        <span>{Math.round(b.rating)}</span>
      </div>
      <p className="mt-4">
        <Link href={headToHeadHref(a.id, b.id)} className={TEXT_LINK}>{t("home.headToHead.pair", { a: a.name, b: b.name })} <ArrowRight /></Link>
      </p>
    </>
  );
}
