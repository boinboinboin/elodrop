"use client";

// EloStonk's "My squad" tab: the squad for the next round (5 players, one the captain, counted twice), saved until it
// locks (its Friday 00:00 in Norway; the database saves it for that round whatever the browser says), the round under
// way (the squad that counts in it, and its points so far), the player search to fill the squad, and the member's
// rounds so far. A squad with players who can't be picked (no longer in the players' file, or refused by the database
// when saving) names them in a warning and can't be saved until they're out. Not signed in: a way to sign in; signed
// in but without "This is me" or a nickname: the account page.
import { Fragment, useEffect, useMemo, useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import { ERROR, SUBMIT } from "@/components/account/form";
import PlayerSearch from "@/components/elostonk/PlayerSearch";
import Sparkline from "@/components/elostonk/Sparkline";
import { type StonkPlayer, useNow, useStonkPlayers } from "@/components/elostonk/useStonk";
import { Cross, Star } from "@/components/SVG";
import Link from "@/components/ui/Link";
import StatCard from "@/components/ui/StatCard";
import { BUTTON, TEXT_LINK } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";
import { accountError } from "@/utils/account";
import { toneClass } from "@/utils/format";
import { playerHref } from "@/utils/hrefs";
import { currentRound, lockOf, nextRound, seasonOfRound } from "@/utils/rounds";

const SIZE = 5;

interface Saved {
  round: string;
  players: number[];
  captain: number;
}

export default function Squad() {
  const { t, rich, date, dateTime, num, signed, plural } = useI18n();
  const { status, profile, load } = useAccount();
  const data = useStonkPlayers();
  const [saved, setSaved] = useState<Saved | null | undefined>(undefined);
  const [draft, setDraft] = useState<number[]>([]);
  const [captain, setCaptain] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Players the database refused at the last save (not eligible there), and the names of picked players no longer in
  // the players' file (from the game's database, which keeps them)
  const [refused, setRefused] = useState<Set<number>>(new Set());
  const [names, setNames] = useState<Map<number, string>>(new Map());
  const [done, setDone] = useState(false);
  const [owned, setOwned] = useState<Map<number, number>>(new Map());
  const [live, setLive] = useState<{ players: number[]; captain: number } | null>(null);
  const [mine, setMine] = useState<{ round: string; points: number; final: boolean }[]>([]);
  const [season, setSeason] = useState<{ points: number; rank: number; of: number } | null>(null);
  // The moment the page opened (in the browser): the rounds and the countdown go by it
  const now = useNow();
  const next = now ? nextRound(now) : "";
  const current = now ? currentRound(now) : "";
  const nickname = profile?.nickname ?? null;

  // The member's newest squad (carried over to the next round until changed), the squad in the round under way, their
  // rounds and their season, and how often each player is picked in the round under way
  useEffect(() => {
    if (status !== "ready" || !nickname || !current) return;
    let alive = true;
    void load().then(async (client) => {
      const [picks, now, rounds, table, own] = await Promise.all([
        client.from("stonk_picks").select("round, players, captain").order("round", { ascending: false }).limit(1).maybeSingle<Saved>(),
        client.from("stonk_locked_squads").select("players, captain").eq("round", current).eq("nickname", nickname).maybeSingle<{ players: number[]; captain: number }>(),
        client.from("stonk_round_scores").select("round, points, final").eq("nickname", nickname).order("round", { ascending: false }),
        client.from("stonk_season_table").select("nickname, points, rank").eq("season", seasonOfRound(current)),
        client.from("stonk_ownership").select("player_id, picked_pct").eq("round", current),
      ]);
      if (!alive) return;
      setSaved(picks.data ?? null);
      setDraft(picks.data?.players ?? []);
      setCaptain(picks.data?.captain ?? null);
      setLive(now.data ?? null);
      setMine(((rounds.data as { round: string; points: number; final: boolean }[] | null) ?? []).map((r) => ({ ...r, points: Number(r.points) })));
      const rows = (table.data as { nickname: string; points: number; rank: number }[] | null) ?? [];
      const me = rows.find((r) => r.nickname === nickname);
      setSeason(me ? { points: Number(me.points), rank: me.rank, of: rows.length } : null);
      setOwned(new Map(((own.data as { player_id: number; picked_pct: number }[] | null) ?? []).map((o) => [o.player_id, Number(o.picked_pct)])));
    });
    return () => {
      alive = false;
    };
  }, [status, nickname, load, current]);

  const picked = useMemo(() => new Set(draft), [draft]);

  // The names of picked players no longer in the players' file
  useEffect(() => {
    if (status !== "ready" || !data) return;
    const missing = draft.filter((id) => !data.byId.has(id) && !names.has(id));
    if (!missing.length) return;
    let alive = true;
    void load().then(async (client) => {
      const { data: rows } = await client.from("stonk_players").select("player_id, name").in("player_id", missing);
      if (alive && rows?.length) setNames((old) => new Map([...old, ...(rows as { player_id: number; name: string }[]).map((r) => [r.player_id, r.name] as const)]));
    });
    return () => {
      alive = false;
    };
  }, [status, data, draft, names, load]);
  if (status === "off") return null;
  if (!now || status === "loading" || (status === "ready" && (saved === undefined || !data))) return <p className="text-gray-600">{t("common.loading")}</p>;
  if (status !== "ready") return <p className="text-lg">{rich("elostonk.squad.signIn", { link: (text) => <Link href="/account" className={TEXT_LINK}>{text}</Link> })}</p>;

  const byId = data!.byId;
  const nameOf = (id: number) => byId.get(id)?.name ?? names.get(id) ?? `#${id}`;
  const invalid = draft.filter((id) => !byId.has(id) || refused.has(id));
  const changed = JSON.stringify(draft) !== JSON.stringify(saved?.players ?? []) || captain !== (saved?.captain ?? null);
  const ready = draft.length === SIZE && captain !== null && draft.includes(captain);
  const lock = lockOf(next);
  const hours = Math.max(0, Math.round((lock.getTime() - now!.getTime()) / 3_600_000));

  const add = (id: number) => {
    if (draft.length >= SIZE || picked.has(id)) return;
    setDraft([...draft, id]);
    if (captain === null) setCaptain(id);
    setDone(false);
  };
  const remove = (id: number) => {
    setDraft(draft.filter((x) => x !== id));
    if (captain === id) setCaptain(null);
    setDone(false);
  };
  const save = async () => {
    if (!ready || !profile) return;
    setBusy(true);
    setError(null);
    const client = await load();
    const { error } = await client.from("stonk_picks").upsert({ user_id: profile.user_id, round: next, players: draft, captain }, { onConflict: "user_id,round" });
    setBusy(false);
    if (error) {
      const code = accountError(error) ?? "unknown";
      if (code === "not_eligible") {
        // Which of them the database refuses, to name them in the warning
        const { data: rows } = await client.from("stonk_players").select("player_id, name, eligible").in("player_id", draft);
        const known = new Map(((rows as { player_id: number; name: string; eligible: boolean }[] | null) ?? []).map((r) => [r.player_id, r]));
        const bad = draft.filter((id) => !known.get(id)?.eligible);
        if (bad.length) {
          setNames((old) => new Map([...old, ...[...known.values()].map((r) => [r.player_id, r.name] as const)]));
          return setRefused(new Set(bad));
        }
      }
      return setError(t(`account.errors.${code}`));
    }
    setSaved({ round: next, players: draft, captain: captain! });
    setDone(true);
  };

  const liveIndex = data!.rounds.indexOf(current);
  const livePoints = live ? live.players.reduce((s, id) => s + (byId.get(id)?.points[liveIndex] ?? 0) * (id === live.captain ? 2 : 1), 0) : null;

  return (
    <div>
      {/* The next round's squad */}
      <section className="mb-10">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 mb-3">
          <h2 className="text-2xl">{t("elostonk.squad.title", { date: date(next, "dayMonth") })}</h2>
          <p className="text-sm text-gray-600">{t("elostonk.squad.locks", { time: dateTime(lock.toISOString()), hours: plural("elostonk.squad.hours", hours) })}</p>
        </div>
        <ol className="grid grid-cols-1 gap-2 mb-4">
          {Array.from({ length: SIZE }, (_, i) => {
            const id = draft[i];
            const p = id ? byId.get(id) : undefined;
            const bad = id ? invalid.includes(id) : false;
            return (
              <li key={i} className="bg-white flex items-center gap-3 px-3 py-2 min-h-14">
                <span className="w-5 text-gray-400 tabular-nums">{i + 1}</span>
                {id ? (
                  <>
                    <div className="flex-1 min-w-0">
                      <Link href={playerHref(id)} target="_blank" className={`font-semibold hover:text-blue-600 break-words ${bad ? "text-red-700" : ""}`}>{nameOf(id)}</Link>
                      <span className={`block text-sm truncate ${bad ? "text-red-700" : "text-gray-600"}`}>{bad ? t("elostonk.squad.gone") : p?.club}</span>
                    </div>
                    {p && (
                      <span className="hidden sm:block">
                        <Sparkline points={p.points} label={t("elostonk.search.chart", { name: p.name })} />
                      </span>
                    )}
                    <button
                      type="button"
                      aria-pressed={captain === id}
                      onClick={() => {
                        setCaptain(id);
                        setDone(false);
                      }}
                      title={t("elostonk.squad.captain")}
                      aria-label={t("elostonk.squad.makeCaptain", { name: nameOf(id) })}
                      className={`shrink-0 w-10 h-10 inline-flex items-center justify-center ${BUTTON} ${captain === id ? "bg-black text-white" : ""}`}
                    >
                      <Star filled={captain === id} className="text-lg" />
                    </button>
                    <button type="button" onClick={() => remove(id)} aria-label={t("elostonk.squad.remove", { name: nameOf(id) })} className="shrink-0 w-10 h-10 inline-flex items-center justify-center text-gray-500 hover:text-black cursor-pointer">
                      <Cross className="text-xl" />
                    </button>
                  </>
                ) : (
                  <span className="text-gray-500">{t("elostonk.squad.empty")}</span>
                )}
              </li>
            );
          })}
        </ol>
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" disabled={busy || !ready || !changed || invalid.length > 0} onClick={() => void save()} className={SUBMIT}>{t(busy ? "elostonk.squad.saving" : "elostonk.squad.save")}</button>
          <span className="text-sm text-gray-600" aria-live="polite">
            {done ? t("elostonk.squad.saved") : !ready ? t("elostonk.squad.need", { count: SIZE - draft.length }) : changed ? t("elostonk.squad.unsaved") : saved ? t("elostonk.squad.carries") : ""}
          </span>
        </div>
        {invalid.length > 0 && (
          <p role="alert" className={ERROR}>
            {rich("elostonk.squad.invalid", {
              names: invalid.map((id, i) => (
                <Fragment key={id}>
                  {i > 0 && ", "}
                  <strong>{nameOf(id)}</strong>
                </Fragment>
              )),
            })}
          </p>
        )}
        {error && <p role="alert" className={ERROR}>{error}</p>}
      </section>

      {/* The round under way, and the season */}
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

      {/* The player search */}
      <section className="mb-10">
        <h2 className="text-2xl mb-3">{t("elostonk.search.title")}</h2>
        <PlayerSearch players={data!.players} picked={picked} owned={owned} full={draft.length >= SIZE} onAdd={add} />
      </section>

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
