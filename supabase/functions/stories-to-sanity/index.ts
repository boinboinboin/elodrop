// stories-to-sanity: puts the match stories members send in (story_submissions, the stories page) into the Sanity
// Studio as drafts for the owner, and follows what the owner did with them. Called by the database as soon as one is
// sent in (the trigger story_to_studio) and every hour (the cron job stories-to-sanity), both in
// supabase/migrations/*_match_stories.sql; open to anyone (verify_jwt = false), as a call that finds nothing to do does
// nothing.
//
//   1. Each pending story becomes a draft in the Studio (draft.ts; created only if it isn't there, so a story is never
//      sent twice), with its author's username when they said to show it; then it's `sent`.
//   2. Each sent story whose document the owner has published becomes `published`; one with neither a draft nor a
//      published document (the owner deleted the draft) becomes `declined`.
//
// Env (function secrets: `supabase secrets set`): SANITY_PROJECT_ID, SANITY_DATASET (production when unset) and
// SANITY_WRITE_TOKEN (an Editor token); SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are given by Supabase.
import { draft, storyId, type Submission } from "./draft.ts";

const env = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Set ${name}`);
  return value;
};

Deno.serve(async () => {
  const url = env("SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const project = env("SANITY_PROJECT_ID");
  const dataset = Deno.env.get("SANITY_DATASET") || "production";
  const token = env("SANITY_WRITE_TOKEN");
  const db = async (path: string, init: RequestInit = {}) => {
    const res = await fetch(`${url}/rest/v1/${path}`, { ...init, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...init.headers } });
    const text = await res.text();
    if (!res.ok) throw new Error(`${path}: ${res.status} ${text}`);
    return text ? JSON.parse(text) : null;
  };
  const sanity = async (path: string, init: RequestInit = {}) => {
    const res = await fetch(`https://${project}.api.sanity.io/v2025-02-19/data/${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers } });
    const text = await res.text();
    if (!res.ok) throw new Error(`Sanity ${path.split("?")[0]}: ${res.status} ${text}`);
    return JSON.parse(text);
  };
  const setStatus = (ids: number[], status: string) => (ids.length ? db(`story_submissions?id=in.(${ids.join(",")})`, { method: "PATCH", body: JSON.stringify({ status }) }) : null);

  // 1. The pending stories into the Studio, with their authors' usernames
  const pending: Submission[] = await db("story_submissions?status=eq.pending&order=id&limit=50&select=id,author,match_key,match_summary,story,source_name,source_url,show_name,lang");
  if (pending.length) {
    const authors = [...new Set(pending.map((s) => s.author).filter(Boolean))];
    const profiles: { user_id: string; nickname: string }[] = authors.length ? await db(`profiles?user_id=in.(${authors.join(",")})&select=user_id,nickname`) : [];
    const nickname = new Map(profiles.map((p) => [p.user_id, p.nickname]));
    const mutations = pending.map((s) => ({ createIfNotExists: draft(s, s.author ? (nickname.get(s.author) ?? null) : null) }));
    await sanity(`mutate/${dataset}?returnIds=true`, { method: "POST", body: JSON.stringify({ mutations }) });
    await setStatus(pending.map((s) => s.id), "sent");
  }

  // 2. What the owner did with the ones in the Studio: published, or the draft deleted
  const sent: { id: number }[] = await db("story_submissions?status=eq.sent&select=id");
  if (sent.length) {
    const ids = sent.flatMap((s) => [storyId(s.id), `drafts.${storyId(s.id)}`]);
    const query = encodeURIComponent(`*[_id in $ids]._id`);
    const found = new Set<string>((await sanity(`query/${dataset}?query=${query}&$ids=${encodeURIComponent(JSON.stringify(ids))}&perspective=raw`)).result);
    await setStatus(sent.filter((s) => found.has(storyId(s.id))).map((s) => s.id), "published");
    await setStatus(sent.filter((s) => !found.has(storyId(s.id)) && !found.has(`drafts.${storyId(s.id)}`)).map((s) => s.id), "declined");
  }

  return Response.json({ sent: pending.length, checked: sent.length });
});
