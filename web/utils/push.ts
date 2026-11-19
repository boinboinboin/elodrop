// Push notifications in the browser (README: "Notifications"): whether this browser can get them, and turning them on
// and off for this device. Turning on registers the push-only service worker (public/sw.js), asks for permission and
// subscribes with the site's public VAPID key (NEXT_PUBLIC_VAPID_PUBLIC_KEY); the subscription is saved in Supabase by
// the account page (components/account/NotificationSettings.tsx), where the push-draws function finds it.
import { isInstalled, isIos } from "@/utils/install";

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/**
 * What this browser can do: "ok"; "install" on an iPhone not opened as the installed app (iOS gives notifications to
 * home-screen apps only); "unsupported"; "denied" when the member blocked them for the site
 */
export function pushSupport(): "ok" | "install" | "unsupported" | "denied" {
  if (isIos() && !isInstalled()) return "install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  return Notification.permission === "denied" ? "denied" : "ok";
}

/** This device's subscription, if notifications are on here */
export async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration("/");
  return (await registration?.pushManager.getSubscription()) ?? null;
}

const keyBytes = (key: string) => {
  const b64 = key.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (key.length % 4)) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
};

/** Turn on for this device: the subscription to save (null: permission not given) */
export async function subscribe(): Promise<{ endpoint: string; p256dh: string; auth: string } | null> {
  if ((await Notification.requestPermission()) !== "granted") return null;
  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  const sub = (await registration.pushManager.getSubscription()) ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }));
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null;
  return { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth };
}

/** Turn off for this device: the endpoint that was subscribed, to delete */
export async function unsubscribe(): Promise<string | null> {
  const sub = await currentSubscription();
  if (!sub) return null;
  await sub.unsubscribe();
  return sub.endpoint;
}
