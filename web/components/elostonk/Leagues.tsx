"use client";

// EloStonk's leagues: a member's own leagues, each with its season table (the members' points this season) and its
// members; making one (its maker joins it at once); joining one with its code, typed or from an invite link
// (/elostonk?tab=leagues&join=<code>); sharing the link; leaving; and for the owner a new code (the old link stops
// working). Each league shows who won its last round, its tables (Leaderboard: the season with round wins, and each
// round, with the members' squads) and its most picked players in the round under way. The database keeps the limits
// (supabase/migrations/*_elostonk.sql) and shows a league only to its members.
import { parseAsString, useQueryState } from "nuqs";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAccount } from "@/components/account/AccountProvider";
import Leaderboard from "@/components/elostonk/Leaderboard";
import PlayerList from "@/components/elostonk/PlayerList";
import { useNow } from "@/components/elostonk/useStonk";
import { ERROR, FIELD, LABEL, SUBMIT } from "@/components/account/form";
import Link from "@/components/ui/Link";
import { TEXT_LINK } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";
import { accountError } from "@/utils/account";
import { currentRound } from "@/utils/rounds";

interface League {
  id: number;
  name: string;
  invite_code: string;
  owner: string | null;
}
interface Score {
  league_id: number;
  nickname: string;
  points: number;
}
interface Pick {
  league_id: number;
  player_id: number;
  name: string | null;
  picks: number;
  captains: number;
}
interface Read {
  leagues: League[];
  people: Person[];
  /** The newest round with scores, and the members' scores in it */
  last: string | null;
  scores: Score[];
  /** The members' picks in the round under way */
  picks: Pick[];
}

/** The member's leagues, their members, the last round's scores and the round under way's picks */
async function readLeagues(client: SupabaseClient, current: string): Promise<Read> {
  const [l, p, newest, o] = await Promise.all([
    client.from("stonk_leagues").select("id, name, invite_code, owner").order("created_at"),
    client.from("stonk_league_people").select("league_id, nickname, owner").order("joined_at"),
    client.from("stonk_round_scores").select("round").order("round", { ascending: false }).limit(1).maybeSingle<{ round: string }>(),
    client.from("stonk_league_ownership").select("league_id, player_id, name, picks, captains").eq("round", current).order("picks", { ascending: false }),
  ]);
  const last = newest.data?.round ?? null;
  const scores = last ? ((await client.from("stonk_league_round_scores").select("league_id, nickname, points").eq("round", last)).data as Score[] | null) ?? [] : [];
  return {
    leagues: (l.data as League[] | null) ?? [],
    people: (p.data as Person[] | null) ?? [],
    last,
    scores: scores.map((x) => ({ ...x, points: Number(x.points) })),
    picks: (o.data as Pick[] | null) ?? [],
  };
}
interface Person {
  league_id: number;
  nickname: string;
  owner: boolean;
}

export default function Leagues() {
  const { t, plural, rich, href, signed, date, num } = useI18n();
  const { status, profile, load } = useAccount();
  const [join, setJoin] = useQueryState("join", parseAsString);
  const [read, setRead] = useState<Read | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const now = useNow();
  const current = now ? currentRound(now) : null;

  const reread = useCallback(async () => {
    if (current === null) return;
    setRead(await readLeagues(await load(), current));
  }, [load, current]);

  // Signed in: the leagues; an invite link: joined (once), then the link's code taken out of the address
  useEffect(() => {
    if (status !== "ready" || current === null) return;
    let live = true;
    void (async () => {
      const client = await load();
      if (join) {
        const { error } = await client.rpc("join_league", { code: join });
        if (!live) return;
        if (error) setError(t(`account.errors.${accountError(error) ?? "unknown"}`));
        void setJoin(null);
      }
      const data = await readLeagues(client, current);
      if (live) setRead(data);
    })();
    return () => {
      live = false;
    };
  }, [status, join, setJoin, load, current, t]);

  if (status === "off") return null;
  if (status !== "ready" || !profile) return <p className="text-lg">{rich("elostonk.leagues.signIn", { link: (text) => <Link href="/account" className={TEXT_LINK}>{text}</Link> })}</p>;

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const client = await load();
    const { error } = await client.from("stonk_leagues").insert({ name: name.trim(), owner: profile.user_id });
    if (error) return setError(t(`account.errors.${accountError(error) ?? "unknown"}`));
    setName("");
    await reread();
  };
  const joinByCode = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const client = await load();
    const { error } = await client.rpc("join_league", { code: code.trim() });
    if (error) return setError(t(`account.errors.${accountError(error) ?? "unknown"}`));
    setCode("");
    await reread();
  };
  const leave = async (id: number) => {
    const client = await load();
    await client.from("stonk_league_members").delete().eq("league_id", id).eq("user_id", profile.user_id);
    await reread();
  };
  const renew = async (id: number) => {
    const client = await load();
    await client.rpc("renew_league_code", { league: id });
    await reread();
  };
  const share = async (league: League) => {
    const url = new URL(href(`/elostonk?tab=leagues&join=${league.invite_code}`), window.location.origin).toString();
    try {
      if (navigator.share) await navigator.share({ title: league.name, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(league.id);
      }
    } catch {
      // Closed without sharing
    }
  };

  return (
    <div>
      {error && <p role="alert" className={`${ERROR} mb-4`}>{error}</p>}
      {read === null ? (
        <p className="text-gray-600">{t("common.loading")}</p>
      ) : !read.leagues.length ? (
        <p className="text-gray-700 mb-6">{t("elostonk.leagues.none")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 mb-8">
          <p className="text-sm text-gray-600">{t("elostonk.board.updated")}</p>
          {read.leagues.map((l) => {
            const members = read.people.filter((p) => p.league_id === l.id);
            const mine = l.owner === profile.user_id;
            // The last round's winners in the league (ties share it)
            const scores = read.scores.filter((r) => r.league_id === l.id);
            const best = scores.length ? Math.max(...scores.map((r) => r.points)) : null;
            const winners = best === null ? [] : scores.filter((r) => r.points === best).map((r) => r.nickname);
            const picks = read.picks.filter((p) => p.league_id === l.id).slice(0, 5);
            return (
              <article key={l.id} className="bg-white p-4 md:p-6 min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-3">
                  <h2 className="text-xl break-words">{l.name}</h2>
                  <span className="text-sm text-gray-600">{plural("elostonk.leagues.members", members.length)}</span>
                </div>
                {winners.length > 0 && read.last && (
                  <p className="mb-4">
                    {rich("elostonk.leagues.lastWinner", {
                      date: date(read.last, "dayMonth"),
                      names: <strong className="break-all">{winners.join(", ")}</strong>,
                      points: signed(best!, 1),
                    })}
                  </p>
                )}
                <div className="mb-4">
                  <Leaderboard league={l.id} />
                </div>
                {picks.length > 0 && (
                  <div className="mb-4">
                    <PlayerList
                      title={t("elostonk.leagues.mostPicked")}
                      rows={picks.map((p) => ({
                        id: p.player_id,
                        name: p.name ?? `#${p.player_id}`,
                        value: t("elostonk.leagues.picks", { picks: num(p.picks), of: num(members.length) }),
                        detail: p.captains ? plural("elostonk.leagues.captains", p.captains) : undefined,
                      }))}
                    />
                  </div>
                )}
                <p className="text-sm text-gray-600 mb-3 break-words">{members.map((m) => m.nickname + (m.owner ? ` (${t("elostonk.leagues.owner")})` : "")).join(", ")}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                  <button type="button" onClick={() => void share(l)} className="underline hover:text-blue-600">{t(copied === l.id ? "elostonk.leagues.copied" : "elostonk.leagues.invite")}</button>
                  <span className="text-gray-600">{t("elostonk.leagues.code", { code: l.invite_code })}</span>
                  {mine && <button type="button" onClick={() => void renew(l.id)} className="underline hover:text-blue-600">{t("elostonk.leagues.renew")}</button>}
                  <button type="button" onClick={() => void leave(l.id)} className="underline hover:text-blue-600">{t("elostonk.leagues.leave")}</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        <form onSubmit={create} className="space-y-3">
          <h2 className="text-xl">{t("elostonk.leagues.create")}</h2>
          <div>
            <label htmlFor="league-name" className={LABEL}>{t("elostonk.leagues.name")}</label>
            <input id="league-name" required minLength={3} maxLength={40} value={name} onChange={(e) => setName(e.target.value)} className={FIELD} />
          </div>
          <button type="submit" className={SUBMIT}>{t("elostonk.leagues.createButton")}</button>
        </form>
        <form onSubmit={joinByCode} className="space-y-3">
          <h2 className="text-xl">{t("elostonk.leagues.join")}</h2>
          <div>
            <label htmlFor="league-code" className={LABEL}>{t("elostonk.leagues.codeLabel")}</label>
            <input id="league-code" required minLength={6} maxLength={20} value={code} onChange={(e) => setCode(e.target.value)} className={`${FIELD} font-mono`} />
          </div>
          <button type="submit" className={SUBMIT}>{t("elostonk.leagues.joinButton")}</button>
        </form>
      </div>
    </div>
  );
}
