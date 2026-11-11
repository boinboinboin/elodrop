// Export the generated data for the website: web-ready JSON files in export/, each small enough
// for the site's data cache (at most 2 MB), uploaded to the data bucket by the pipeline workflow.
// Usage: node export.mjs   (after rate.mjs, gender-gap.mjs, eliteserien*.mjs, team-matches.mjs and upcoming.mjs)
//
// export/
//   meta.json                     generatedAt (ratings), updatedAt (this export), pool labels,
//                                 Eliteserien seasons, tournament links
//   rankings/<pool>.json          ranked (active) players, best first
//   rankings/<pool>-inactive.json players not ranked (no match in the last 12 months; not players of
//                                 the other gender, see rules.mjs rankedIn)
//   clubs.json                    strongest clubs per pool and how club strength is calculated
//   rankings/combined-<men|women>.json  the combined rankings: singles, doubles and mixed doubles
//                                 together, players ranked in all three, best first
//   junior/<pool>.json            the junior rankings (U19, from junior matches only), ranked
//                                 players, best first; junior/combined-<men|women>.json likewise
//   club-history/<NBF id>.json    a club's strength and rank per week
//   players/<id>.json             one player (with their birth year): per pool their rating, weekly history (with the
//                                 number of ranked players each week) and match log, with only the
//                                 RECENT_MATCHES newest matches (`all`) and how many there are (`count`),
//                                 and their rivals over all disciplines, in singles and in doubles, and
//                                 the badges they have earned (achievements.mjs)
//   matches/<id>.json             one player's every match per pool, newest first (for "show all"
//                                 and head to head)
//   achievements.json             per badge: how many players have earned it (out of `players`, everyone with a
//                                 rating), how many times, and the newest awards (achievements.mjs)
//   search-index.json             [id, name, club, ranked, matches, lastPlayed] for the name search (and the sitemap's dates)
//   upsets/index.json             years, and the newest week's upsets
//   upsets/<year>.json            that year's weeks and their biggest upsets
//   eliteserien.json, eliteserien-<season>.json, eliteserien-ten-matches.json
//   team-matches/index.json       seasons with their divisions and weeks, and the newest week's team matches (team-matches.mjs)
//   team-matches/weeks/<Monday>.json  that week's team matches
//   team-matches/<matchId>.json   one team match with its individual matches
//   team-matches/divisions/<season>/<slug>.json  one division: its groups' team matches, standings and power rankings
//   tournaments/index.json        tournaments with a draw, and the predictions' evaluation
//   tournaments/<Cup2000 id>.json
//   gender-gap.json               how women's ratings compare with men's (gender-gap.mjs)
//   manifest.json                 every file with its size and hash (written last)
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { achievements, achievementStats } from "./achievements.mjs";
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
// Junior rankings (U19, from junior matches only: rate.mjs), ranked players only
const junior = existsSync(`${DATA}/junior.json`) ? read("junior.json") : null;
for (const [pool, players] of Object.entries(junior?.pools ?? {})) write(`junior/${pool}.json`, { generatedAt, pool, season: junior.season, bornFrom: junior.bornFrom, players });
// Combined rankings (singles, doubles and mixed doubles together: rate.mjs), men and women, of
// everyone and of the juniors
const combined = existsSync(`${DATA}/combined.json`) ? read("combined.json") : null;
for (const [gender, name] of [["M", "men"], ["K", "women"]]) {
  if (!combined) break;
  write(`rankings/combined-${name}.json`, { generatedAt, gender, players: combined.senior[gender] });
  write(`junior/combined-${name}.json`, { generatedAt, gender, bornFrom: junior?.bornFrom ?? null, players: combined.junior[gender] });
}
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
// From the players' profiles on badmintonportalen (fetch-birth-years.mjs); null if not shown
const birthYears = optional("birth-years.json");
// A player page shows this many matches per pool; the rest are loaded when asked for
const RECENT_MATCHES = 20;
// The badges each player has earned, newest first (achievements.mjs)
const awards = achievements();
// Tournaments with a draw, and their pages: badmintonportalen tournament id -> Cup2000 id
const tournaments = optional("upcoming.json");
const tournamentLinks = new Map((tournaments.tournaments ?? []).filter((t) => t.portalenId).map((t) => [String(t.portalenId), t.cup2000Id]));
/**
 * The tournament pages a player's matches and badges link to: only their own tournaments, so a tournament page added
 * changes only its players' files (and only their pages are built again), not every player's
 */
function playerTournamentLinks(matches, playerAwards) {
  const links = {};
  const add = (id) => {
    if (id != null && tournamentLinks.has(String(id))) links[id] = tournamentLinks.get(String(id));
  };
  for (const pool of Object.keys(POOLS)) for (const m of matches[pool]?.all ?? []) add(m.key?.match(/^T(\d+)/)?.[1]);
  for (const a of playerAwards) add(a.tournamentId);
  return Object.fromEntries(Object.entries(links).sort(([a], [b]) => a - b));
}
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
  const playerAwards = awards.get(id) ?? [];
  write(`players/${id}.json`, { id, name: first.name, club: first.club, birthYear: birthYears[id] ?? null, rivals: matches.rivals ?? [], singlesRivals: matches.singlesRivals ?? [], doublesRivals: matches.doublesRivals ?? [], achievements: playerAwards, tournamentLinks: playerTournamentLinks(matches, playerAwards), pools });
  write(`matches/${id}.json`, { id, pools: Object.fromEntries(Object.keys(pools).map((pool) => [pool, matches[pool]?.all ?? []])) });
}

// The achievements page: per badge how many players have earned it, out of every player with a rating, and the newest
// awards
const named = new Map([...byPlayer].map(([id, entries]) => [id, { name: Object.values(entries)[0].name, club: Object.values(entries)[0].club }]));
write("achievements.json", achievementStats(awards, named));

// Name search: every player once, with whether they are ranked anywhere, their matches and the day
// of their last match (for the sitemap: when their page last changed with a result)
const search = [...byPlayer].map(([id, entries]) => {
  const list = Object.values(entries);
  const lastPlayed = list.map((p) => p.lastPlayed ?? "").sort().at(-1) || null;
  return [id, list[0].name, list[0].club ?? null, list.some((p) => p.rank !== null) ? 1 : 0, list.reduce((s, p) => s + p.matches, 0), lastPlayed];
});
write("search-index.json", { generatedAt, players: search });

// Upsets by year
const upsets = optional("upsets.json");
// An upset in a tournament with a page (a draw) links to it: the tournament's Cup2000 id. Only the upsets' files
// change when a tournament gets a page, not every page's
const withTournament = (u) => {
  const cup2000Id = tournamentLinks.get(u.key?.match(/^T(\d+)/)?.[1]);
  return cup2000Id ? { ...u, cup2000Id } : u;
};
for (const w of upsets.weeks ?? []) w.matches = w.matches.map(withTournament);
const years = new Map();
for (const w of upsets.weeks ?? []) {
  const year = w.week.slice(0, 4);
  if (!years.has(year)) years.set(year, []);
  years.get(year).push(w);
}
for (const [year, weeks] of years) write(`upsets/${year}.json`, { year, weeks });
write("upsets/index.json", { generatedAt: upsets.generatedAt ?? generatedAt, years: [...years.keys()], latest: upsets.weeks?.[0] ?? null });

// Eliteserien: this season's strengths, each season in review and the 10-match test
const eliteserienSeasons = readdirSync(DATA)
  .map((f) => f.match(/^eliteserien-(\d{4}-\d{2})\.json$/)?.[1])
  .filter(Boolean)
  .sort()
  .reverse();
// (with the seasons in review, so its page reads no file that changes every run: meta.json)
if (existsSync(`${DATA}/eliteserien.json`)) write("eliteserien.json", { ...read("eliteserien.json"), reviews: eliteserienSeasons });
if (existsSync(`${DATA}/eliteserien-ten-matches.json`)) write("eliteserien-ten-matches.json", read("eliteserien-ten-matches.json"));
for (const season of eliteserienSeasons) write(`eliteserien-${season}.json`, read(`eliteserien-${season}.json`));

// Team matches: the index, each week and each team match
if (existsSync(`${DATA}/team-matches`)) {
  for (const f of readdirSync(`${DATA}/team-matches`, { recursive: true }).filter((f) => f.endsWith(".json"))) write(`team-matches/${f}`, read(`team-matches/${f}`));
}

// Tournaments with a draw
write("tournaments/index.json", tournaments);
if (existsSync(`${DATA}/upcoming`)) {
  for (const f of readdirSync(`${DATA}/upcoming`).filter((f) => f.endsWith(".json"))) write(`tournaments/${f}`, read(`upcoming/${f}`));
}

if (existsSync(`${DATA}/gender-gap.json`)) write("gender-gap.json", read("gender-gap.json"));

write("meta.json", {
  generatedAt,
  // When this export was made: the end of the run's fetching, rating and building (the footer's
  // "updated"); only the upload to the data bucket comes after it
  updatedAt: new Date().toISOString(),
  pools: POOLS,
  eliteserien: { current: optional("eliteserien.json").season ?? null, seasons: eliteserienSeasons },
  // badmintonportalen tournament id -> Cup2000 id, for linking matches to tournament pages (the player pages use their
  // own, in players/<id>.json)
  tournamentLinks: Object.fromEntries(tournamentLinks),
  players: byPlayer.size,
});

const total = manifest.reduce((s, f) => s + f.bytes, 0);
writeFileSync(`${OUT}/manifest.json`, JSON.stringify({ generatedAt, files: manifest }));
const biggest = manifest.reduce((a, b) => (b.bytes > a.bytes ? b : a));
console.log(`Exported ${manifest.length} files, ${(total / 1e6).toFixed(0)} MB (largest ${biggest.path}, ${(biggest.bytes / 1e6).toFixed(2)} MB).`);
