// Refreshes pages on the site (web/app/api/revalidate). Every page refreshed is an ISR write when it is next visited,
// and crawlers visit nearly every page, so only what changed is refreshed.
// Usage (env SITE_URL, REVALIDATE_SECRET):
//   node refresh-site.mjs --log <rclone JSON log> [--prefix tournaments/]
//     After an upload to the data bucket: only the pages reading a file that was uploaded or deleted (each file's own
//     cache tag), so old team matches, finished tournaments and players whose data didn't change stay cached. The
//     log: `rclone sync … -v --use-json-log --log-file <log>`, its "Copied …" and "Deleted" lines. --prefix: the
//     folder synced, when it isn't the export's root (a draws run uploads only export/tournaments). Without a
//     readable log, everything.
//   node refresh-site.mjs --all
//     Everything (elo-data): after a run whose refresh failed, when which files it uploaded is no longer known.
//   node refresh-site.mjs --tags <tag> …
//     Those cache tags (sanity:clubs and so on: sanity-revisions.mjs).
// Fails unless the site answers that it revalidated.
import { existsSync, readFileSync } from "node:fs";

const args = process.argv.slice(2);
const site = process.env.SITE_URL;
const secret = process.env.REVALIDATE_SECRET;
if (!site || !secret) throw new Error("Set SITE_URL and REVALIDATE_SECRET");
const option = (name) => (args.includes(name) ? (args[args.indexOf(name) + 1] ?? "") : null);
/** The most files the site takes per call */
const CHUNK = 1000;

/** The files rclone uploaded or deleted, by their path in the bucket */
function changedFiles(text, prefix = "") {
  const files = new Set();
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    const msg = String(entry.msg ?? "");
    if (typeof entry.object === "string" && entry.object.endsWith(".json") && (msg.startsWith("Copied") || msg === "Deleted")) files.add(`${prefix}${entry.object}`);
  }
  return [...files].sort();
}

/** POST to the site's revalidate route, following a redirect (elodrop.no → www.elodrop.no) with the header kept */
async function revalidate(query, body) {
  let url = new URL(`/api/revalidate${query}`, site);
  for (let hop = 0; hop < 3; hop++) {
    const res = await fetch(url, {
      method: "POST",
      redirect: "manual",
      headers: { Authorization: `Bearer ${secret}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      url = new URL(location, url);
      continue;
    }
    const answer = await res.text();
    console.log(answer);
    if (!res.ok || !answer.includes('"revalidated":true')) throw new Error(`The site didn't revalidate (${res.status})`);
    return;
  }
  throw new Error("Too many redirects");
}

if (args.includes("--all")) {
  console.log("Refreshing everything");
  await revalidate("?tag=elo-data");
} else if (args.includes("--tags")) {
  const tags = args.slice(args.indexOf("--tags") + 1).filter((t) => !t.startsWith("--"));
  for (const tag of tags) await revalidate(`?tag=${encodeURIComponent(tag)}`);
} else {
  const log = option("--log");
  const files = log && existsSync(log) ? changedFiles(readFileSync(log, "utf8"), option("--prefix") ?? "") : null;
  if (files === null) {
    console.log("No upload log: refreshing everything");
    await revalidate("?tag=elo-data");
  } else if (!files.length) {
    console.log("No files uploaded: nothing to refresh");
  } else {
    const areas = {};
    for (const f of files) areas[f.split("/")[0]] = (areas[f.split("/")[0]] ?? 0) + 1;
    console.log(`Refreshing ${files.length} files: ${Object.entries(areas).map(([a, n]) => `${a} ${n}`).join(", ")}`);
    for (let i = 0; i < files.length; i += CHUNK) await revalidate("", { files: files.slice(i, i + CHUNK) });
  }
}
