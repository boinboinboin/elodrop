"use client";

// EloStonk's leagues: a member's own leagues, each with its season table (the members' points this season) and its
// members; making one (its maker joins it at once); joining one with its code, typed or from an invite link
// (/elostonk?tab=leagues&join=<code>); sharing the link; leaving; and for the owner a new code (the old link stops
// working). The database keeps the limits (supabase/migrations/*_elostonk.sql).
import { parseAsString, useQueryState } from "nuqs";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import { useNow } from "@/components/elostonk/useStonk";
import { ERROR, FIELD, LABEL, SUBMIT } from "@/components/account/form";
import Badge from "@/components/ui/Badge";
import Link from "@/components/ui/Link";
import { ROW, TEXT_LINK } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";
import { accountError } from "@/utils/account";
import { toneClass } from "@/utils/format";
import { currentRound, seasonOfRound } from "@/utils/rounds";

interface League {
  id: number;
  name: string;
  invite_code: string;
  owner: string | null;
}
interface TableRow {
  league_id: number;
  nickname: string;
  points: number;
  rank: number;
}
interface Person {
  league_id: number;
  nickname: string;
  owner: boolean;
}

export default function Leagues() {
  const { t, plural, rich, href, signed } = useI18n();
  const { status, profile, load } = useAccount();
  const [join, setJoin] = useQueryState("join", parseAsString);
  const [leagues, setLeagues] = useState<League[] | null>(null);
  const [table, setTable] = useState<TableRow[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const now = useNow();
  const season = now ? seasonOfRound(currentRound(now)) : null;

  const read = useCallback(async () => {
    if (season === null) return;
    const client = await load();
    const [l, tb, p] = await Promise.all([
      client.from("stonk_leagues").select("id, name, invite_code, owner").order("created_at"),
      client.from("stonk_league_table").select("league_id, nickname, points, rank").eq("season", season).order("rank"),
      client.from("stonk_league_people").select("league_id, nickname, owner").order("joined_at"),
    ]);
    setLeagues((l.data as League[] | null) ?? []);
    setTable(((tb.data as TableRow[] | null) ?? []).map((r) => ({ ...r, points: Number(r.points) })));
    setPeople((p.data as Person[] | null) ?? []);
  }, [load, season]);

  // Signed in: the leagues; an invite link: joined (once), then the link's code taken out of the address
  useEffect(() => {
    if (status !== "ready" || season === null) return;
    let live = true;
    void (async () => {
      const client = await load();
      if (join) {
        const { error } = await client.rpc("join_league", { code: join });
        if (!live) return;
        if (error) setError(t(`account.errors.${accountError(error) ?? "unknown"}`));
        void setJoin(null);
      }
      const [l, tb, p] = await Promise.all([
        client.from("stonk_leagues").select("id, name, invite_code, owner").order("created_at"),
        client.from("stonk_league_table").select("league_id, nickname, points, rank").eq("season", season).order("rank"),
        client.from("stonk_league_people").select("league_id, nickname, owner").order("joined_at"),
      ]);
      if (!live) return;
      setLeagues((l.data as League[] | null) ?? []);
      setTable(((tb.data as TableRow[] | null) ?? []).map((r) => ({ ...r, points: Number(r.points) })));
      setPeople((p.data as Person[] | null) ?? []);
    })();
    return () => {
      live = false;
    };
  }, [status, join, setJoin, load, season, t]);

  if (status === "off") return null;
  if (status !== "ready" || !profile) return <p className="text-lg">{rich("elostonk.leagues.signIn", { link: (text) => <Link href="/account" className={TEXT_LINK}>{text}</Link> })}</p>;

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const client = await load();
    const { error } = await client.from("stonk_leagues").insert({ name: name.trim(), owner: profile.user_id });
    if (error) return setError(t(`account.errors.${accountError(error) ?? "unknown"}`));
    setName("");
    await read();
  };
  const joinByCode = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const client = await load();
    const { error } = await client.rpc("join_league", { code: code.trim() });
    if (error) return setError(t(`account.errors.${accountError(error) ?? "unknown"}`));
    setCode("");
    await read();
  };
  const leave = async (id: number) => {
    const client = await load();
    await client.from("stonk_league_members").delete().eq("league_id", id).eq("user_id", profile.user_id);
    await read();
  };
  const renew = async (id: number) => {
    const client = await load();
    await client.rpc("renew_league_code", { league: id });
    await read();
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
      {leagues === null ? (
        <p className="text-gray-600">{t("common.loading")}</p>
      ) : !leagues.length ? (
        <p className="text-gray-700 mb-6">{t("elostonk.leagues.none")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 mb-8">
          {leagues.map((l) => {
            const rows = table.filter((r) => r.league_id === l.id);
            const members = people.filter((p) => p.league_id === l.id);
            const mine = l.owner === profile.user_id;
            return (
              <article key={l.id} className="bg-white p-4 md:p-6 min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-3">
                  <h2 className="text-xl break-words">{l.name}</h2>
                  <span className="text-sm text-gray-600">{plural("elostonk.leagues.members", members.length)}</span>
                </div>
                {rows.length ? (
                  <ol className="mb-4">
                    {rows.map((r) => (
                      <li key={r.nickname} className={`${ROW} flex justify-between gap-3 py-1.5 ${r.nickname === profile.nickname ? "font-semibold" : ""}`}>
                        <span className="min-w-0 break-all">
                          <span className="text-gray-600 tabular-nums mr-2">{r.rank}</span>
                          {r.nickname}
                          {r.nickname === profile.nickname && <Badge className="ml-2">{t("account.me.you")}</Badge>}
                        </span>
                        <span className={`tabular-nums ${toneClass(r.points)}`}>{signed(r.points, 1)}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-gray-600 mb-4">{t("elostonk.leagues.noPoints")}</p>
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
