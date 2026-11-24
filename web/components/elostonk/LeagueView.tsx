"use client";

// One EloStonk league, opened from its card in Leagues (?league=<id>): who won its last round, every member's squad in
// the newest round that has locked (from Friday 14:00 the new round's, before it last week's: squads are only shown once
// locked, so nobody copies anyone), ranked by its points so far, then the league's tables (Leaderboard), its most picked
// players this round, its members, and inviting, a new code and public or private (the owner) and leaving.
import { useEffect, useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import Leaderboard from "@/components/elostonk/Leaderboard";
import PlayerList from "@/components/elostonk/PlayerList";
import SquadLine from "@/components/elostonk/SquadLine";
import { useNow, useStonkPlayers, type StonkPlayer } from "@/components/elostonk/useStonk";
import { ArrowLeft } from "@/components/SVG";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import CheckToggle from "@/components/ui/CheckToggle";
import { ROW } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";
import { toneClass } from "@/utils/format";
import { currentRound, lockOf, nextRound } from "@/utils/rounds";

export interface League {
  id: number;
  name: string;
  invite_code: string;
  owner: string | null;
  /** Listed for everyone to join; private: joined with its code */
  is_public: boolean;
}
export interface Person {
  league_id: number;
  /** null: a hidden nickname */
  nickname: string | null;
  owner: boolean;
}
export interface Pick {
  league_id: number;
  player_id: number;
  name: string | null;
  picks: number;
  captains: number;
}
interface Locked {
  nickname: string;
  players: number[];
  captain: number;
}

/** A squad's points in a round from the players' file (the captain's twice): for a round the weekly tables haven't
 *  scored yet (the round under way) */
const squadPoints = (s: Locked, byId: Map<number, StonkPlayer>, index: number) =>
  index < 0 ? 0 : s.players.reduce((sum, id) => sum + (byId.get(id)?.points[index] ?? 0) * (id === s.captain ? 2 : 1), 0);

export default function LeagueView({
  league,
  members,
  winner,
  picks,
  owned,
  copied,
  onBack,
  onShare,
  onRenew,
  onLeave,
  onPublic,
}: {
  league: League;
  members: Person[];
  /** The last round's winners in the league, with its date and their points */
  winner: { round: string; names: string[]; points: number } | null;
  picks: Pick[];
  /** The member owns the league */
  owned: boolean;
  copied: boolean;
  onBack: () => void;
  onShare: () => void;
  onRenew: () => void;
  onLeave: () => void;
  /** The owner makes it public (true) or private */
  onPublic: (value: boolean) => void;
}) {
  const { t, plural, rich, signed, date, dateTime, num } = useI18n();
  const { profile, load } = useAccount();
  const data = useStonkPlayers();
  const now = useNow();
  const current = now ? currentRound(now) : null;
  const [squads, setSquads] = useState<{ round: string | null; list: Locked[]; scores: Map<string, number> } | null>(null);
  const nicknames = members.flatMap((m) => (m.nickname ? [m.nickname] : []));
  const key = nicknames.join("\n");

  // The newest round with locked squads (the round under way once its squads are worked out, minutes after the lock),
  // the members' squads in it and their scores (weekly, as the tables and the last winner)
  useEffect(() => {
    if (current === null) return;
    const names = key ? key.split("\n") : [];
    let live = true;
    void load().then(async (client) => {
      if (!names.length) return live && setSquads({ round: null, list: [], scores: new Map() });
      const newest = await client.from("stonk_locked_squads").select("round").in("nickname", names).lte("round", current).order("round", { ascending: false }).limit(1).maybeSingle<{ round: string }>();
      const round = newest.data?.round ?? null;
      const [s, p] = round
        ? await Promise.all([
            client.from("stonk_locked_squads").select("nickname, players, captain").eq("round", round).in("nickname", names),
            client.from("stonk_league_round_scores").select("nickname, points").eq("league_id", league.id).eq("round", round),
          ])
        : [null, null];
      const scores = new Map(((p?.data as { nickname: string; points: number }[] | null) ?? []).map((r) => [r.nickname, Number(r.points)]));
      if (live) setSquads({ round, list: (s?.data as Locked[] | null) ?? [], scores });
    });
    return () => {
      live = false;
    };
  }, [load, current, key, league.id]);

  const index = squads?.round && data ? data.rounds.indexOf(squads.round) : -1;
  // Best first, by the round's score, else (not scored yet) the players' points so far; members without a squad after them
  const ranked = squads && data ? squads.list.map((s) => ({ ...s, points: squads.scores.get(s.nickname) ?? squadPoints(s, data.byId, index) })).sort((a, b) => b.points - a.points || a.nickname.localeCompare(b.nickname)) : [];
  const without = squads ? nicknames.filter((n) => !squads.list.some((s) => s.nickname === n)) : [];
  const hidden = members.length - nicknames.length;

  return (
    <div className="grid grid-cols-1 gap-6">
      <div>
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm link-underlined hover:text-blue-600 mb-3">
          <ArrowLeft /> {t("elostonk.leagues.back")}
        </button>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-2xl break-words min-w-0">{league.name}</h2>
          <span className="text-sm text-gray-600">{plural("elostonk.leagues.members", members.length)}</span>
        </div>
        {winner && (
          <p className="mt-2">
            {rich("elostonk.leagues.lastWinner", { date: date(winner.round, "dayMonth"), names: <strong className="break-all">{winner.names.join(", ")}</strong>, points: signed(winner.points, 1) })}
          </p>
        )}
      </div>

      <Card
        title={squads?.round ? t("elostonk.leagues.squads", { date: date(squads.round) }) : t("elostonk.leagues.squadsTitle")}
        subtitle={current ? t("elostonk.leagues.squadsNote", { time: dateTime(lockOf(nextRound(now!)).toISOString()) }) : undefined}
        className="min-w-0"
      >
        {squads === null || !data ? (
          <p className="text-gray-600">{t("common.loading")}</p>
        ) : !squads.round ? (
          <p className="text-gray-600">{t("elostonk.leagues.noSquads")}</p>
        ) : (
          <>
            <ol>
              {ranked.map((s) => {
                const rank = ranked.filter((o) => o.points > s.points).length + 1;
                const me = s.nickname === profile?.nickname;
                return (
                  <li key={s.nickname} className={`${ROW} py-2 px-2 -mx-2 min-w-0 ${me ? "bg-gray-100" : ""}`}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0">
                        <span className="tabular-nums text-gray-600 mr-2">{rank}</span>
                        <span className="font-semibold break-all">{s.nickname}</span>
                        {me && <Badge className="ml-2">{t("account.me.you")}</Badge>}
                      </span>
                      <span className={`tabular-nums font-semibold whitespace-nowrap ${toneClass(s.points)}`}>{signed(s.points, 1)}</span>
                    </div>
                    <SquadLine compact players={s.players} captain={s.captain} byId={data.byId} index={index} />
                  </li>
                );
              })}
            </ol>
            {without.length > 0 && <p className="text-sm text-gray-600 mt-3 break-words">{t("elostonk.leagues.noSquad", { names: without.join(", ") })}</p>}
          </>
        )}
      </Card>

      <Card title={t("elostonk.leagues.table")} subtitle={t("elostonk.board.updated")} className="min-w-0">
        <Leaderboard league={league.id} />
      </Card>

      {picks.length > 0 && (
        <PlayerList
          title={t("elostonk.leagues.mostPicked")}
          rows={picks.slice(0, 5).map((p) => ({
            id: p.player_id,
            name: p.name ?? `#${p.player_id}`,
            value: t("elostonk.leagues.picks", { picks: num(p.picks), of: num(members.length) }),
            detail: p.captains ? plural("elostonk.leagues.captains", p.captains) : undefined,
          }))}
        />
      )}

      <Card title={t("elostonk.leagues.membersTitle")} className="min-w-0">
        <p className="text-gray-700 mb-4 break-words">
          {nicknames.map((n) => n + (members.find((m) => m.nickname === n)?.owner ? ` (${t("elostonk.leagues.owner")})` : "")).join(", ")}
          {hidden > 0 && <span className="text-gray-600"> {plural("elostonk.leagues.hidden", hidden)}</span>}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <button type="button" onClick={onShare} className="link-underlined hover:text-blue-600">{t(copied ? "elostonk.leagues.copied" : "elostonk.leagues.invite")}</button>
          <span className="text-gray-600">{t("elostonk.leagues.code", { code: league.invite_code })}</span>
          {owned && <button type="button" onClick={onRenew} className="link-underlined hover:text-blue-600">{t("elostonk.leagues.renew")}</button>}
          <button type="button" onClick={onLeave} className="link-underlined hover:text-blue-600">{t("elostonk.leagues.leave")}</button>
        </div>
        {owned ? (
          <div className="mt-4">
            <CheckToggle checked={league.is_public} onChange={onPublic}>{t("elostonk.leagues.public")}</CheckToggle>
            <p className="text-sm text-gray-600 mt-1">{t(league.is_public ? "elostonk.leagues.publicHelp" : "elostonk.leagues.privateHelp")}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-600 mt-4">{t(league.is_public ? "elostonk.leagues.isPublic" : "elostonk.leagues.isPrivate")}</p>
        )}
      </Card>
    </div>
  );
}
