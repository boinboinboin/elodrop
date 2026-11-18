"use client";

// Making the account after signing in: the age gate and a nickname. The date of birth is checked here, the year is
// what's kept (and checked again by the database). Under the age limit no account is made, and the sign-in itself is
// deleted at once (delete_account), so nothing of theirs stays. The question doesn't say what the limit is until it's
// answered, and a refusal is remembered in the browser for a day so another date isn't simply tried (SignIn shows it).
import { type FormEvent, useEffect, useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import { ERROR, FIELD, HELP, LABEL, SUBMIT } from "@/components/account/form";
import CheckToggle from "@/components/ui/CheckToggle";
import Link from "@/components/ui/Link";
import { TEXT_LINK } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";
import { accountError, ageOn, MIN_AGE, type Profile, refusedRecently, rememberRefusal } from "@/utils/account";

export default function CreateProfile() {
  const { t } = useI18n();
  const { load, setProfile } = useAccount();
  const [birthDate, setBirthDate] = useState("");
  const [nickname, setNickname] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refused on this device in the last day: refused again, and this sign-in deleted
  useEffect(() => {
    if (refusedRecently()) void refuse();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The sign-in deleted and signed out: the page goes back to signing in, which shows why (SignIn)
  async function refuse() {
    rememberRefusal();
    const client = await load();
    await client.rpc("delete_account");
    await client.auth.signOut({ scope: "local" });
  }

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (ageOn(birthDate) < MIN_AGE) return refuse();
    setBusy(true);
    const client = await load();
    const { data: user } = await client.auth.getUser();
    if (!user.user) return setBusy(false);
    const { data, error } = await client
      .from("profiles")
      .insert({ user_id: user.user.id, nickname: nickname.trim(), birth_year: Number(birthDate.slice(0, 4)) })
      .select("*")
      .single<Profile>();
    setBusy(false);
    if (error) return setError(t(`account.errors.${accountError(error) ?? "unknown"}`));
    setProfile(data);
  };

  const today = new Date().toISOString().slice(0, 10);
  return (
    <form onSubmit={create} className="max-w-3xl space-y-5">
      <h2 className="text-3xl">{t("account.profile.title")}</h2>
      <p className="text-gray-700">{t("account.profile.intro")}</p>
      <div>
        <label htmlFor="account-birth" className={LABEL}>{t("account.profile.birthDate")}</label>
        <input id="account-birth" type="date" required min="1900-01-01" max={today} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={FIELD} />
        <p className={HELP}>{t("account.profile.birthDateHelp")}</p>
      </div>
      <div>
        <label htmlFor="account-nickname" className={LABEL}>{t("account.profile.nickname")}</label>
        <input id="account-nickname" required minLength={3} maxLength={20} autoComplete="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} className={FIELD} />
        <p className={HELP}>{t("account.profile.nicknameHelp")}</p>
      </div>
      <div>
        <CheckToggle checked={agreed} onChange={setAgreed}>{t("account.profile.privacy")}</CheckToggle>
        <Link href="/privacy" target="_blank" className={`${TEXT_LINK} inline-block ml-6 mt-1 text-sm`}>{t("account.profile.privacyLink")}</Link>
      </div>
      <button type="submit" disabled={busy || !agreed} className={SUBMIT}>{t(busy ? "account.profile.creating" : "account.profile.create")}</button>
      {error && <p role="alert" className={ERROR}>{error}</p>}
    </form>
  );
}
