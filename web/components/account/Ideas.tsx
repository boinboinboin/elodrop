"use client";

// The ideas page's list and form (app/[lang]/(site)/ideas): the ideas everyone sees (the database's ideas_public, with
// their votes and their author's nickname), by most votes, planned or done; a vote on each for a signed-in user (one each, taken back with a
// second press); their own suggestions with where they stand; and a form to suggest one, for accounts at least 7 days
// old. The database holds the same rules (supabase/migrations: check_idea, the votes' policy).
import { type FormEvent, useEffect, useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import { ERROR, FIELD, HELP, LABEL, SUBMIT } from "@/components/account/form";
import { Check } from "@/components/SVG";
import Link from "@/components/ui/Link";
import { TEXT_LINK, toggleClass } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";
import { ACCOUNTS, accountError, daysSince } from "@/utils/account";

type Status = "pending" | "open" | "planned" | "done" | "declined";
interface Idea {
  id: number;
  title: string;
  body: string;
  status: Status;
  votes: number;
  /** The author's nickname (null: their account is deleted, or the owner's own idea) */
  author?: string | null;
}
type View = "votes" | "planned" | "done";

const SUGGEST_DAYS = 7;

export default function Ideas() {
  const { t, plural, rich } = useI18n();
  const { status, profile, createdAt, load } = useAccount();
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [mine, setMine] = useState<Idea[]>([]);
  const [voted, setVoted] = useState<ReadonlySet<number>>(new Set());
  const [view, setView] = useState<View>("votes");

  useEffect(() => {
    if (!ACCOUNTS) return;
    let live = true;
    load()
      .then((client) => client.from("ideas_public").select("id, title, body, status, votes, author"))
      .then(({ data }) => live && setIdeas((data as Idea[] | null) ?? []));
    return () => {
      live = false;
    };
  }, [load]);

  // A signed-in user's votes and own suggestions
  const userId = profile?.user_id;
  useEffect(() => {
    if (!userId) return;
    let live = true;
    void load().then(async (client) => {
      const [v, m] = await Promise.all([client.from("votes").select("idea_id"), client.from("ideas").select("id, title, body, status").eq("author", userId)]);
      if (!live) return;
      setVoted(new Set(((v.data as { idea_id: number }[] | null) ?? []).map((row) => row.idea_id)));
      setMine(((m.data as Omit<Idea, "votes">[] | null) ?? []).map((i) => ({ ...i, votes: 0 })));
    });
    return () => {
      live = false;
    };
  }, [userId, load]);

  const vote = async (idea: Idea) => {
    if (!userId) return;
    const had = voted.has(idea.id);
    const apply = (on: boolean, by: number) => {
      setVoted((old) => {
        const set = new Set(old);
        if (on) set.add(idea.id);
        else set.delete(idea.id);
        return set;
      });
      setIdeas((old) => old?.map((i) => (i.id === idea.id ? { ...i, votes: i.votes + by } : i)) ?? old);
    };
    apply(!had, had ? -1 : 1);
    const client = await load();
    const { error } = had ? await client.from("votes").delete().eq("idea_id", idea.id) : await client.from("votes").insert({ user_id: userId, idea_id: idea.id });
    if (error) apply(had, had ? 1 : -1);
  };

  const shown = (ideas ?? [])
    .filter((i) => (view === "votes" ? i.status === "open" || i.status === "planned" : i.status === view))
    .sort((a, b) => b.votes - a.votes || a.title.localeCompare(b.title));
  const canVote = status === "ready";
  if (status === "off") return null;

  return (
    <div className="max-w-3xl">
      <div role="group" aria-label={t("account.ideas.title")} className="flex flex-wrap gap-2 mb-6">
        {(["votes", "planned", "done"] as const).map((v) => (
          <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={toggleClass(view === v, "sm")}>
            {t(`account.ideas.sort.${v}`)}
          </button>
        ))}
      </div>
      {!canVote && status !== "loading" && (
        <p className="mb-6">{rich("account.ideas.signIn", { link: (text) => <Link href="/account" className={TEXT_LINK}>{text}</Link> })}</p>
      )}
      {ideas === null ? (
        <p className="text-gray-600">{t("common.loading")}</p>
      ) : !shown.length ? (
        <p className="text-gray-600">{t("account.ideas.none")}</p>
      ) : (
        <ol className="space-y-3">
          {shown.map((idea) => {
            const has = voted.has(idea.id);
            const votable = canVote && (idea.status === "open" || idea.status === "planned");
            return (
              <li key={idea.id} className="bg-white p-4 flex gap-4 items-start">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl break-words">{idea.title}</h2>
                  {idea.body && <p className="text-gray-700 mt-1 break-words whitespace-pre-line">{idea.body}</p>}
                  <p className="text-sm text-gray-600 mt-2">
                    {plural("account.ideas.votes", idea.votes)}
                    {idea.author && <> · {t("account.ideas.by", { nickname: idea.author })}</>}
                    {idea.status === "planned" && <> · <strong className="text-gray-900">{t("account.ideas.status.planned")}</strong></>}
                  </p>
                </div>
                {votable && (
                  <button
                    type="button"
                    aria-pressed={has}
                    aria-label={t(has ? "account.ideas.unvote" : "account.ideas.voteFor", { title: idea.title })}
                    onClick={() => void vote(idea)}
                    className={`shrink-0 inline-flex items-center gap-2 ${toggleClass(has, "sm")}`}
                  >
                    {has && <Check />}
                    {t(has ? "account.ideas.voted" : "account.ideas.vote")}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {canVote && mine.length > 0 && (
        <div className="mt-10">
          <h2 className="text-2xl mb-3">{t("account.ideas.mine")}</h2>
          <ul className="space-y-2">
            {mine.map((i) => (
              <li key={i.id} className="flex flex-wrap justify-between gap-x-4 border-b border-gray-100 pb-2">
                <span className="break-words min-w-0">{i.title}</span>
                <span className="text-gray-600">{t(`account.ideas.status.${i.status}`)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {canVote && userId && (
        <Suggest
          userId={userId}
          old={!!profile?.trusted || (!!createdAt && daysSince(createdAt) >= SUGGEST_DAYS)}
          onSent={(idea) =>
            // A trusted account's idea is open at once: into the list; anyone else's waits among their own
            idea.status === "open" ? setIdeas((list) => [...(list ?? []), { ...idea, votes: 0, author: profile?.nickname ?? null }]) : setMine((old) => [{ ...idea, votes: 0 }, ...old])
          }
        />
      )}
    </div>
  );
}

function Suggest({ userId, old, onSent }: { userId: string; old: boolean; onSent: (idea: Omit<Idea, "votes">) => void }) {
  const { t } = useI18n();
  const { load } = useAccount();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  // Unticked: the owner may email them about it only when they say so
  const [contact, setContact] = useState(false);
  const [busy, setBusy] = useState(false);
  // Sent: waiting to be read, or (a trusted account's) on the list already
  const [sent, setSent] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const client = await load();
    const { data, error } = await client.from("ideas").insert({ title: title.trim(), body: body.trim(), author: userId, contact_ok: contact }).select("id, title, body, status").single<Omit<Idea, "votes">>();
    setBusy(false);
    if (error) return setError(t(`account.errors.${accountError(error) ?? "unknown"}`));
    onSent(data);
    setSent(data.status);
    setTitle("");
    setBody("");
    setContact(false);
  };

  return (
    <form onSubmit={send} className="mt-10 space-y-4">
      <h2 className="text-2xl">{t("account.ideas.suggest.title")}</h2>
      <p className="text-gray-700">{t("account.ideas.suggest.intro")}</p>
      {!old ? (
        <p className="text-gray-600">{t("account.ideas.suggest.tooNew")}</p>
      ) : (
        <>
          <div>
            <label htmlFor="idea-title" className={LABEL}>{t("account.ideas.suggest.name")}</label>
            <input id="idea-title" required minLength={5} maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} className={`${FIELD} max-w-none`} />
          </div>
          <div>
            <label htmlFor="idea-body" className={LABEL}>{t("account.ideas.suggest.body")}</label>
            <textarea id="idea-body" maxLength={500} rows={4} value={body} onChange={(e) => setBody(e.target.value)} className={`${FIELD} max-w-none`} />
            <p className={HELP}>{body.length}/500</p>
          </div>
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={contact} onChange={(e) => setContact(e.target.checked)} className="mt-1.5 w-4 h-4 accent-black" />
            <span>
              {t("account.ideas.suggest.contact")}
              <span className="block text-sm text-gray-600">{t("account.ideas.suggest.contactHelp")}</span>
            </span>
          </label>
          <button type="submit" disabled={busy} className={SUBMIT}>{t(busy ? "account.ideas.suggest.sending" : "account.ideas.suggest.send")}</button>
          {sent && <p role="status" className="text-gray-700">{t(sent === "open" ? "account.ideas.suggest.sentOpen" : "account.ideas.suggest.sent")}</p>}
          {error && <p role="alert" className={ERROR}>{error}</p>}
        </>
      )}
    </form>
  );
}
