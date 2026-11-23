// Top-10 racing chart export: node export-top10.mjs ../pipeline  (writes pipeline/data/racing/*.csv)
import { readFileSync, readdirSync, writeFileSync, mkdirSync, statSync } from "node:fs";

const { tidyName } = await import(`${process.argv[2]}/names.mjs`);

const DIR = process.argv[2];
const OUT = `${DIR}/data/racing`;
const read = (f) => JSON.parse(readFileSync(`${DIR}/data/${f}`, "utf8"));
const players = new Map(read("players.json").map((p) => [p.id, p]));
const { from: FIRST } = read("rank-counts.json");

const DAY = 86400000;
const addDays = (d, n) => new Date(Date.parse(d + "T00:00:00Z") + n * DAY).toISOString().slice(0, 10);
const weeksBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / (7 * DAY));

const LISTS = ["men", "women", "mensDoubles", "womensDoubles", "mixedDoubles-men", "mixedDoubles-women"];
// Gender as rate.mjs: the register's, else from mixed doubles partners (the opposite of most partners' registered
// gender), else women if they played a women's pool
const matchesOf = (id) => JSON.parse(readFileSync(`${DIR}/data/matches/${id}.json`, "utf8"));
const inferred = new Map();
function genderOf(id, history) {
  const registered = players.get(id)?.gender;
  if (registered) return registered;
  if (!inferred.has(id)) {
    const votes = { M: 0, K: 0 };
    for (const m of matchesOf(id).mixedDoubles?.all ?? []) {
      const g = players.get(m.partner?.id)?.gender;
      if (g) votes[g === "M" ? "K" : "M"]++;
    }
    inferred.set(id, votes.M !== votes.K ? (votes.M > votes.K ? "M" : "K") : history.women || history.womensDoubles ? "K" : null);
  }
  return inferred.get(id);
}
const listOf = (pool, id, history) =>
  pool !== "mixedDoubles" ? pool : { M: "mixedDoubles-men", K: "mixedDoubles-women" }[genderOf(id, history)] ?? null;

// per list: week index -> [{rank, id, rating, club}], and per list per player: week index -> rating (null when unranked)
const top = Object.fromEntries(LISTS.map((l) => [l, new Map()]));
const series = Object.fromEntries(LISTS.map((l) => [l, new Map()]));
let lastWeek = 0;

// rate.mjs doesn't delete the files of ids since merged into another (same-players.txt): only read the
// files written by the latest run (within 10 minutes before rank-counts.json, which is written right after them)
const written = statSync(`${DIR}/data/rank-counts.json`).mtimeMs - 10 * 60000;
let stale = 0;
for (const f of readdirSync(`${DIR}/data/history`)) {
  if (statSync(`${DIR}/data/history/${f}`).mtimeMs < written) { stale++; continue; }
  const id = +f.replace(".json", "");
  const history = JSON.parse(readFileSync(`${DIR}/data/history/${f}`, "utf8"));
  for (const [pool, h] of Object.entries(history)) {
    const list = listOf(pool, id, history);
    if (!list || !h.ranks) continue;
    const offset = weeksBetween(FIRST, h.from);
    const length = Math.max(h.ratings.length, h.ranks.length);
    lastWeek = Math.max(lastWeek, offset + length - 1);
    let club = 0;
    const ratings = [];
    let everTop = false;
    for (let i = 0; i < length; i++) {
      while (h.clubs[club + 1]?.[0] <= i) club++;
      const rank = h.ranks[i] ?? null;
      const rating = h.ratings[i] ?? h.ratings.at(-1);
      ratings.push(rank === null ? null : rating);
      if (rank !== null && rank <= 10) {
        everTop = true;
        const week = offset + i;
        if (!top[list].has(week)) top[list].set(week, []);
        top[list].get(week).push({ rank, id, rating, club: h.clubs[club]?.[1] ?? "" });
      }
    }
    if (everTop) series[list].set(id, { offset, ratings });
  }
}

const weekEnd = (w) => addDays(FIRST, w * 7 + 6);
const csv = (rows) => rows.map((r) => r.map((v) => (v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(",")).join("\n") + "\n";
const names = new Map();
function name(id) {
  // As the site writes it (names.mjs: case, the register's notes after a name left out)
  if (players.has(id)) return tidyName(players.get(id).name);
  if (!names.has(id)) {
    const own = matchesOf(id);
    const opponent = Object.values(own).flatMap((p) => p.all ?? []).find((m) => m.opponents?.[0]?.id)?.opponents[0].id;
    const re = new RegExp(`"id":${id},"name":"((?:[^"\\\\]|\\\\.)*)"`);
    const hit = opponent && readFileSync(`${DIR}/data/matches/${opponent}.json`, "utf8").match(re);
    names.set(id, hit ? JSON.parse(`"${hit[1]}"`) : "");
  }
  return names.get(id);
}

mkdirSync(OUT, { recursive: true });

// Long file, and per-player stats
const long = [["week_end", "list", "rank", "id", "name", "club", "rating"]];
const stats = new Map();
const problems = [];
for (const list of LISTS) {
  for (let w = 0; w <= lastWeek; w++) {
    const rows = (top[list].get(w) ?? []).sort((a, b) => a.rank - b.rank);
    const ranks = rows.map((r) => r.rank);
    if (new Set(ranks).size !== ranks.length || ranks.some((r, i) => r !== i + 1)) problems.push(`${list} ${weekEnd(w)}: ranks ${ranks.join(" ")}`);
    for (const r of rows) {
      long.push([weekEnd(w), list, r.rank, r.id, name(r.id), r.club, r.rating]);
      const s = stats.get(r.id) ?? { lists: new Set(), best: 99, weeks: 0, first: weekEnd(w) };
      s.lists.add(list);
      s.best = Math.min(s.best, r.rank);
      s.weeks++;
      if (weekEnd(w) < s.first) s.first = weekEnd(w);
      stats.set(r.id, s);
    }
  }
}
writeFileSync(`${OUT}/top10-long.csv`, csv(long));

// Wide files per list: one row per player ever in that list's top 10, blank when inactive
const weeks = Array.from({ length: lastWeek + 1 }, (_, w) => weekEnd(w));
for (const list of LISTS) {
  const rows = [["id", "name", "club", "image", ...weeks]];
  for (const [id, { offset, ratings }] of series[list]) {
    const cells = weeks.map((_, w) => (w >= offset && w - offset < ratings.length ? ratings[w - offset] : null));
    rows.push([id, name(id), players.get(id)?.club ?? "", "", ...cells]);
  }
  writeFileSync(`${OUT}/top10-${list}-wide.csv`, csv(rows));
}

// Players ever in a top 10
const plist = [["id", "name", "club", "lists", "best_rank", "top10_weeks_all_lists", "first_week_in_top10", "profile_url", "image"]];
for (const [id, s] of [...stats].sort((a, b) => b[1].weeks - a[1].weeks))
  plist.push([id, name(id), players.get(id)?.club ?? "", [...s.lists].join("; "), s.best, s.weeks, s.first, `https://elodrop.no/players/${id}`, ""]);
writeFileSync(`${OUT}/top10-players.csv`, csv(plist));

console.log(`weeks ${weeks[0]} .. ${weeks.at(-1)} (${weeks.length}), long rows ${long.length - 1}, players ${stats.size}`);
for (const l of LISTS) console.log(l, "players in top 10:", series[l].size);
console.log(`stale history files skipped: ${stale}`);
console.log(`rank problems: ${problems.length}`);
console.log(problems.slice(0, 10).join("\n"));
