// Hashes of what a rebuild depends on, so the nightly workflow does only the work that's needed:
// nothing when nothing new was fetched, just the tournament draws when only they changed, or a full
// rebuild. Usage: node fingerprint.mjs → "results=<hash>" and "draws=<hash>" lines.
//
// results: the fetched results (tournaments, team matches), the official ranking, the player
// register and clubs, and the pipeline itself (code, corrections, rosters).
// draws: the tournament draws from Cup2000 (data/upcoming/raw) and the ranking lists they're seeded
// by (data/ranking/seeding/<version>, upcoming.mjs).
// Fields that only record when something was fetched (fetchedAt, generatedAt) are left out, so
// fetching the same data again gives the same hash.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";

const DIR = new URL(".", import.meta.url).pathname;
const DATA = `${DIR}data`;
const TIMESTAMPS = new Set(["fetchedAt", "generatedAt"]);

const files = (dir, filter) => (existsSync(dir) ? readdirSync(dir).filter(filter).sort().map((f) => `${dir}/${f}`) : []);
const json = (dir) => files(`${DATA}/${dir}`, (f) => f.endsWith(".json"));
const withoutTimestamps = (key, value) => (TIMESTAMPS.has(key) ? undefined : value);

function fingerprint(dataFiles, codeFiles = []) {
  const hash = createHash("sha256");
  for (const file of dataFiles) hash.update(file.slice(DIR.length)).update(JSON.stringify(JSON.parse(readFileSync(file, "utf8")), withoutTimestamps));
  for (const file of codeFiles) hash.update(file.slice(DIR.length)).update(readFileSync(file));
  return hash.digest("hex");
}

const results = fingerprint(
  [...json("portalen"), ...json("league"), ...json("ranking"), ...["players.json", "clubs.json", "tournaments.json"].map((f) => `${DATA}/${f}`).filter(existsSync)],
  files(DIR.replace(/\/$/, ""), (f) => /\.(mjs|txt)$/.test(f) && statSync(`${DIR}${f}`).isFile()),
);
const draws = fingerprint([...json("upcoming/raw"), ...files(`${DATA}/ranking/seeding`, () => true).flatMap((dir) => files(dir, (f) => f.endsWith(".json")))]);
console.log(`results=${results}\ndraws=${draws}`);
