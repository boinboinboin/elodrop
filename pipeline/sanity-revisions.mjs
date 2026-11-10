// What changed in the Studio since the last check, as the cache tags to refresh on the site (web/data/sanityTags.ts):
// the clubs (on nearly every page), the badges (every player page) and the halls (tournament and team match pages)
// as a whole, when any of their documents was published, added or deleted; and each tournament on its own. The
// nightly run refreshes only these, once per change: the Sanity webhook leaves the clubs, badges and halls to it
// (web/app/api/revalidate), and refreshes a tournament's pages at once, so for tournaments this is the safety net for
// a webhook call that didn't arrive (it refreshes only that tournament's pages again).
// Usage: node sanity-revisions.mjs <last check's state.json> <new state.json> → the tags to refresh, one per line
//   (none on the first run, which only remembers the state). The new state is written to its own file, to be kept
//   once the refresh worked. Env SANITY_PROJECT_ID, optionally SANITY_DATASET (production) and SANITY_TOKEN.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const [lastFile, nextFile] = process.argv.slice(2);
if (!lastFile || !nextFile) throw new Error("Usage: node sanity-revisions.mjs <last.json> <next.json>");
const project = process.env.SANITY_PROJECT_ID;
const dataset = process.env.SANITY_DATASET || "production";
const token = process.env.SANITY_TOKEN;
if (!project) throw new Error("Set SANITY_PROJECT_ID");

async function query(groq) {
  const url = `https://${project}.api.sanity.io/v2025-02-19/data/query/${dataset}?query=${encodeURIComponent(groq)}`;
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error(`Sanity: ${res.status}`);
  return (await res.json()).result;
}
const published = (type) => `*[_type == "${type}" && !(_id in path("drafts.**"))] | order(_id)`;
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

/** Kinds refreshed as a whole: their state's key → [document type, cache tag] */
const WHOLE = { clubs: ["club", "sanity:clubs"], badges: ["badge", "sanity:badges"], venues: ["venue", "sanity:venues"] };
const next = {};
for (const [key, [type]] of Object.entries(WHOLE)) next[key] = hash(await query(`${published(type)} { _id, _rev }`));
// Each tournament by its document id: its Cup2000 id (its pages' tag) and revision
next.tournaments = Object.fromEntries((await query(`${published("tournament")} { _id, _rev, cup2000Id }`)).map((t) => [t._id, [t.cup2000Id ?? null, t._rev]]));
writeFileSync(nextFile, JSON.stringify(next));

const last = existsSync(lastFile) ? JSON.parse(readFileSync(lastFile, "utf8")) : null;
if (last) {
  const tags = new Set();
  for (const [key, [, tag]] of Object.entries(WHOLE)) if (last[key] !== next[key]) tags.add(tag);
  const before = last.tournaments ?? {};
  for (const id of new Set([...Object.keys(before), ...Object.keys(next.tournaments)])) {
    const [was, now] = [before[id], next.tournaments[id]];
    if (was?.[1] === now?.[1]) continue;
    // Changed, added or deleted: its own pages (by the Cup2000 id it has, or had), else every tournament's
    const cup2000Id = now?.[0] ?? was?.[0];
    tags.add(Number.isInteger(cup2000Id) ? `sanity:tournaments:${cup2000Id}` : "sanity:tournaments");
  }
  for (const tag of tags) console.log(tag);
}
