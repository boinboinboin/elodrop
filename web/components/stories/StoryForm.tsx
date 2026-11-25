"use client";

// The stories page's form (app/[lang]/(site)/stories): a signed-in member finds the match (a player in it, then one of
// their matches, searched by opponent, partner, tournament or year) and tells its story, with where it comes from and
// whether to show their username. It waits for the owner: the database sends it to the Studio as a draft
// (supabase/functions/stories-to-sanity), where it's read, tidied and published, or deleted. Their own stories are
// listed under it with where they stand. The database holds the same rules (supabase/migrations/*_match_stories.sql:
// check_story): accounts at least STORY_DAYS old, at most 3 waiting, one story per match each.
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import { ERROR, FIELD, HELP, LABEL, SUBMIT } from "@/components/account/form";
import PlayerPicker, { type Found } from "@/components/head-to-head/PlayerPicker";
import CheckToggle from "@/components/ui/CheckToggle";
import Link from "@/components/ui/Link";
import SearchField from "@/components/ui/SearchField";
import { BUTTON, TEXT_LINK } from "@/components/ui/styles";
import { useGrowingList } from "@/components/ui/useGrowingList";
import { useI18n } from "@/messages/client";
import type { Match, Pool } from "@/types";
import { accountError, ACCOUNTS, daysSince } from "@/utils/account";
import { parseMatchKey } from "@/utils/matchKey";

/** As the database's check_story */
const STORY_DAYS = 3;
const MIN = 30;
const MAX = 2000;

type Status = "pending" | "sent" | "published" | "declined";
interface Mine {
  id: number;
  match_summary: string;
  status: Status;
  created_at: string;
}
/** One of the picked player's matches, with its discipline */
type FoundMatch = { pool: Pool; m: Match };

/** The match in a line, from the picked player's side, for the Studio and the member's own list: day, event, sides, score */
function summary(player: string, { m }: FoundMatch) {
  const side = [player, m.partner?.name].filter(Boolean).join(" / ");
  return `${m.day} · ${m.event}: ${side} – ${m.opponents.map((o) => o.name).join(" / ")} ${m.score}`.slice(0, 300);
}

export default function StoryForm() {
  const { t, rich } = useI18n();
  const { status, profile, createdAt, load } = useAccount();
  const [mine, setMine] = useState<Mine[]>([]);
  const userId = profile?.user_id;

  useEffect(() => {
    if (!userId) return;
    let live = true;
    void load().then(async (client) => {
      const { data } = await client.from("story_submissions").select("id, match_summary, status, created_at").eq("author", userId).order("created_at", { ascending: false });
      if (live) setMine((data as Mine[] | null) ?? []);
    });
    return () => {
      live = false;
    };
  }, [userId, load]);

  if (!ACCOUNTS || status === "off" || status === "loading") return null;
  if (status !== "ready" || !userId) {
    return <p className="text-lg">{rich("stories.form.signIn", { link: (text) => <Link href="/account" className={TEXT_LINK}>{text}</Link> })}</p>;
  }
  const old = !!profile?.trusted || (!!createdAt && daysSince(createdAt) >= STORY_DAYS);
  return (
    <div className="max-w-3xl">
      {old ? (
        <Tell userId={userId} nickname={profile?.nickname ?? ""} onSent={(story) => setMine((list) => [story, ...list])} />
      ) : (
        <p className="text-gray-600">{t("stories.form.tooNew", { days: STORY_DAYS })}</p>
      )}
      {mine.length > 0 && (
        <div className="mt-10">
          <h3 className="text-xl mb-3">{t("stories.form.mine")}</h3>
          <ul className="space-y-2">
            {mine.map((s) => (
              <li key={s.id} className="flex flex-wrap justify-between gap-x-4 border-b border-gray-100 pb-2">
                <span className="min-w-0 wrap-anywhere">{s.match_summary}</span>
                <span className="text-gray-600">{t(`stories.form.status.${s.status}`)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Tell({ userId, nickname, onSent }: { userId: string; nickname: string; onSent: (story: Mine) => void }) {
  const { t, lang } = useI18n();
  const { load } = useAccount();
  const [player, setPlayer] = useState<Found | null>(null);
  const [match, setMatch] = useState<FoundMatch | null>(null);
  const [story, setStory] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [showName, setShowName] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!player || !match?.m.key) return;
    setBusy(true);
    setError(null);
    const client = await load();
    const { data, error } = await client
      .from("story_submissions")
      .insert({
        author: userId,
        match_key: parseMatchKey(match.m.key)?.key ?? match.m.key,
        match_summary: summary(player.name, match),
        story: story.trim(),
        source_name: sourceName.trim() || null,
        source_url: sourceUrl.trim() || null,
        show_name: showName,
        lang,
      })
      .select("id, match_summary, status, created_at")
      .single<Mine>();
    setBusy(false);
    if (error) return setError(t(`account.errors.${accountError(error) ?? "unknown"}`));
    onSent(data);
    setSent(true);
    setMatch(null);
    setStory("");
    setSourceName("");
    setSourceUrl("");
  };

  return (
    <form onSubmit={send} className="space-y-5">
      <div className="max-w-sm">
        <PlayerPicker
          name="story-player"
          label={t("stories.form.player")}
          initial={null}
          onChange={(p) => {
            setPlayer(p);
            setMatch(null);
            setSent(false);
          }}
        />
      </div>
      {player && !match && <MatchList key={player.id} player={player} onPick={setMatch} />}
      {player && match && (
        <>
          <div className="bg-white p-4 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={LABEL}>{t("stories.form.chosen")}</p>
              <MatchLine player={player.name} found={match} />
            </div>
            <button type="button" onClick={() => setMatch(null)} className={`px-3 py-1 text-sm ${BUTTON}`}>{t("stories.form.change")}</button>
          </div>
          <div>
            <label htmlFor="story-text" className={LABEL}>{t("stories.form.story")}</label>
            <textarea id="story-text" required minLength={MIN} maxLength={MAX} rows={8} value={story} onChange={(e) => setStory(e.target.value)} className={`${FIELD} max-w-none`} />
            <p className={HELP}>{t("stories.form.storyHelp", { count: story.trim().length, max: MAX, min: MIN })}</p>
          </div>
          <div>
            <label htmlFor="story-source" className={LABEL}>{t("stories.form.sourceName")}</label>
            <input id="story-source" maxLength={100} value={sourceName} onChange={(e) => setSourceName(e.target.value)} className={FIELD} />
            <p className={HELP}>{t("stories.form.sourceNameHelp")}</p>
          </div>
          <div>
            <label htmlFor="story-url" className={LABEL}>{t("stories.form.sourceUrl")}</label>
            <input id="story-url" type="url" inputMode="url" maxLength={500} pattern="https?://.+" placeholder="https://" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} className={FIELD} />
          </div>
          <CheckToggle checked={showName} onChange={setShowName} className="items-start">
            <span>
              {t("stories.form.showName")}
              <span className="block text-sm text-gray-600">{t("stories.form.showNameHelp", { name: nickname })}</span>
            </span>
          </CheckToggle>
          <button type="submit" disabled={busy || story.trim().length < MIN} className={SUBMIT}>{t(busy ? "stories.form.sending" : "stories.form.send")}</button>
        </>
      )}
      {sent && <p role="status" className="text-gray-700">{t("stories.form.sent")}</p>}
      {error && <p role="alert" className={ERROR}>{error}</p>}
    </form>
  );
}

/** A match in a line or two: day, discipline and event, then the result against whom, with the score */
function MatchLine({ player, found: { pool, m } }: { player: string; found: FoundMatch }) {
  const { t, date, pools } = useI18n();
  return (
    <span className="block">
      <span className="block text-sm text-gray-600">
        {date(m.day)} · {pools[pool]} · {m.event}
      </span>
      <span className="block">
        <strong className={`font-semibold ${m.result === 1 ? "text-green-700" : m.result === 0 ? "text-red-700" : ""}`}>
          {t(m.result === 1 ? "stories.form.won" : m.result === 0 ? "stories.form.lost" : "stories.form.draw")}
        </strong>{" "}
        {player}
        {m.partner && <> {t("stories.form.with", { name: m.partner.name })}</>} – {m.opponents.map((o) => o.name).join(" / ")}{" "}
        <span className="text-gray-600 tabular-nums whitespace-nowrap">{m.score}</span>
      </span>
    </span>
  );
}

/** The picked player's matches (every discipline, newest first), searched, each one a button that picks it */
function MatchList({ player, onPick }: { player: Found; onPick: (match: FoundMatch) => void }) {
  const { t } = useI18n();
  const [all, setAll] = useState<FoundMatch[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");

  // A new player remounts the list (its key), so it starts empty
  useEffect(() => {
    let live = true;
    fetch(`/api/players/${player.id}/matches?pool=all`)
      .then((res) => (res.ok ? (res.json() as Promise<Partial<Record<Pool, Match[]>>>) : Promise.reject(new Error(String(res.status)))))
      .then((pools) => {
        if (!live) return;
        const list = (Object.entries(pools) as [Pool, Match[]][]).flatMap(([pool, matches]) => matches.filter((m) => m.key).map((m) => ({ pool, m })));
        setAll(list.sort((a, b) => b.m.day.localeCompare(a.m.day)));
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [player.id, attempt]);

  // Every word typed must be in the opponents', the partner's, the event's name or the day
  const shown = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!all || !words.length) return all ?? [];
    return all.filter(({ m }) => {
      const text = [m.day, m.event, m.partner?.name, ...m.opponents.map((o) => o.name)].join(" ").toLowerCase();
      return words.every((w) => text.includes(w));
    });
  }, [all, query]);
  const { limit, sentinel } = useGrowingList(shown.length, `${player.id}:${query}`);

  if (failed)
    return (
      <button
        type="button"
        onClick={() => {
          setFailed(false);
          setAttempt((a) => a + 1);
        }}
        className={`px-4 py-2 ${BUTTON}`}
      >{t("players.matches.loadFailed")}</button>
    );
  if (!all) return <p className="text-gray-600">{t("stories.form.loading")}</p>;
  return (
    <div>
      <SearchField label={t("stories.form.search")} value={query} onChange={setQuery} className="w-full sm:w-96 mb-3" />
      {!shown.length ? (
        <p className="text-gray-600">{t("stories.form.noMatches")}</p>
      ) : (
        <ul className="divide-y divide-gray-100 bg-white">
          {shown.slice(0, limit).map((found, i) => (
            <li key={`${found.m.key}-${i}`}>
              <button type="button" onClick={() => onPick(found)} aria-label={`${t("stories.form.pick")}: ${found.m.day} ${found.m.event}`} className="w-full text-left px-3 py-2 cursor-pointer transition-colors duration-150 hover:bg-gray-50 wrap-anywhere">
                <MatchLine player={player.name} found={found} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {limit < shown.length && <div ref={sentinel} />}
    </div>
  );
}
