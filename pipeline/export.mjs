// Export the generated data for the website: web-ready JSON files in export/, each small enough
// for the site's data cache (at most 2 MB), uploaded to the data bucket by the pipeline workflow.
// Usage: node export.mjs   (after rate.mjs, gender-gap.mjs, eliteserien*.mjs and upcoming.mjs)
//
// export/
//   meta.json                     generatedAt, pool labels, Eliteserien seasons, tournament links
//   rankings/<pool>.json          ranked (active) players, best first
//   rankings/<pool>-inactive.json players not ranked (no match in the last 12 months; not players of
//                                 the other gender, see rules.mjs rankedIn)
//   clubs.json                    strongest clubs per pool and how club strength is calculated
//   club-history/<NBF id>.json    a club's strength and rank per week
//   players/<id>.json             one player: per pool their rating, weekly history (with the
//                                 number of ranked players each week) and match log, with only the
//                                 RECENT_MATCHES newest matches (`all`) and how many there are (`count`)
//   matches/<id>.json             one player's every match per pool, newest first (for "show all"
//                                 and head to head)
//   search-index.json             [id, name, club, ranked, matches] for the name search
//   upsets/index.json             years, and the newest week's upsets
//   upsets/<year>.json            that year's weeks and their biggest upsets
//   eliteserien.json, eliteserien-<season>.json
//   tournaments/index.json        tournaments with a draw, and the predictions' evaluation
//   tournaments/<Cup2000 id>.json
//   gender-gap.json               how women's ratings compare with men's (gender-gap.mjs)
//   manifest.json                 every file with its size and hash (written last)
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { rankedIn } from "./rules.mjs";

const DIR = new URL(".", import.meta.url).pathname;
const DATA = `${DIR}data`;
const OUT = `${DIR}export`;
const MAX_BYTES = 2 * 1024 * 1024;

const POOLS = {
  men: "Men's singles",
  women: "Women's singles",
  mensDoubles: "Men's doubles",
  womensDoubles: "Women's doubles",
  mixedDoubles: "Mixed doubles",
};
// A player's pools in page order: their own gender's disciplines first
const POOL_ORDER = {
  M: ["men", "mensDoubles", "mixedDoubles", "women", "womensDoubles"],
  K: ["women", "womensDoubles", "mixedDoubles", "men", "mensDoubles"],
};

const read = (file) => JSON.parse(readFileSync(`${DATA}/${file}`, "utf8"));
const manifest = [];
function write(path, value) {
  const body = JSON.stringify(value);
  const bytes = Buffer.byteLength(body);
  if (bytes > MAX_BYTES) throw new Error(`${path} is ${(bytes / 1e6).toFixed(2)} MB, over the 2 MB limit`);
  const file = `${OUT}/${path}`;
  mkdirSync(file.slice(0, file.lastIndexOf("/")), { recursive: true });
  writeFileSync(file, body);
  manifest.push({ path, bytes, hash: createHash("sha1").update(body).digest("hex").slice(0, 16) });
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const ratings = read("ratings.json");
const generatedAt = ratings.generatedAt;

// Rankings and clubs
for (const [pool, players] of Object.entries(ratings.pools)) {
  write(`rankings/${pool}.json`, { generatedAt, pool, players: players.filter((p) => p.rank !== null) });
  // Inactive: not ranked though of the pool's gender (women in men's singles are in neither list)
  write(`rankings/${pool}-inactive.json`, { generatedAt, pool, players: players.filter((p) => p.rank === null && rankedIn(pool, p.gender)) });
}
write("clubs.json", { generatedAt, clubs: ratings.clubs, clubStrength: ratings.clubStrength });
for (const f of readdirSync(`${DATA}/club-history`)) write(`club-history/${f}`, read(`club-history/${f}`));

// Players: each pool's rating with its history (and the number ranked each week) and match log
const rankCounts = read("rank-counts.json");
const WEEK_MS = 7 * 86_400_000;
function withRankCounts(history, pool, gender) {
  if (!history?.ranks?.length) return history ?? null;
  let counts = rankCounts.pools[pool] ?? [];
  if (pool === "mixedDoubles") counts = counts[gender] ?? [];
  const offset = Math.round((Date.parse(history.from) - Date.parse(rankCounts.from ?? history.from)) / WEEK_MS);
  return { ...history, rankCounts: counts.slice(offset, offset + history.ranks.length) };
}
const byPlayer = new Map(); // id -> { pool: rating entry }
for (const [pool, players] of Object.entries(ratings.pools)) {
  for (const p of players) {
    if (!byPlayer.has(p.id)) byPlayer.set(p.id, {});
    byPlayer.get(p.id)[pool] = p;
  }
}
const optional = (file) => (existsSync(`${DATA}/${file}`) ? read(file) : {});
// A player page shows this many matches per pool; the rest are loaded when asked for
const RECENT_MATCHES = 20;
for (const [id, entries] of byPlayer) {
  const history = optional(`history/${id}.json`);
  const matches = optional(`matches/${id}.json`);
  const gender = Object.values(entries)[0].gender ?? "M";
  const pools = {};
  for (const pool of POOL_ORDER[gender] ?? POOL_ORDER.M) {
    const p = entries[pool];
    if (!p) continue;
    const log = matches[pool];
    const matchLog = log ? { ...log, all: log.all.slice(0, RECENT_MATCHES), count: log.all.length } : null;
    pools[pool] = { ...p, label: POOLS[pool], history: withRankCounts(history[pool], pool, p.gender), matchLog };
  }
  const first = Object.values(pools)[0];
  // No generatedAt here: a file whose content hasn't changed isn't uploaded again (R2 counts writes)
  write(`players/${id}.json`, { id, name: first.name, club: first.club, pools });
  write(`matches/${id}.json`, { id, pools: Object.fromEntries(Object.keys(pools).map((pool) => [pool, matches[pool]?.all ?? []])) });
}

// Name search: every player once, with whether they are ranked anywhere and their matches
const search = [...byPlayer].map(([id, entries]) => {
  const list = Object.values(entries);
  return [id, list[0].name, list[0].club ?? null, list.some((p) => p.rank !== null) ? 1 : 0, list.reduce((s, p) => s + p.matches, 0)];
});
write("search-index.json", { generatedAt, players: search });

// Upsets by year
const upsets = optional("upsets.json");
const years = new Map();
for (const w of upsets.weeks ?? []) {
  const year = w.week.slice(0, 4);
  if (!years.has(year)) years.set(year, []);
  years.get(year).push(w);
}
for (const [year, weeks] of years) write(`upsets/${year}.json`, { year, weeks });
write("upsets/index.json", { generatedAt: upsets.generatedAt ?? generatedAt, years: [...years.keys()], latest: upsets.weeks?.[0] ?? null });

// Eliteserien: this season's strengths and each season in review
const eliteserienSeasons = readdirSync(DATA)
  .map((f) => f.match(/^eliteserien-(\d{4}-\d{2})\.json$/)?.[1])
  .filter(Boolean)
  .sort()
  .reverse();
if (existsSync(`${DATA}/eliteserien.json`)) write("eliteserien.json", read("eliteserien.json"));
for (const season of eliteserienSeasons) write(`eliteserien-${season}.json`, read(`eliteserien-${season}.json`));

// Tournaments with a draw
const tournaments = optional("upcoming.json");
write("tournaments/index.json", tournaments);
if (existsSync(`${DATA}/upcoming`)) {
  for (const f of readdirSync(`${DATA}/upcoming`).filter((f) => f.endsWith(".json"))) write(`tournaments/${f}`, read(`upcoming/${f}`));
}

if (existsSync(`${DATA}/gender-gap.json`)) write("gender-gap.json", read("gender-gap.json"));

write("meta.json", {
  generatedAt,
  pools: POOLS,
  eliteserien: { current: optional("eliteserien.json").season ?? null, seasons: eliteserienSeasons },
  // badmintonportalen tournament id -> Cup2000 id, for linking matches to tournament pages
  tournamentLinks: Object.fromEntries((tournaments.tournaments ?? []).filter((t) => t.portalenId).map((t) => [t.portalenId, t.cup2000Id])),
  players: byPlayer.size,
});

const total = manifest.reduce((s, f) => s + f.bytes, 0);
writeFileSync(`${OUT}/manifest.json`, JSON.stringify({ generatedAt, files: manifest }));
const biggest = manifest.reduce((a, b) => (b.bytes > a.bytes ? b : a));
console.log(`Exported ${manifest.length} files, ${(total / 1e6).toFixed(0)} MB (largest ${biggest.path}, ${(biggest.bytes / 1e6).toFixed(2)} MB).`);
