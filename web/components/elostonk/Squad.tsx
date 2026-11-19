"use client";

// EloStonk's "My squad" tab: the squad for the next round and the player search to fill it (SquadPicker), with the
// round under way between them (the squad that counts in it, and its points so far), then the member's rounds so far.
// Not signed in: a way to sign in; signed in but without "This is me" or a nickname: the account page.
import { useEffect, useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import SquadPicker from "@/components/elostonk/SquadPicker";
import { type StonkPlayer, useNow, useStonkPlayers } from "@/components/elostonk/useStonk";
import { Star } from "@/components/SVG";
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
  // The moment the page opened (in the browser): the rounds go by it
  const now = useNow();
  const current = now ? currentRound(now) : "";
  const nickname = profile?.nickname ?? null;

  // The squad in the round under way, the member's rounds and their season
  useEffect(() => {
    if (status !== "ready" || !nickname || !current) return;
    let alive = true;
    void load().then(async (client) => {
      const [now, rounds, table] = await Promise.all([
        client.from("stonk_locked_squads").select("players, captain").eq("round", current).eq("nickname", nickname).maybeSingle<{ players: number[]; captain: number }>(),
        client.from("stonk_round_scores").select("round, points, final").eq("nickname", nickname).order("round", { ascending: false }),
        client.from("stonk_season_table").select("nickname, points, rank").eq("season", seasonOfRound(current)),
      ]);
      if (!alive) return;
      setLive(now.data ?? null);
      setMine(((rounds.data as { round: string; points: number; final: boolean }[] | null) ?? []).map((r) => ({ ...r, points: Number(r.points) })));
      const rows = (table.data as { nickname: string; points: number; rank: number }[] | null) ?? [];
      const me = rows.find((r) => r.nickname === nickname);
      setSeason(me ? { points: Number(me.points), rank: me.rank, of: rows.length } : null);
    });
    return () => {
      alive = false;
    };
  }, [status, nickname, load, current]);

  if (status === "off") return null;
  if (!now || status === "loading" || (status === "ready" && !data)) return <p className="text-gray-600">{t("common.loading")}</p>;
  if (status !== "ready") return <p className="text-lg">{rich("elostonk.squad.signIn", { link: (text) => <Link href="/account" className={TEXT_LINK}>{text}</Link> })}</p>;

  const byId = data!.byId;
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
          <ul className="bg-white divide-y divide-gray-100">
            {mine.map((r) => (
              <li key={r.round} className="flex justify-between gap-4 px-3 py-2">
                <span>
                  {t("elostonk.squad.roundOf", { date: date(r.round) })}
                  {!r.final && <span className="text-sm text-gray-500"> · {t("elostonk.squad.provisional")}</span>}
                </span>
                <span className={`tabular-nums font-semibold ${toneClass(r.points)}`}>{signed(r.points, 1)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** A squad's players with their points in a round (the captain's twice), in a row of small cards */
export function SquadLine({ players, captain, byId, index }: { players: number[]; captain: number; byId: Map<number, StonkPlayer>; index: number }) {
  const { t, signed } = useI18n();
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-5 gap-2">
      {players.map((id) => {
        const p = byId.get(id);
        const pts = index >= 0 ? (p?.points[index] ?? 0) : 0;
        return (
          <li key={id} className="bg-white px-3 py-2 min-w-0">
            <span className="block font-semibold truncate">
              {id === captain && <Star filled className="mr-1 text-sm" />}
              {p?.name ?? `#${id}`}
            </span>
            <span className={`text-sm tabular-nums ${toneClass(pts)}`}>
              {signed(pts, 1)}
              {id === captain && <span className="text-gray-600"> ×2</span>}
            </span>
            {id === captain && <span className="sr-only">{t("elostonk.squad.captain")}</span>}
          </li>
        );
      })}
    </ul>
  );
}
