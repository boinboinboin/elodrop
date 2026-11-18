"use client";

// EloStonk's leaderboards, open to everyone: the season's table (any season played), a round's (any round that has
// started: its scores so far until it's final) and all time, by nickname, the signed-in member's own row marked. A
// nickname opens their squad in that round (the newest for the season and all time), with each player's points.
import { Fragment, useEffect, useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import { SquadLine } from "@/components/elostonk/Squad";
import { newestScoredRound, useNow, useStonkPlayers } from "@/components/elostonk/useStonk";
import Badge from "@/components/ui/Badge";
import LinkSelect from "@/components/ui/LinkSelect";
import { ROW, toggleClass } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";
import { seasonLabel, toneClass } from "@/utils/format";
import { currentRound, seasonOfRound } from "@/utils/rounds";

type View = "season" | "round" | "alltime";
interface Row {
  nickname: string;
  points: number;
  rounds?: number;
  best?: number;
  rank: number;
}

export default function Leaderboard() {
  const { t, num, signed, date } = useI18n();
  const { profile, load } = useAccount();
  const data = useStonkPlayers();
  const [view, setView] = useState<View>("season");
  const [rounds, setRounds] = useState<string[]>([]);
  const now = useNow();
  // Chosen, else the newest round with points, and this season
  const [round, setRound] = useState<string | null>(null);
  const [picked, setSeason] = useState<number | null>(null);
  const season = picked ?? (now ? seasonOfRound(currentRound(now)) : null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [open, setOpen] = useState<{ nickname: string; players: number[]; captain: number; round: string } | null>(null);

  // The rounds that have started, and the newest with points to show first
  useEffect(() => {
    if (!now) return;
    let live = true;
    void load().then(async (client) => {
      const [{ data }, newest] = await Promise.all([client.from("stonk_rounds").select("round").lte("round", currentRound(now)).order("round", { ascending: false }), newestScoredRound(client)]);
      if (!live) return;
      const list = ((data as { round: string }[] | null) ?? []).map((r) => r.round);
      setRounds(list);
      setRound((r) => r ?? newest ?? list[0] ?? null);
    });
    return () => {
      live = false;
    };
  }, [load, now]);

  useEffect(() => {
    if (season === null || (view === "round" && !round)) return;
    let live = true;
    void load().then(async (client) => {
      let list: Row[] = [];
      if (view === "season") {
        const { data } = await client.from("stonk_season_table").select("nickname, points, rounds, best, rank").eq("season", season).order("rank").limit(500);
        list = (data as Row[] | null) ?? [];
      } else if (view === "alltime") {
        const { data } = await client.from("stonk_alltime_table").select("nickname, points, rounds, best, rank").order("rank").limit(500);
        list = (data as Row[] | null) ?? [];
      } else {
        const { data } = await client.from("stonk_round_scores").select("nickname, points").eq("round", round).order("points", { ascending: false }).limit(500);
        const scores = ((data as { nickname: string; points: number }[] | null) ?? []).map((r) => ({ ...r, points: Number(r.points) }));
        list = scores.map((r) => ({ ...r, rank: scores.filter((s) => s.points > r.points).length + 1 }));
      }
      if (live) setRows(list.map((r) => ({ ...r, points: Number(r.points), best: r.best === undefined ? undefined : Number(r.best) })));
    });
    return () => {
      live = false;
    };
  }, [load, view, round, season]);

  const showSquad = async (nickname: string) => {
    if (open?.nickname === nickname) return setOpen(null);
    const client = await load();
    // The round shown, or (season, all time) the newest with points
    const at = round ?? rounds[0] ?? "";
    const { data } = await client.from("stonk_locked_squads").select("players, captain").eq("round", at).eq("nickname", nickname).maybeSingle<{ players: number[]; captain: number }>();
    setOpen(data ? { nickname, ...data, round: at } : null);
  };

  const seasons = [...new Set(rounds.map(seasonOfRound))];
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {(["season", "round", "alltime"] as const).map((v) => (
          <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={toggleClass(view === v, "sm")}>{t(`elostonk.board.views.${v}`)}</button>
        ))}
      </div>
      {view === "season" && seasons.length > 1 && (
        <LinkSelect
          label={t("elostonk.board.season")}
          current={String(season ?? "")}
          onSelect={(key) => setSeason(Number(key))}
          options={seasons.map((s) => ({ key: String(s), label: seasonLabel(s) }))}
          className="mb-4 w-full sm:w-72"
        />
      )}
      {view === "round" && rounds.length > 0 && (
        <LinkSelect
          label={t("elostonk.board.round")}
          current={round ?? ""}
          onSelect={setRound}
          options={rounds.map((r) => ({ key: r, label: t("elostonk.squad.roundOf", { date: date(r) }) }))}
          className="mb-4 w-full sm:w-72"
        />
      )}
      {rows === null ? (
        <p className="text-gray-600">{t("common.loading")}</p>
      ) : !rows.length ? (
        <p className="text-gray-600">{t("elostonk.board.none")}</p>
      ) : (
        <div className="bg-white overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-sm text-gray-600 border-b border-gray-200">
                <th scope="col" className="py-2 px-3 font-normal w-12">#</th>
                <th scope="col" className="py-2 px-3 font-normal">{t("elostonk.board.player")}</th>
                <th scope="col" className="py-2 px-3 font-normal text-right">{t("elostonk.board.points")}</th>
                {view !== "round" && <th scope="col" className="py-2 px-3 font-normal text-right hidden sm:table-cell">{t("elostonk.board.rounds")}</th>}
                {view !== "round" && <th scope="col" className="py-2 px-3 font-normal text-right hidden sm:table-cell">{t("elostonk.board.best")}</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const me = r.nickname === profile?.nickname;
                const shown = open?.nickname === r.nickname && data;
                return (
                  <Fragment key={r.nickname}>
                  <tr className={`${ROW} ${me ? "bg-gray-100" : ""}`}>
                    <td className="py-2 px-3 tabular-nums text-gray-600">{r.rank}</td>
                    <td className="py-2 px-3">
                      <button type="button" aria-expanded={open?.nickname === r.nickname} onClick={() => void showSquad(r.nickname)} className="font-semibold hover:text-blue-600 cursor-pointer text-left break-all">
                        {r.nickname}
                      </button>
                      {me && <Badge className="ml-2">{t("account.me.you")}</Badge>}
                    </td>
                    <td className={`py-2 px-3 text-right tabular-nums font-semibold whitespace-nowrap ${toneClass(r.points)}`}>{signed(r.points, 1)}</td>
                    {view !== "round" && <td className="py-2 px-3 text-right tabular-nums hidden sm:table-cell">{num(r.rounds ?? 0)}</td>}
                    {view !== "round" && <td className="py-2 px-3 text-right tabular-nums hidden sm:table-cell">{r.best === undefined ? "–" : signed(r.best, 1)}</td>}
                  </tr>
                  {/* Their squad, on a row of its own across the table */}
                  {shown && open && (
                    <tr className={ROW}>
                      <td colSpan={view === "round" ? 3 : 5} className="px-3 pb-3 bg-gray-50">
                        <p className="text-sm text-gray-600 my-2">{t("elostonk.squad.roundOf", { date: date(open.round) })}</p>
                        <SquadLine players={open.players} captain={open.captain} byId={data.byId} index={data.rounds.indexOf(open.round)} />
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
