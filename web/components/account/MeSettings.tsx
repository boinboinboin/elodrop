"use client";

// "This is me": the user picks themselves among the players (the player search, as on head to head). Private: it marks
// that player page "You" and puts their rating on the front page, for them only. The database lets it change once every
// 30 days (and a report be sent about it 14 days after), so it isn't a way to roam other players' pages. Choosing one,
// and clearing one while that lock is on, ask first, saying how long it holds.
import { type FormEvent, useEffect, useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import { ERROR, PART, SUBMIT } from "@/components/account/form";
import PlayerPicker from "@/components/head-to-head/PlayerPicker";
import Link from "@/components/ui/Link";
import { TEXT_LINK } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";
import { accountError, CLAIM_LOCK_DAYS, type Profile } from "@/utils/account";
import { playerHref } from "@/utils/hrefs";
import { loadSearchIndex } from "@/utils/search";

export default function MeSettings() {
  const { t, rich, date, lang } = useI18n();
  const { profile, load, setProfile } = useAccount();
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Waiting for "Yes": the player chosen, or clearing the claim
  const [asking, setAsking] = useState<{ id: number; name: string } | "clear" | null>(null);
  const playerId = profile?.player_id ?? null;

  // The claimed player's name, from the search index (loaded once per visit, as the search does)
  useEffect(() => {
    if (playerId === null) return;
    let live = true;
    loadSearchIndex(lang)
      .then((index) => live && setName(index.players.find((p) => p.id === playerId)?.name ?? `#${playerId}`))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [playerId, lang]);

  if (!profile) return null;
  const unlocks = profile.player_claimed_at ? new Date(new Date(profile.player_claimed_at).getTime() + CLAIM_LOCK_DAYS * 86_400_000) : null;
  // A trusted account (set by the owner) isn't held to the 30 days
  const locked = !profile.trusted && unlocks !== null && unlocks > new Date();

  const claim = async (id: number | null) => {
    setBusy(true);
    setError(null);
    const client = await load();
    const { data, error } = await client.from("profiles").update({ player_id: id }).eq("user_id", profile.user_id).select("*").single<Profile>();
    setBusy(false);
    setAsking(null);
    if (error) return setError(t(`account.errors.${accountError(error) ?? "unknown"}`));
    setProfile(data);
  };

  // The player picked (its id in the hidden field, its name in the search field): asked first
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const id = Number(new FormData(form).get("me"));
    const picked = form.querySelector<HTMLInputElement>("#player-me")?.value.trim() ?? "";
    if (id > 0) setAsking({ id, name: picked });
  };
  const lockedUntil = unlocks && date(unlocks.toISOString().slice(0, 10));

  return (
    <div className={PART}>
      <h2 className="text-2xl mb-2">{t("account.me.title")}</h2>
      <p className="text-gray-700 mb-4">{t("account.me.intro")}</p>
      {playerId !== null && (
        <div className="mb-4 space-y-2">
          <p>{rich("account.me.current", { link: (text) => <Link href={playerHref(playerId)} className={TEXT_LINK}>{text}</Link> }, { name: name ?? "…" })}</p>
          {asking !== "clear" && (
            // Clearing is free once the lock is over; during it, it leaves no one until it ends, so it's asked first
            <button type="button" disabled={busy} onClick={() => (locked ? setAsking("clear") : void claim(null))} className="underline hover:text-blue-600 disabled:opacity-50">
              {t("account.me.clear")}
            </button>
          )}
        </div>
      )}
      {asking && (
        <div role="alertdialog" aria-labelledby="me-confirm" className="max-w-xl border border-black bg-white p-4 mb-4">
          <p id="me-confirm" className="mb-4">
            {asking === "clear"
              ? t("account.me.confirmClear", { name: name ?? "", date: lockedUntil ?? "" })
              : t("account.me.confirm", { name: asking.name, days: CLAIM_LOCK_DAYS })}
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={busy} onClick={() => void claim(asking === "clear" ? null : asking.id)} className={`${SUBMIT} bg-black text-white`}>
              {t(asking === "clear" ? "account.me.confirmClearYes" : "account.me.confirmYes")}
            </button>
            <button type="button" disabled={busy} onClick={() => setAsking(null)} className={SUBMIT}>{t("account.me.cancel")}</button>
          </div>
        </div>
      )}
      {locked && lockedUntil ? (
        <p className="text-gray-600">{t("account.me.locked", { date: lockedUntil })}</p>
      ) : asking ? null : (
        <form onSubmit={submit} className="max-w-sm space-y-3">
          <PlayerPicker name="me" label={t("account.me.label")} initial={null} />
          <button type="submit" disabled={busy} className={SUBMIT}>{t("account.me.choose")}</button>
        </form>
      )}
      {error && <p role="alert" className={ERROR}>{error}</p>}
    </div>
  );
}
