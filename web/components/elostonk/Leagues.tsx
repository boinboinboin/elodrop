"use client";

// EloStonk's leagues: a member's own leagues as cards, each with who won its last round and the member's place in its
// season table; the public leagues they're not in, to join with a press; making one (private unless ticked public; its
// maker joins it at once); joining one with its 4-character code, typed or from an invite link
// (/elostonk?tab=leagues&join=<code>). A card opens the league (LeagueView, ?league=<id>, so the back button returns to
// the list): the members' squads, its tables, most picked players, members, and sharing the link, leaving, and for the
// owner a new code (the old link stops working) and making it public or private. The database keeps the limits
// (supabase/migrations/*_elostonk.sql, *_league_codes_public.sql) and shows a league only to its members (a public one's
// name and size to everyone signed in).
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAccount } from "@/components/account/AccountProvider";
import LeagueView, { type League, type Person, type Pick } from "@/components/elostonk/LeagueView";
import { useNow } from "@/components/elostonk/useStonk";
import { ERROR, FIELD, HELP, LABEL, SUBMIT } from "@/components/account/form";
import { ArrowRight } from "@/components/SVG";
import CheckToggle from "@/components/ui/CheckToggle";
import CodeFields from "@/components/ui/CodeFields";
import Link from "@/components/ui/Link";
import { TEXT_LINK } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";
import { accountError } from "@/utils/account";
import { toneClass } from "@/utils/format";
import { currentRound, seasonOfRound } from "@/utils/rounds";

interface Score {
  league_id: number;
  nickname: string;
  points: number;
}
interface Place {
  league_id: number;
  rank: number;
  points: number;
}
interface PublicLeague {
  id: number;
  name: string;
  members: number;
}
interface Read {
  leagues: League[];
  /** The public leagues not full (the member's own among them) */
  open: PublicLeague[];
  people: Person[];
  /** The newest round with scores, and the members' scores in it */
  last: string | null;
  scores: Score[];
  /** The members' picks in the round under way */
  picks: Pick[];
  /** The member's own place in each league's season table */
  places: Place[];
}

/** The member's leagues, their members, the last round's scores, the round under way's picks and the member's places */
async function readLeagues(client: SupabaseClient, current: string, me: string): Promise<Read> {
  const [l, p, newest, o, m, pub] = await Promise.all([
    client.from("stonk_leagues").select("id, name, invite_code, owner, is_public").order("created_at"),
    client.from("stonk_league_people").select("league_id, nickname, owner").order("joined_at"),
    client.from("stonk_round_scores").select("round").order("round", { ascending: false }).limit(1).maybeSingle<{ round: string }>(),
    client.from("stonk_league_ownership").select("league_id, player_id, name, picks, captains").eq("round", current).order("picks", { ascending: false }),
    client.from("stonk_league_table").select("league_id, rank, points").eq("season", seasonOfRound(current)).eq("nickname", me),
    client.from("stonk_public_leagues").select("id, name, members").limit(50),
  ]);
  const last = newest.data?.round ?? null;
  const scores = last ? ((await client.from("stonk_league_round_scores").select("league_id, nickname, points").eq("round", last)).data as Score[] | null) ?? [] : [];
  return {
    leagues: (l.data as League[] | null) ?? [],
    open: (pub.data as PublicLeague[] | null) ?? [],
    people: (p.data as Person[] | null) ?? [],
    last,
    scores: scores.map((x) => ({ ...x, points: Number(x.points) })),
    picks: (o.data as Pick[] | null) ?? [],
    places: ((m.data as Place[] | null) ?? []).map((x) => ({ ...x, points: Number(x.points) })),
  };
}

/** An invite code's length (supabase/migrations/*_league_codes_public.sql: new_league_code) */
const CODE = 4;

export default function Leagues() {
  const { t, plural, rich, href, signed, date, num } = useI18n();
  const { status, profile, load } = useAccount();
  const [join, setJoin] = useQueryState("join", parseAsString);
  const [opened, setOpened] = useQueryState("league", parseAsInteger.withOptions({ history: "push", scroll: true }));
  const [read, setRead] = useState<Read | null>(null);
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const now = useNow();
  const current = now ? currentRound(now) : null;
  const me = profile?.nickname ?? "";

  const reread = useCallback(async () => {
    if (current === null) return;
    setRead(await readLeagues(await load(), current, me));
  }, [load, current, me]);

  // Signed in: the leagues; an invite link: joined (once), then the link's code taken out of the address
  useEffect(() => {
    if (status !== "ready" || current === null || !me) return;
    let live = true;
    void (async () => {
      const client = await load();
      if (join) {
        const { data, error } = await client.rpc("join_league", { code: join });
        if (!live) return;
        if (error || data === null) setError(t(`account.errors.${error ? (accountError(error) ?? "unknown") : "league_not_found"}`));
        void setJoin(null);
      }
      const data = await readLeagues(client, current, me);
      if (live) setRead(data);
    })();
    return () => {
      live = false;
    };
  }, [status, join, setJoin, load, current, me, t]);

  if (status === "off") return null;
  if (status !== "ready" || !profile) return <p className="text-lg">{rich("elostonk.leagues.signIn", { link: (text) => <Link href="/account" className={TEXT_LINK}>{text}</Link> })}</p>;

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const client = await load();
    const { error } = await client.from("stonk_leagues").insert({ name: name.trim(), owner: profile.user_id, is_public: open });
    if (error) return setError(t(`account.errors.${accountError(error) ?? "unknown"}`));
    setName("");
    setOpen(false);
    await reread();
  };
  const typed = code.replace(/\s/g, "");
  const joinByCode = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const client = await load();
    const { data, error } = await client.rpc("join_league", { code: typed });
    if (error) return setError(t(`account.errors.${accountError(error) ?? "unknown"}`));
    // A wrong code: null (the database counts the tries)
    if (data === null) return setError(t("account.errors.league_not_found"));
    setCode("");
    await reread();
  };
  const joinPublic = async (id: number) => {
    setError(null);
    const client = await load();
    const { error } = await client.rpc("join_public_league", { league: id });
    if (error) return setError(t(`account.errors.${accountError(error) ?? "unknown"}`));
    await reread();
  };
  const setPublic = async (id: number, value: boolean) => {
    setError(null);
    const client = await load();
    const { error } = await client.from("stonk_leagues").update({ is_public: value }).eq("id", id);
    if (error) return setError(t(`account.errors.${accountError(error) ?? "unknown"}`));
    await reread();
  };
  const leave = async (id: number) => {
    const client = await load();
    await client.from("stonk_league_members").delete().eq("league_id", id).eq("user_id", profile.user_id);
    void setOpened(null);
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

  // The last round's winners in a league (ties share it)
  const winnerOf = (id: number) => {
    const scores = read?.scores.filter((r) => r.league_id === id) ?? [];
    if (!read?.last || !scores.length) return null;
    const points = Math.max(...scores.map((r) => r.points));
    return { round: read.last, names: scores.filter((r) => r.points === points).map((r) => r.nickname), points };
  };

  // A league opened (one of the member's: another id shows the list)
  const shown = read?.leagues.find((l) => l.id === opened);
  // The public leagues to join: those the member isn't in
  const joinable = read?.open.filter((o) => !read.leagues.some((l) => l.id === o.id)) ?? [];
  if (read && shown) {
    return (
      <LeagueView
        league={shown}
        members={read.people.filter((p) => p.league_id === shown.id)}
        winner={winnerOf(shown.id)}
        picks={read.picks.filter((p) => p.league_id === shown.id)}
        owned={shown.owner === profile.user_id}
        copied={copied === shown.id}
        onBack={() => void setOpened(null)}
        onShare={() => void share(shown)}
        onRenew={() => void renew(shown.id)}
        onLeave={() => void leave(shown.id)}
        onPublic={(value) => void setPublic(shown.id, value)}
      />
    );
  }

  return (
    <div>
      {error && <p role="alert" className={`${ERROR} mb-4`}>{error}</p>}
      {read === null ? (
        <p className="text-gray-600">{t("common.loading")}</p>
      ) : !read.leagues.length ? (
        <p className="text-gray-700 mb-6">{t("elostonk.leagues.none")}</p>
      ) : (
        <>
          <p className="text-sm text-gray-600 mb-3">{t("elostonk.board.updated")}</p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {read.leagues.map((l) => {
              const members = read.people.filter((p) => p.league_id === l.id).length;
              const winner = winnerOf(l.id);
              const place = read.places.find((p) => p.league_id === l.id);
              return (
                <li key={l.id} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => void setOpened(l.id)}
                    className="group link-host bg-white p-4 md:p-6 w-full h-full text-left grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 cursor-pointer transition-colors duration-200 hover:bg-gray-50"
                  >
                    <span className="min-w-0">
                      <span className="block text-xl break-words group-hover:text-blue-600">
                        {/* Inline, so its line on hover follows each line of a name that wraps */}
                        <span className="link-group">{l.name}</span>
                      </span>
                      <span className="block text-sm text-gray-600 mt-1">
                        {plural("elostonk.leagues.members", members)}
                        {place && (
                          <>
                            {" · "}
                            {rich("elostonk.leagues.place", { rank: num(place.rank), points: <span className={`tabular-nums ${toneClass(place.points)}`}>{signed(place.points, 1)}</span> })}
                          </>
                        )}
                      </span>
                      {winner && (
                        <span className="block mt-2">
                          {rich("elostonk.leagues.lastWinner", { date: date(winner.round, "dayMonth"), names: <strong className="break-all">{winner.names.join(", ")}</strong>, points: signed(winner.points, 1) })}
                        </span>
                      )}
                    </span>
                    <ArrowRight className="group-hover:text-blue-600" />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {joinable.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl mb-3">{t("elostonk.leagues.publicTitle")}</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {joinable.map((o) => (
              <li key={o.id} className="min-w-0 bg-white p-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4">
                <span className="min-w-0">
                  <span className="block text-lg break-words">{o.name}</span>
                  <span className="block text-sm text-gray-600">{plural("elostonk.leagues.members", o.members)}</span>
                </span>
                <button type="button" onClick={() => void joinPublic(o.id)} className={SUBMIT}>{t("elostonk.leagues.joinButton")}</button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        <form onSubmit={create} className="space-y-3">
          <h2 className="text-xl">{t("elostonk.leagues.create")}</h2>
          <div>
            <label htmlFor="league-name" className={LABEL}>{t("elostonk.leagues.name")}</label>
            <input id="league-name" required minLength={3} maxLength={40} value={name} onChange={(e) => setName(e.target.value)} className={FIELD} />
          </div>
          <div>
            <CheckToggle checked={open} onChange={setOpen}>{t("elostonk.leagues.public")}</CheckToggle>
            <p className={HELP}>{t(open ? "elostonk.leagues.publicHelp" : "elostonk.leagues.privateHelp")}</p>
          </div>
          <button type="submit" className={SUBMIT}>{t("elostonk.leagues.createButton")}</button>
        </form>
        <form onSubmit={joinByCode} className="space-y-3">
          <h2 className="text-xl">{t("elostonk.leagues.join")}</h2>
          <div>
            <label htmlFor="league-code" className={LABEL}>{t("elostonk.leagues.codeLabel")}</label>
            <CodeFields id="league-code" length={CODE} value={code} onChange={setCode} label={t("elostonk.leagues.codeLabel")} />
          </div>
          <button type="submit" disabled={typed.length < CODE} className={SUBMIT}>{t("elostonk.leagues.joinButton")}</button>
        </form>
      </div>
    </div>
  );
}
