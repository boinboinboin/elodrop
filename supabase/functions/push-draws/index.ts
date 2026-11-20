// push-draws: tells members on their phones when a tournament draw on Elodrop first includes the player they've said is
// them (README: "Notifications"). Called by the pipeline as soon as a run has published new draws (pipeline.yml), and
// every 30 minutes through the night by the database's cron job (push-draws, in supabase/migrations/*_push.sql) as a
// fallback; open to anyone (verify_jwt = false), as a call that finds nothing new does nothing.
//
//   1. The tournaments with a draw that aren't over (the data bucket's tournaments/index.json), and of them those whose
//      draw was fetched again since the last look (fetchedAt, remembered in push_seen): only those files are read.
//   2. The members with a device turned on (push_subscriptions) and a player claimed (profiles.player_id) drawn in one of
//      them, not told about that tournament yet (push_sent): one notification each, on each of their devices.
//   3. A device whose subscription is gone (404 or 410 from its push service) is forgotten. A member is marked told once
//      a device took it, or when none could (gone); a push service failing (5xx) leaves it for the next call.
//
// Env (function secrets: `supabase secrets set`): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT ("mailto:…");
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are given by Supabase.
import { drawnPlayers, message, type TournamentFile } from "./draws.ts";
import { sendPush, type Vapid } from "./webpush.ts";

const env = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Set ${name}`);
  return value;
};

Deno.serve(async () => {
  const url = env("SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const vapid: Vapid = { publicKey: env("VAPID_PUBLIC_KEY"), privateKey: env("VAPID_PRIVATE_KEY"), subject: env("VAPID_SUBJECT") };
  const db = async (path: string, init: RequestInit = {}) => {
    const res = await fetch(`${url}/rest/v1/${path}`, { ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...init.headers } });
    const text = await res.text();
    if (!res.ok) throw new Error(`${path}: ${res.status} ${text}`);
    // Writes answer with an empty body
    return text ? JSON.parse(text) : null;
  };

  // 1. The draws not over, and which of them changed since the last look
  const [setting] = await db("settings?key=eq.data_url&select=value");
  const dataUrl: string = setting.value;
  const index = await (await fetch(`${dataUrl}/tournaments/index.json`)).json();
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Oslo" });
  const open = (index.tournaments as (TournamentFile & { fetchedAt: string })[]).filter((t) => !t.cancelled && t.startDate && (t.endDate ?? t.startDate) >= today);
  if (!open.length) return Response.json({ checked: 0 });
  const seen: { cup2000_id: number; fetched_at: string }[] = await db(`push_seen?cup2000_id=in.(${open.map((t) => t.cup2000Id).join(",")})`);
  const seenAt = new Map(seen.map((s) => [s.cup2000_id, s.fetched_at]));
  const changed = open.filter((t) => seenAt.get(t.cup2000Id) !== t.fetchedAt);
  if (!changed.length) return Response.json({ checked: open.length, changed: 0 });

  // 2. The devices, and their members' players
  const devices: { id: number; user_id: string; endpoint: string; p256dh: string; auth: string; lang: "nb" | "en" }[] = await db("push_subscriptions?select=id,user_id,endpoint,p256dh,auth,lang");
  const users = [...new Set(devices.map((d) => d.user_id))];
  const profiles: { user_id: string; player_id: number }[] = users.length ? await db(`profiles?user_id=in.(${users.join(",")})&player_id=not.is.null&select=user_id,player_id`) : [];
  let sent = 0;

  for (const t of changed) {
    // A member still to be told (a push service failed): the tournament is looked at again next time
    let retry = false;
    if (profiles.length) {
      const file: TournamentFile = await (await fetch(`${dataUrl}/tournaments/${t.cup2000Id}.json`)).json();
      const drawn = drawnPlayers(file);
      const told: { user_id: string }[] = await db(`push_sent?cup2000_id=eq.${t.cup2000Id}&select=user_id`);
      const already = new Set(told.map((x) => x.user_id));
      for (const p of profiles) {
        const events = drawn.get(p.player_id);
        if (!events || already.has(p.user_id)) continue;
        let done = false;
        let left = 0;
        for (const d of devices.filter((x) => x.user_id === p.user_id)) {
          const status = await sendPush(d, message(file, events, d.lang), vapid).catch(() => 0);
          if (status >= 200 && status < 300) {
            done = true;
            sent++;
            await db(`push_subscriptions?id=eq.${d.id}`, { method: "PATCH", body: JSON.stringify({ last_sent_at: new Date().toISOString() }) });
          } else if (status === 404 || status === 410) {
            await db(`push_subscriptions?id=eq.${d.id}`, { method: "DELETE" });
          } else left++;
        }
        // Told, or every device gone: not again. A push service failing (left) leaves it for the next call
        if (!done && left > 0) retry = true;
        if (done || left === 0) await db("push_sent", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates" }, body: JSON.stringify({ user_id: p.user_id, cup2000_id: t.cup2000Id }) });
      }
    }
    if (!retry) await db("push_seen", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ cup2000_id: t.cup2000Id, fetched_at: t.fetchedAt }) });
  }
  return Response.json({ checked: open.length, changed: changed.length, sent });
});
