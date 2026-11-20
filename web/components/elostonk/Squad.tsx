"use client";

// EloStonk's "My squad" tab: the squad for the next round and the player search to fill it (SquadPicker), with the
// round under way between them (the squad that counts in it, and its points so far), then the member's rounds so far:
// this season's best, worst and average round, their season rank after each round (a chart, from the standings worked
// out each week), and each round with its rank, opening their squad in it beside the team of the round (TeamOfRound).
// Not signed in: a way to sign in; signed in but without "This is me" or a nickname: the account page.
import { useEffect, useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import LineChart from "@/components/charts/LineChart";
import SquadLine from "@/components/elostonk/SquadLine";
import SquadPicker from "@/components/elostonk/SquadPicker";
import TeamOfRound from "@/components/elostonk/TeamOfRound";
import { useNow, useStonkPlayers } from "@/components/elostonk/useStonk";
import Link from "@/components/ui/Link";
import StatCard from "@/components/ui/StatCard";
import { TEXT_LINK } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";
import { toneClass } from "@/utils/format";
import { currentRound, seasonOfRound } from "@/utils/rounds";

export default function Squad() {
  const { t, rich, date, num, signed } = useI18n();
  const { status, profile, load } = useAccount();
  const data = useStonkPlayers();
  const [live, setLive] = useState<{ players: number[]; captain: number } | null>(null);
  const [mine, setMine] = useState<{ round: string; points: number; final: boolean }[]>([]);
  const [season, setSeason] = useState<{ points: number; rank: number; of: number } | null>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  // The round opened in the member's rounds, with their squad and its players' points then
  const [open, setOpen] = useState<{ round: string; players: number[]; captain: number; points: Map<number, number> } | null>(null);
  // The moment the page opened (in the browser): the rounds go by it
  const now = useNow();
  const current = now ? currentRound(now) : "";
  const nickname = profile?.nickname ?? null;

  // The squad in the round under way, the member's rounds and their season
  useEffect(() => {
    if (status !== "ready" || !nickname || !current) return;
    let alive = true;
    void load().then(async (client) => {
      const [now, rounds, table, standing] = await Promise.all([
        client.from("stonk_locked_squads").select("players, captain").eq("round", current).eq("nickname", nickname).maybeSingle<{ players: number[]; captain: number }>(),
        client.from("stonk_round_scores").select("round, points, final").eq("nickname", nickname).order("round", { ascending: false }),
        client.from("stonk_season_table").select("nickname, points, rank").eq("season", seasonOfRound(current)),
        client.from("stonk_standings").select("round, total, rank, entries, round_rank").eq("season", seasonOfRound(current)).eq("nickname", nickname).order("round"),
      ]);
      if (!alive) return;
      setLive(now.data ?? null);
      setMine(((rounds.data as { round: string; points: number; final: boolean }[] | null) ?? []).map((r) => ({ ...r, points: Number(r.points) })));
      const rows = (table.data as { nickname: string; points: number; rank: number }[] | null) ?? [];
      const me = rows.find((r) => r.nickname === nickname);
      setSeason(me ? { points: Number(me.points), rank: me.rank, of: rows.length } : null);
      setStandings(((standing.data as Standing[] | null) ?? []).map((r) => ({ ...r, total: Number(r.total) })));
    });
    return () => {
      alive = false;
    };
  }, [status, nickname, load, current]);

  if (status === "off") return null;
  if (!now || status === "loading" || (status === "ready" && !data)) return <p className="text-gray-600">{t("common.loading")}</p>;
  if (status !== "ready") return <p className="text-lg">{rich("elostonk.squad.signIn", { link: (text) => <Link href="/account" className={TEXT_LINK}>{text}</Link> })}</p>;

  const byId = data!.byId;
  const thisSeason = mine.filter((r) => seasonOfRound(r.round) === seasonOfRound(current));
  const best = thisSeason.length ? thisSeason.reduce((a, b) => (b.points > a.points ? b : a)) : null;
  const worst = thisSeason.length ? thisSeason.reduce((a, b) => (b.points < a.points ? b : a)) : null;
  const average = thisSeason.length ? thisSeason.reduce((s, r) => s + r.points, 0) / thisSeason.length : null;
  const standingOf = new Map(standings.map((r) => [r.round, r]));
  const pointsOf = new Map(mine.map((r) => [r.round, r.points]));

  const toggle = async (round: string) => {
    if (open?.round === round) return setOpen(null);
    const client = await load();
    const { data: squad } = await client.from("stonk_locked_squads").select("players, captain").eq("round", round).eq("nickname", nickname!).maybeSingle<{ players: number[]; captain: number }>();
    if (!squad) return setOpen(null);
    const { data: pts } = await client.from("stonk_points").select("player_id, points").eq("round", round).in("player_id", squad.players);
    setOpen({ round, ...squad, points: new Map(((pts as { player_id: number; points: number }[] | null) ?? []).map((p) => [p.player_id, Number(p.points)])) });
  };
  const liveIndex = data!.rounds.indexOf(current);
  const livePoints = live ? live.players.reduce((s, id) => s + (byId.get(id)?.points[liveIndex] ?? 0) * (id === live.captain ? 2 : 1), 0) : null;

  return (
    <div>
      <SquadPicker
        between={
          // The round under way, and the season
          <section className="mb-10">
            <h2 className="text-2xl mb-3">{t("elostonk.squad.now", { date: date(current, "dayMonth") })}</h2>
            <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <StatCard label={t("elostonk.squad.thisRound")} detail={t("elostonk.squad.provisional")}>
                {livePoints === null ? "–" : <span className={toneClass(livePoints)}>{signed(Math.round(livePoints * 10) / 10, 1)}</span>}
              </StatCard>
              <StatCard label={t("elostonk.squad.season")} detail={season ? t("elostonk.squad.rank", { rank: season.rank, of: num(season.of) }) : undefined}>
                {season ? num(season.points, 1) : "–"}
              </StatCard>
              <StatCard label={t("elostonk.squad.rounds")}>{num(mine.length)}</StatCard>
            </dl>
            {live && <SquadLine players={live.players} captain={live.captain} byId={byId} index={liveIndex} />}
            {!live && <p className="text-gray-600">{t("elostonk.squad.notInRound")}</p>}
          </section>
        }
      />
      {/* The member's rounds */}
      {mine.length > 0 && (
        <section>
          <h2 className="text-2xl mb-1">{t("elostonk.squad.history")}</h2>
          <p className="text-sm text-gray-600 mb-3">{t("elostonk.squad.historyNote")}</p>
          {best && worst && average !== null && (
            <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <StatCard label={t("elostonk.squad.recap.best")} detail={date(best.round, "dayMonth")}>
                <span className={toneClass(best.points)}>{signed(best.points, 1)}</span>
              </StatCard>
              <StatCard label={t("elostonk.squad.recap.worst")} detail={date(worst.round, "dayMonth")}>
                <span className={toneClass(worst.points)}>{signed(worst.points, 1)}</span>
              </StatCard>
              <StatCard label={t("elostonk.squad.recap.average")} detail={t("elostonk.squad.recap.season")}>
                <span className={toneClass(average)}>{signed(Math.round(average * 10) / 10, 1)}</span>
              </StatCard>
            </dl>
          )}
          {/* The season rank after each round */}
          {standings.length >= 2 && (
            <div className="bg-white p-4 mb-4">
              <h3 className="text-sm text-gray-600 mb-2">{t("elostonk.squad.rankChart")}</h3>
              <LineChart
                series={[{ label: t("elostonk.squad.seasonRank"), from: standings[0].round, values: standings.map((r) => r.rank), counts: standings.map((r) => r.entries) }]}
                label={t("elostonk.squad.seasonRank")}
                rank
                rankOf={t("elostonk.squad.managers")}
                labels={standings.map((r) => date(r.round, "dayMonth"))}
                tips={standings.map((r) => t("elostonk.squad.rankTip", { date: date(r.round, "dayMonth"), points: signed(pointsOf.get(r.round) ?? 0, 1), total: signed(r.total, 1) }))}
                dots
                className="relative h-64"
              />
            </div>
          )}
          <ul className="bg-white divide-y divide-gray-100">
            {mine.map((r) => {
              const standing = standingOf.get(r.round);
              const shown = open?.round === r.round;
              return (
                <li key={r.round}>
                  <button type="button" aria-expanded={shown} onClick={() => void toggle(r.round)} className="link-host w-full flex justify-between gap-4 px-3 py-2 text-left cursor-pointer hover:bg-gray-50">
                    <span className="min-w-0">
                      <span className="link-group">{t("elostonk.squad.roundOf", { date: date(r.round) })}</span>
                      {!r.final && <span className="text-sm text-gray-500"> · {t("elostonk.squad.provisional")}</span>}
                      {standing && <span className="block text-sm text-gray-600">{t("elostonk.squad.roundRank", { rank: num(standing.round_rank), of: num(standing.entries) })}</span>}
                    </span>
                    <span className={`tabular-nums font-semibold ${toneClass(r.points)}`}>{signed(r.points, 1)}</span>
                  </button>
                  {shown && open && (
                    <div className="px-3 pb-4 bg-gray-50 space-y-4">
                      <div>
                        <p className="text-sm text-gray-600 pt-3 mb-2">{t("elostonk.squad.yourSquad")}</p>
                        <SquadLine players={open.players} captain={open.captain} byId={byId} points={open.points} />
                      </div>
                      <TeamOfRound round={r.round} yours={r.points} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

interface Standing {
  round: string;
  total: number;
  rank: number;
  entries: number;
  round_rank: number;
}
