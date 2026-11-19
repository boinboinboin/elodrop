"use client";

// The account page's Notifications part (Settings tab): turning on, for this device, a notification when a tournament
// draw on Elodrop first includes the player the member has said is them (utils/push.ts; sent by the push-draws
// function, supabase/functions). Shows what's needed first where it is: on an iPhone, installing the app (iOS gives
// notifications to home-screen apps only: the site's own install button); without "This is me", choosing who you are.
import { useCallback, useEffect, useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import { ERROR, HELP, PART, SUBMIT } from "@/components/account/form";
import InstallApp from "@/components/layout/InstallApp";
import { useI18n } from "@/messages/client";
import { currentSubscription, pushSupport, subscribe, unsubscribe, VAPID_PUBLIC_KEY } from "@/utils/push";

type State = "loading" | "on" | "off" | "install" | "unsupported" | "denied";

export default function NotificationSettings() {
  const { t, lang } = useI18n();
  const { profile, load } = useAccount();
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On here only when this device has a subscription the account has saved
  const read = useCallback(async () => {
    const support = pushSupport();
    if (support !== "ok") return setState(support);
    const sub = await currentSubscription();
    if (!sub) return setState("off");
    const client = await load();
    const { data } = await client.from("push_subscriptions").select("id").eq("endpoint", sub.endpoint).maybeSingle();
    setState(data ? "on" : "off");
  }, [load]);
  useEffect(() => {
    let live = true;
    // After the first paint: the browser's APIs aren't there on the server
    void Promise.resolve().then(() => {
      if (live) void read();
    });
    return () => {
      live = false;
    };
  }, [read]);

  if (!VAPID_PUBLIC_KEY || !profile) return null;

  const turnOn = async () => {
    setBusy(true);
    setError(null);
    try {
      const sub = await subscribe();
      if (!sub) {
        setBusy(false);
        return setState(pushSupport() === "denied" ? "denied" : "off");
      }
      const client = await load();
      // The same device saved before (turned on again): replaced
      await client.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      const { error } = await client.from("push_subscriptions").insert({ user_id: profile.user_id, ...sub, lang });
      if (error) throw error;
      setState("on");
    } catch {
      setError(t("account.notifications.failed"));
    }
    setBusy(false);
  };
  const turnOff = async () => {
    setBusy(true);
    setError(null);
    const endpoint = await unsubscribe().catch(() => null);
    if (endpoint) {
      const client = await load();
      await client.from("push_subscriptions").delete().eq("endpoint", endpoint);
    }
    setState("off");
    setBusy(false);
  };

  return (
    <div className={PART}>
      <h2 className="text-2xl mb-2">{t("account.notifications.title")}</h2>
      <p className="text-gray-700 mb-4">{t("account.notifications.intro")}</p>
      {profile.player_id === null && <p className={`${HELP} mb-4`}>{t("account.notifications.noClaim")}</p>}
      {state === "loading" && <p className="text-gray-600">{t("common.loading")}</p>}
      {state === "install" && (
        <div className="space-y-3">
          <p className="text-gray-700">{t("account.notifications.install")}</p>
          <InstallApp />
        </div>
      )}
      {state === "unsupported" && <p className="text-gray-600">{t("account.notifications.unsupported")}</p>}
      {state === "denied" && <p className="text-gray-600">{t("account.notifications.denied")}</p>}
      {state === "off" && (
        <button type="button" disabled={busy} onClick={() => void turnOn()} className={SUBMIT}>{t("account.notifications.turnOn")}</button>
      )}
      {state === "on" && (
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-gray-700">{t("account.notifications.on")}</span>
          <button type="button" disabled={busy} onClick={() => void turnOff()} className={SUBMIT}>{t("account.notifications.turnOff")}</button>
        </div>
      )}
      {error && <p role="alert" className={ERROR}>{error}</p>}
    </div>
  );
}
