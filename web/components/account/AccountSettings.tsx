"use client";

// The account page's Settings tab: the nickname, "This is me", what they follow (to unfollow), their error reports,
// signing out and deleting the account, one part under another.
import { type FormEvent, useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import DeleteAccount from "@/components/account/DeleteAccount";
import FollowingSettings from "@/components/account/FollowingSettings";
import { ERROR, FIELD, HELP, LABEL, PART, SUBMIT } from "@/components/account/form";
import MeSettings from "@/components/account/MeSettings";
import MyReports from "@/components/account/MyReports";
import { useI18n } from "@/messages/client";
import { accountError, type Profile, USERNAME_LOCK_DAYS, USERNAME_PATTERN } from "@/utils/account";

export default function AccountSettings() {
  const { t, date } = useI18n();
  const { email, profile, load, setProfile, signOut } = useAccount();
  const [nickname, setNickname] = useState(profile?.nickname ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The moment the page opened (the settings are shown in the browser only)
  const [now] = useState(() => Date.now());
  if (!profile) return null;
  // The username can change again from this day (after the free first change; trusted accounts any time)
  const unlocks = profile.nickname_changed_at && !profile.trusted ? new Date(new Date(profile.nickname_changed_at).getTime() + USERNAME_LOCK_DAYS * 86_400_000) : null;
  const lockedUntil = unlocks && unlocks.getTime() > now ? unlocks : null;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    setError(null);
    const client = await load();
    const { data, error } = await client.from("profiles").update({ nickname: nickname.trim() }).eq("user_id", profile.user_id).select("*").single<Profile>();
    setBusy(false);
    if (error) return setError(t(`account.errors.${accountError(error) ?? "unknown"}`));
    setProfile(data);
    setSaved(true);
  };

  return (
    <div>
      <div className={PART}>
        <p className="text-gray-700 mb-4 break-words">{t("account.settings.signedInAs", { email: email ?? "" })}</p>
        <form onSubmit={save}>
          <label htmlFor="account-nickname" className={LABEL}>{t("account.settings.nickname")}</label>
          <div className="flex flex-wrap gap-2">
            <input
              id="account-nickname"
              required
              minLength={3}
              maxLength={20}
              pattern={USERNAME_PATTERN}
              autoComplete="username"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setSaved(false);
              }}
              className={`${FIELD} flex-1 min-w-0`}
            />
            <button type="submit" disabled={busy || nickname.trim() === profile.nickname} className={SUBMIT}>
              {t(saved ? "account.settings.saved" : "account.settings.save")}
            </button>
          </div>
          {lockedUntil && <p className={HELP}>{t("account.settings.nicknameLocked", { date: date(lockedUntil.toISOString().slice(0, 10)) })}</p>}
          {error && <p role="alert" className={ERROR}>{error}</p>}
        </form>
      </div>
      <MeSettings />
      <FollowingSettings />
      <MyReports />
      <div className={PART}>
        <button type="button" onClick={() => void signOut()} className={SUBMIT}>{t("account.settings.signOut")}</button>
      </div>
      <DeleteAccount />
    </div>
  );
}
