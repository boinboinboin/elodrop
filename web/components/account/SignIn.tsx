"use client";

// Signing in, which is also signing up: an email address, then the code sent to it (6 to 10 digits, by the project's
// setting: Authentication → Sign In / Providers → Email) (typed here, so it works in
// the installed app too, where a link in the email would open the browser instead), or Google where it's set up
// (NEXT_PUBLIC_SUPABASE_GOOGLE). Asking for a code needs Cloudflare Turnstile's check passed first (Turnstile.tsx), so
// bots can't. The account itself is made after, with the age gate (CreateProfile).
// Beside the form, what an account gives you (AccountBenefits).
import { type FormEvent, useState } from "react";
import AccountBenefits from "@/components/account/AccountBenefits";
import { useAccount } from "@/components/account/AccountProvider";
import { ERROR, FIELD, LABEL, SUBMIT } from "@/components/account/form";
import Turnstile, { TURNSTILE_SITE_KEY } from "@/components/account/Turnstile";
import Card from "@/components/ui/Card";
import Link from "@/components/ui/Link";
import { TEXT_LINK } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";
import { MIN_AGE, refusedRecently } from "@/utils/account";

const GOOGLE = process.env.NEXT_PUBLIC_SUPABASE_GOOGLE === "1";

export default function SignIn() {
  const { t, rich, href } = useI18n();
  const { load } = useAccount();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Turnstile's token (null until passed), and a count of the widgets used: each token is good for one request
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [check, setCheck] = useState(0);
  // The age gate refused a birth date here in the last day (CreateProfile): why the sign-in is gone
  const [refused] = useState(refusedRecently);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const client = await load();
    const { error } = await client.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true, ...(captcha ? { captchaToken: captcha } : {}) } });
    setBusy(false);
    // The token is used either way: a new check for the next request
    setCaptcha(null);
    setCheck((n) => n + 1);
    if (error) setError(t("account.signIn.sendFailed"));
    else setSent(true);
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const client = await load();
    const { error } = await client.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    setBusy(false);
    // Signed in: the provider hears of it and the page moves on
    if (error) setError(t("account.signIn.codeFailed"));
  };

  const google = async () => {
    const client = await load();
    await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: new URL(href("/account"), window.location.origin).toString() } });
  };

  // The form, and beside it (below it on phones) what an account gives you
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
      <div className="min-w-0">
        {refused && <p role="alert" className="text-lg border-l-4 border-black pl-4 mb-6">{t("account.profile.tooYoung", { age: MIN_AGE })}</p>}
        <p className="text-lg text-gray-700 mb-6">{t("account.signIn.intro")}</p>
        {!sent ? (
          <form onSubmit={send} className="space-y-4">
            <div>
              <label htmlFor="account-email" className={LABEL}>{t("account.signIn.email")}</label>
              <input id="account-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={FIELD} />
            </div>
            {TURNSTILE_SITE_KEY && <Turnstile key={check} onToken={setCaptcha} />}
            <button type="submit" disabled={busy || (!!TURNSTILE_SITE_KEY && !captcha)} className={SUBMIT}>{t(busy ? "account.signIn.sending" : "account.signIn.sendCode")}</button>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-4">
            <p aria-live="polite">{t("account.signIn.codeSent", { email: email.trim() })}</p>
            <div>
              <label htmlFor="account-code" className={LABEL}>{t("account.signIn.code")}</label>
              <input
                id="account-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6,10}"
                maxLength={10}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className={`${FIELD} max-w-40 tracking-[0.3em] text-lg`}
              />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button type="submit" disabled={busy || code.length < 6} className={SUBMIT}>{t(busy ? "account.signIn.verifying" : "account.signIn.verify")}</button>
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setCode("");
                  setError(null);
                }}
                className="link-underlined hover:text-blue-600"
              >
                {t("account.signIn.otherEmail")}
              </button>
            </div>
          </form>
        )}
        {error && <p role="alert" className={ERROR}>{error}</p>}
        {GOOGLE && !sent && (
          <>
            <p className="text-gray-600 my-4">{t("account.signIn.or")}</p>
            <button type="button" onClick={() => void google()} className={SUBMIT}>{t("account.signIn.google")}</button>
          </>
        )}
      </div>
      <Card title={t("account.benefits.title")} className="min-w-0">
        <div className="mt-4">
          <AccountBenefits />
        </div>
        <p className="mt-6 text-sm text-gray-600">{rich("account.benefits.terms", { link: (text) => <Link href="/privacy" className={TEXT_LINK}>{text}</Link> })}</p>
      </Card>
    </div>
  );
}
