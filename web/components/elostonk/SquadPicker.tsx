"use client";

// EloStonk's squad picking: the squad for the next round (5 players, one the captain, counted twice), saved until it
// locks (its Friday 14:00 in Norway; the database saves it for that round whatever the browser says), and the player
// search to fill it. A squad with players who can't be picked (no longer in the players' file, or refused by the
// database when saving) names them in a warning and can't be saved until they're out; so does one breaking the rules for
// variety (rules.ts: at most 2 from one club, a man and a woman), its clubs' players marked. Used by the game's "My squad"
// tab (Squad, with the round under way `between` them) and a new account's first steps (account/Welcome). For a
// signed-in member with a profile only.
import { Fragment, type ReactNode, useEffect, useMemo, useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import { ERROR, SUBMIT } from "@/components/account/form";
import PlayerSearch from "@/components/elostonk/PlayerSearch";
import { clubCounts, squadProblems } from "@/components/elostonk/rules";
import Sparkline from "@/components/elostonk/Sparkline";
import { useNow, useStonkPlayers } from "@/components/elostonk/useStonk";
import { Cross, Star } from "@/components/SVG";
import Link from "@/components/ui/Link";
import { BUTTON } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";
import { accountError } from "@/utils/account";
import { playerHref } from "@/utils/hrefs";
import { currentRound, lockOf, nextRound } from "@/utils/rounds";

const SIZE = 5;

interface Saved {
  round: string;
  players: number[];
  captain: number;
}

export default function SquadPicker({ between, onSaved }: { between?: ReactNode; onSaved?: () => void }) {
  const { t, rich, date, dateTime, plural } = useI18n();
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
  // The moment the page opened (in the browser): the rounds and the countdown go by it
  const now = useNow();
  const next = now ? nextRound(now) : "";
  const current = now ? currentRound(now) : "";

  // The member's newest squad (carried over to the next round until changed), and how often each player is picked in
  // the round under way
  useEffect(() => {
    if (status !== "ready" || !current) return;
    let alive = true;
    void load().then(async (client) => {
      const [picks, own] = await Promise.all([
        client.from("stonk_picks").select("round, players, captain").order("round", { ascending: false }).limit(1).maybeSingle<Saved>(),
        client.from("stonk_ownership").select("player_id, picked_pct").eq("round", current),
      ]);
      if (!alive) return;
      setSaved(picks.data ?? null);
      setDraft(picks.data?.players ?? []);
      setCaptain(picks.data?.captain ?? null);
      setOwned(new Map(((own.data as { player_id: number; picked_pct: number }[] | null) ?? []).map((o) => [o.player_id, Number(o.picked_pct)])));
    });
    return () => {
      alive = false;
    };
  }, [status, load, current]);

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
  if (status !== "ready" || !now || saved === undefined || !data) return <p className="text-gray-600">{t("common.loading")}</p>;

  const byId = data.byId;
  const nameOf = (id: number) => byId.get(id)?.name ?? names.get(id) ?? `#${id}`;
  const invalid = draft.filter((id) => !byId.has(id) || refused.has(id));
  const squad = draft.flatMap((id) => byId.get(id) ?? []);
  const problems = squadProblems(squad, draft.length === SIZE);
  const overClubs = new Set(problems.clubs);
  const clubs = clubCounts(squad);
  const broken = problems.clubs.length > 0 || problems.missing.length > 0;
  const changed = JSON.stringify(draft) !== JSON.stringify(saved?.players ?? []) || captain !== (saved?.captain ?? null);
  const ready = draft.length === SIZE && captain !== null && draft.includes(captain);
  const lock = lockOf(next);
  const hours = Math.max(0, Math.round((lock.getTime() - now.getTime()) / 3_600_000));

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
    onSaved?.();
  };

  return (
    <>
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
          const crowded = !!p?.club && overClubs.has(p.club);
          return (
            <li key={i} className="bg-white flex items-center gap-3 px-3 py-2 min-h-14">
              <span className="w-5 text-gray-400 tabular-nums">{i + 1}</span>
              {id ? (
                <>
                  <div className="flex-1 min-w-0">
                    <Link href={playerHref(id)} target="_blank" className={`link font-semibold hover:text-blue-600 break-words ${bad ? "text-red-700" : ""}`}>{nameOf(id)}</Link>
                    <span className={`block text-sm truncate ${bad || crowded ? "text-red-700" : "text-gray-600"}`}>{bad ? t("elostonk.squad.gone") : p?.club}</span>
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
        <button type="button" disabled={busy || !ready || !changed || invalid.length > 0 || broken} onClick={() => void save()} className={SUBMIT}>{t(busy ? "elostonk.squad.saving" : "elostonk.squad.save")}</button>
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
      {problems.clubs.map((club) => (
        <p key={club} role="alert" className={ERROR}>{rich("elostonk.squad.clubLimit", { club: <strong>{club}</strong>, count: clubs.get(club)! })}</p>
      ))}
      {problems.missing.length > 0 && <p role="alert" className={ERROR}>{t("elostonk.squad.genders")}</p>}
      {error && <p role="alert" className={ERROR}>{error}</p>}
    </section>
      {between}
    {/* The player search */}
    <section className="mb-10">
      <h2 className="text-2xl mb-3">{t("elostonk.search.title")}</h2>
      <PlayerSearch players={data.players} picked={picked} owned={owned} full={draft.length >= SIZE} clubs={clubs} onAdd={add} />
    </section>
    </>
  );
}
