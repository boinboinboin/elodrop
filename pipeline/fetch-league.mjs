// Fetch singles and doubles games from team matches (league play) on badmintonportalen.no.
// Usage: node fetch-league.mjs [--refetch] [--dry-run] [--season 2024] [--limit 5] [--list-groups] [--all] [--venues] [--standings] [--golden]
//
// GetLeagueStanding is one method with "subpages":
//   1: leagues for season + age group + region -> groups
//   2: a group's official standings
//   4: all ties (team matches) in a group
//   5: one tie, with its individual games (1. HS, 2. HS, 1. DS, 1. HD, 1. MD, ...)
// Writes data/league/<season>-<groupId>.json per group. A group still being played (the current
// season, with unplayed ties) is saved with the ties played so far, `complete: false` and the
// schedule of the rest (`schedule`, with dates). It's fetched again only when due: a tie dated today
// or in the last LATE_DAYS days isn't in yet (results are sometimes registered late), or with --all
// (the weekly sweep, which also catches postponed ties). Ties already saved with the same score keep
// their games, so only new ties are fetched. Complete groups are skipped once saved.
// Each tie has its hall (`venue`, free text: "Klæbu idrettshall") and the club arranging it when it
// isn't the home team (`organiser`; null: the home team), both from subpage 4. --venues adds them to
// the groups saved before they were fetched (one request per group; their games are kept).
// Each group has its official standings (`standings`, subpage 2), fetched with it; --standings adds
// them to the groups saved before they were (one request per group).
// A tie decided by a golden set has it (`goldenSet`); --golden adds it to the ties saved before golden
// sets were fetched: the ones whose games are level but whose score isn't (one request per tie;
// `goldenSet: null` when the page has none, so it isn't asked again).
// The season's list of groups (180 requests: every region and age group) is kept in
// data/cache/league-groups-<season>.json and listed again with --list-groups (weekly) or if missing.
import { readdir, readFile, writeFile, mkdir, appendFile } from "node:fs/promises";
import { call, text } from "./portalen.mjs";

const DIR = new URL(".", import.meta.url).pathname;
const OUT = `${DIR}data/league`;
const CACHE = `${DIR}data/cache`;
// How long after a tie's date to keep looking for its result
const LATE_DAYS = 14;
const ERRORS = `${DIR}data/league-errors.log`;
const FIRST_SEASON = 2013;
const CONCURRENCY = 2;
// From the dropdowns on /NBF/HoldTurnering/Stilling/
const REGIONS = {
  200001: "Norges Badminton Forbund",
  200002: "Badmintonkretsen Sør",
  200003: "Badmintonkretsen Vest",
  200004: "Finnmark Badmintonkrets",
  200005: "Innlandet Badmintonkrets",
  200006: "Hålogaland Badmintonkrets",
  200007: "Midtnorsk Badmintonkrets Nord",
  200008: "Midtnorsk Badmintonkrets Sør",
  200009: "Oslofjorden Badmintonkrets",
  200011: "VBT Badmintonkrets",
};
const AGE_GROUPS = {
  2001: "SEN", 2002: "U9", 2003: "U11", 2004: "U13", 2005: "U15", 2006: "U17", 2007: "U19",
  2008: "O35", 2009: "O40", 2010: "O45", 2011: "O50", 2012: "O55", 2013: "O60", 2014: "O65",
  2015: "O70", 2016: "O75", 2018: "O80", 2017: "Åpen",
};
// Game codes in a tie -> the same discipline names as tournaments use.
const DISCIPLINES = { HS: "MensSingles", DS: "WomensSingles", HD: "MensDoubles", DD: "WomensDoubles", MD: "MixedDoubles" };

const currentSeason = () => {
  const now = new Date();
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
};

const standing = (subPage, { season, groupId = "", ageGroupId = "", regionId = "", matchId = "" }) =>
  call("GetLeagueStanding", {
    subPage: String(subPage),
    seasonID: `200${season}`,
    leagueGroupID: String(groupId),
    ageGroupID: String(ageGroupId),
    regionID: String(regionId),
    leagueGroupTeamID: "",
    leagueMatchID: String(matchId),
    clubID: "",
    playerID: "",
  }).then((r) => r.html ?? "");

// Subpage 1: <tr class='divisionrow'><td><h3>Eliteserien 2025/2026</h3></td></tr>
//            <tr class='grouprow'><td><a onclick="return ShowStanding('2', '2002025', '1537', ...)">Grunnspill</a>
async function listGroups(season, ageGroupId, regionId) {
  const html = await standing(1, { season, ageGroupId, regionId });
  const groups = [];
  let division = "";
  for (const row of html.split(/<tr/).slice(1)) {
    const h3 = row.match(/class='divisionrow'><td><h3>(.*?)<\/h3>/);
    if (h3) division = text(h3[1]);
    const g = row.match(/ShowStanding\('2', '\d+', '(\d+)'[^>]*>(.*?)<\/a>/);
    if (g) groups.push({ season, groupId: +g[1], ageGroup: AGE_GROUPS[ageGroupId], ageGroupId, region: REGIONS[regionId], regionId, division, group: text(g[2]) });
  }
  return groups;
}

// "lør. 15.11.2025 12:00" -> "2025-11-15T12:00"
function isoTime(s) {
  const m = s.match(/(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}:\d{2}))?/);
  return m ? `${m[3]}-${m[2]}-${m[1]}${m[4] ? `T${m[4]}` : ""}` : null;
}

// A hall as badmintonportalen writes it ("Oppsal Arena 3 (6) 1-2": its courts after the name; cleaned
// up in team-matches.mjs), without its soft hyphens ("Jotun&shy;hallen"); null when there's none
const hallName = (cell) => text(cell.replace(/&shy;|\u00ad/g, "")) || null;

// Subpage 2: the group's official standings, a row per team: <td class='standing'>1</td>, the team,
// then played, won, drawn, lost, matches ("48-8"), sets, points and table points ('score' cells). A
// row with class 'dashedline' has a line under it (the places going through to the playoffs, or a
// split into top and bottom groups). The
// table points are the official ones (Eliteserien's 4-0, 3-1, 2-2 per tie; a playoff's placement
// points); place 0 before the group's first tie. A knockout playoff (Eliteserien's) has only the
// places and the teams.
async function listStandings(g) {
  const html = await standing(2, g);
  const table = html.slice(html.indexOf("groupstandings"));
  const pair = (s) => s.split("-").map(Number);
  return table
    .split(/<tr/)
    .slice(1)
    .map((row) => {
      const place = row.match(/<td class='standing'>(\d+)<\/td>/)?.[1];
      const team = text(row.match(/<td class='team'>(.*?)<\/td>/)?.[1] ?? "");
      const n = [...row.matchAll(/<td class='score'>(.*?)<\/td>/g)].map((m) => text(m[1]));
      if (place === undefined || !team || (n.length && n.length !== 8)) return null;
      const line = /class='dashedline'/.test(row.slice(0, 40)) ? { line: true } : {};
      if (!n.length) return { place: +place, team, ...line };
      return {
        place: +place,
        team,
        played: +n[0],
        won: +n[1],
        drawn: +n[2],
        lost: +n[3],
        matches: pair(n[4]),
        sets: pair(n[5]),
        rallies: pair(n[6]),
        points: +n[7],
        ...line,
      };
    })
    .filter(Boolean);
}

// Subpage 4: one row per tie with time, match number, teams, arranging club (a third 'team' cell,
// empty when it's the home team), hall ('venue') and overall score.
async function listTies(g) {
  const html = await standing(4, g);
  return html
    .split(/<tr/)
    .slice(1)
    .map((row) => {
      const id = row.match(/ShowStanding\('5', [^)]*?'(\d+)', '', ''\)/)?.[1];
      if (!id) return null;
      const teams = [...row.matchAll(/<td class='team'>(.*?)<\/td>/g)].map((m) => text(m[1]));
      return {
        matchId: +id,
        time: isoTime(text(row.match(/<td class='time'>(.*?)<\/td>/)?.[1] ?? "")),
        home: teams[0],
        away: teams[1],
        score: text(row.match(/<td class='score'>(.*?)<\/td>/)?.[1] ?? ""),
        venue: hallName(row.match(/<td class='venue'>(.*?)<\/td>/)?.[1] ?? ""),
        organiser: teams[2] || null,
      };
    })
    .filter(Boolean);
}

// A side's cell: <div class='teamhdr'>NTNUI</div><div><a href='...VisSpiller/#17534'>Name</a></div>
function parseSide(cell, team) {
  return [...cell.matchAll(/<div><a[^>]*VisSpiller\/#(\d+)[^>]*>(.*?)<\/a><\/div>/g)].map(([, id, name]) => ({
    id: +id,
    name: text(name),
    club: team,
  }));
}

// Subpage 5: the tie's games. Set scores have the winning side's points in <b>.
const unknownCodes = new Set();
async function fetchGames(g, tie) {
  const html = await standing(5, { ...g, matchId: tie.matchId });
  const schema = html.slice(html.indexOf("matchresultschema"));
  const games = [];
  for (const row of schema.split(/<tr>/).slice(1)) {
    const code = text(row.match(/<td class='discipline'>(.*?)<\/td>/)?.[1] ?? "");
    const discipline = DISCIPLINES[code.replace(/^\d+\.\s*/, "")];
    if (!discipline) {
      if (code) unknownCodes.add(code);
      continue;
    }
    const cells = [...row.matchAll(/<td class='(player\w*)'>(.*?)<\/td>/gs)];
    if (cells.length !== 2) continue;
    const sets = [...row.matchAll(/<td class='result'>(.*?)<\/td>/g)]
      .map((m) => text(m[1]).replace(/\s*-\s*/, "/"))
      .filter(Boolean);
    const wo = text(row.match(/<td class='wo'>(.*?)<\/td>/)?.[1] ?? "");
    const winnerIndex = cells.findIndex(([, cls]) => cls === "playerwinner");
    games.push({
      discipline,
      game: code,
      side1: parseSide(cells[0][2], tie.home),
      side2: parseSide(cells[1][2], tie.away),
      winner: winnerIndex === -1 ? null : winnerIndex + 1,
      score: sets.join(",") || wo,
      walkover: !!wo,
    });
  }
  // Play-off ties at 4-4 are decided by a golden set (one set, one discipline): stored apart from
  // the games, as tie.goldenSet, so it isn't rated
  const golden = schema.match(/<tr id='goldensetrow'[^>]*>(.*?)<\/tr>/s)?.[1];
  if (golden) {
    const code = text(golden.match(/<td class='goldensetdiscipline'>(.*?)<\/td>/)?.[1] ?? "");
    const cells = [...golden.matchAll(/<td class='(player\w*)'>(.*?)<\/td>/gs)];
    const winnerIndex = cells.findIndex(([, cls]) => cls === "playerwinner");
    if (DISCIPLINES[code] && cells.length === 2) {
      tie.goldenSet = {
        discipline: DISCIPLINES[code],
        game: code,
        side1: parseSide(cells[0][2], tie.home),
        side2: parseSide(cells[1][2], tie.away),
        winner: winnerIndex === -1 ? null : winnerIndex + 1,
        score: [...golden.matchAll(/<td class='result'>(.*?)<\/td>/gs)].map((m) => text(m[1]).replace(/\s*-\s*/, "/")).filter(Boolean).join(","),
      };
    }
  }
  return games;
}

// --venues: a saved group's ties with their halls and arranging clubs added (the games as saved)
async function addVenues(group) {
  const listed = new Map((await listTies(group)).map((t) => [t.matchId, t]));
  return { ...group, ties: group.ties.map((t) => ({ ...t, venue: listed.get(t.matchId)?.venue ?? null, organiser: listed.get(t.matchId)?.organiser ?? null })) };
}

// --standings: a saved group with its official standings added
const addStandings = async (group) => ({ ...group, standings: await listStandings(group) });

// --golden: a tie saved before golden sets were fetched that was decided by one: its games are
// level but its score isn't (the golden set counts in the score)
function missesGolden(t) {
  if (!t.games?.length || "goldenSet" in t) return false;
  const [home, away] = (t.score.match(/(\d+)\s*-\s*(\d+)/) ?? []).slice(1).map(Number);
  const won = (side) => t.games.filter((g) => g.winner === side).length;
  return home !== away && won(1) === won(2);
}
// A saved group with these ties' golden sets added (their games as saved)
async function addGolden(group) {
  const ties = [];
  for (const t of group.ties) {
    if (!missesGolden(t)) {
      ties.push(t);
      continue;
    }
    const tie = { ...t };
    await fetchGames(group, tie);
    ties.push({ ...t, goldenSet: tie.goldenSet ?? null });
  }
  return { ...group, ties };
}

/** A group's played ties with their games and its standings; `previous` is the saved file of a group still being played */
async function fetchGroup(g, previous) {
  const ties = await listTies(g);
  // Unplayed ties show "-" as their score.
  const played = ties.filter((t) => /\d+\s*-\s*\d+/.test(t.score));
  const saved = new Map((previous?.ties ?? []).map((t) => [t.matchId, t]));
  let fetched = 0;
  for (const tie of played) {
    const before = saved.get(tie.matchId);
    if (before && before.score === tie.score && before.games?.length) {
      tie.games = before.games;
      if (before.goldenSet) tie.goldenSet = before.goldenSet;
    } else {
      tie.games = await fetchGames(g, tie);
      fetched++;
    }
  }
  const complete = g.season < currentSeason() || played.length === ties.length;
  // The ties still to play, with their dates, to know when to fetch the group again
  const schedule = complete ? undefined : ties.filter((t) => !played.includes(t)).map(({ matchId, time, home, away }) => ({ matchId, time, home, away }));
  const standings = await listStandings(g);
  return { group: { ...g, fetchedAt: new Date().toISOString(), complete, ties: played, schedule, standings }, fetched, unplayed: ties.length - played.length };
}

const arg = (name) => process.argv[process.argv.indexOf(name) + 1];
const refetch = process.argv.includes("--refetch");
const seasons = process.argv.includes("--season")
  ? [+arg("--season")]
  : Array.from({ length: currentSeason() - FIRST_SEASON + 1 }, (_, i) => FIRST_SEASON + i);

await mkdir(OUT, { recursive: true });
// Saved groups: complete ones are skipped, ones still being played are fetched again
const saved = new Map();
for (const f of refetch ? [] : await readdir(OUT)) {
  if (!f.endsWith(".json")) continue;
  const group = JSON.parse(await readFile(`${OUT}/${f}`, "utf8"));
  saved.set(f.replace(".json", ""), group);
}
const done = new Set([...saved].filter(([, group]) => group.complete !== false).map(([key]) => key));
const fileKey = (g) => `${g.season}-${g.groupId}`;

// A group still being played is due when a tie dated today or in the last LATE_DAYS days isn't in
// yet (or it was saved before schedules were, or a tie has no date)
const today = new Date().toISOString().slice(0, 10);
const since = new Date(Date.parse(today) - LATE_DAYS * 86_400_000).toISOString().slice(0, 10);
const due = (group) => !group.schedule || group.schedule.some((t) => !t.time || (t.time.slice(0, 10) <= today && t.time.slice(0, 10) >= since));

// The seasons' groups, from the cache unless asked to list them again (or not cached yet); not
// needed for --venues and --standings, which only go through the saved groups
const venues = process.argv.includes("--venues");
const standingsOnly = process.argv.includes("--standings");
const golden = process.argv.includes("--golden");
const filling = venues || standingsOnly || golden;
await mkdir(CACHE, { recursive: true });
const groups = new Map();
for (const season of filling ? [] : seasons) {
  const cacheFile = `${CACHE}/league-groups-${season}.json`;
  let list = null;
  if (!process.argv.includes("--list-groups")) list = JSON.parse(await readFile(cacheFile, "utf8").catch(() => "null"))?.groups ?? null;
  const listed = !list;
  if (listed) {
    list = [];
    for (const regionId of Object.keys(REGIONS)) {
      for (const ageGroupId of Object.keys(AGE_GROUPS)) list.push(...(await listGroups(season, ageGroupId, regionId)));
    }
    await writeFile(cacheFile, JSON.stringify({ listedAt: new Date().toISOString(), groups: list }));
  }
  // Some groups are listed under more than one region: each counts once
  const distinct = new Set(list.map(fileKey));
  for (const g of list) groups.set(fileKey(g), g);
  console.error(`${season}/${season + 1}: ${distinct.size} league groups${listed ? " (listed)" : " (from the cache)"}`);
}
const all = process.argv.includes("--all");
const open = [...groups.values()].filter((g) => !done.has(fileKey(g)));
// --venues: instead, the saved groups of these seasons with a tie saved before halls were fetched;
// --standings: the ones saved before standings were; --golden: the ones with a tie missing its golden set
const pending = venues
  ? [...saved.values()].filter((g) => seasons.includes(g.season) && g.ties.some((t) => !("venue" in t)))
  : standingsOnly
    ? [...saved.values()].filter((g) => seasons.includes(g.season) && !g.standings)
    : golden
      ? [...saved.values()].filter((g) => seasons.includes(g.season) && g.ties.some(missesGolden))
      : open.filter((g) => all || !saved.has(fileKey(g)) || due(saved.get(fileKey(g))));
const todo = pending.slice(0, process.argv.includes("--limit") ? +arg("--limit") : undefined);
console.error(
  venues
    ? `${todo.length} saved groups without halls to fetch them for`
    : standingsOnly
      ? `${todo.length} saved groups without standings to fetch them for`
      : golden
        ? `${todo.length} saved groups with a tie missing its golden set`
        : `${groups.size} groups: ${groups.size - open.length} complete, ${open.length - pending.length} with no ties due, ${todo.length} to fetch`
);
if (process.argv.includes("--dry-run")) process.exit(0);

let failed = 0;
let inProgress = 0;
let next = 0;
async function worker() {
  while (next < todo.length) {
    const i = next++;
    const g = todo[i];
    const label = `[${i + 1}/${todo.length}] ${g.season} ${g.region} ${g.ageGroup} ${g.division} ${g.group}`;
    try {
      if (venues) {
        const group = await addVenues(g);
        await writeFile(`${OUT}/${fileKey(g)}.json`, JSON.stringify(group));
        console.error(`${label}: halls for ${group.ties.filter((t) => t.venue).length} of ${group.ties.length} ties`);
        continue;
      }
      if (standingsOnly) {
        const group = await addStandings(g);
        await writeFile(`${OUT}/${fileKey(g)}.json`, JSON.stringify(group));
        console.error(`${label}: standings of ${group.standings.length} teams`);
        continue;
      }
      if (golden) {
        const checked = g.ties.filter(missesGolden).map((t) => t.matchId);
        const group = await addGolden(g);
        await writeFile(`${OUT}/${fileKey(g)}.json`, JSON.stringify(group));
        const found = group.ties.filter((t) => checked.includes(t.matchId) && t.goldenSet).length;
        console.error(`${label}: golden sets for ${found} of ${checked.length} ties`);
        continue;
      }
      const { group, fetched, unplayed } = await fetchGroup(g, saved.get(fileKey(g)));
      await writeFile(`${OUT}/${fileKey(g)}.json`, JSON.stringify(group));
      const games = group.ties.reduce((n, t) => n + t.games.length, 0);
      if (!group.complete) inProgress++;
      console.error(`${label}: ${group.ties.length} ties played (${fetched} new), ${games} games${group.complete ? "" : `; ${unplayed} still to play`}`);
    } catch (err) {
      failed++;
      console.error(`${label}: FAILED ${err.message}`);
      await appendFile(ERRORS, `${new Date().toISOString()} ${fileKey(g)} ${err.message}\n`);
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
if (unknownCodes.size) console.error(`Skipped unknown game codes: ${[...unknownCodes].join(", ")}`);
console.error(`Done. ${todo.length - failed} saved (${inProgress} still being played), ${failed} failed`);
