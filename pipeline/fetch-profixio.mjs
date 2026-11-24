// Fetch the tournaments played on Profixio (profixio.com) from 2007 to the summer of 2014, before
// badmintonportalen has tournament results (September 2014). A one-time import: the association has
// moved on to Cup2000 and badmintonportalen, so these never change.
// Usage: node fetch-profixio.mjs [--offline] [--only <slug>]
//
// 1. The list of Norwegian badminton tournaments (Livewire: the list loads 12 at a time as it's
//    scrolled; one call with a larger `limit` gives them all), and the tournaments Profixio keeps off
//    that list, in profixio-unlisted.txt: many of 2007-2014 are on no list or search, only at their
//    address (or /app/<id>), such as North Sea Cup 2012 and Fana Cup 2013.
// 2. For each tournament from FROM to TO, its pages are saved as they are in data/profixio/raw/<slug>/:
//    the day pages (every match, 15 a page, with its class, players, set scores and winner), the class
//    pages (the group matches, under each group's heading; knockout matches aren't on them and their
//    round isn't given anywhere) and the entry list (each entry's club). Saved pages aren't fetched
//    again, so it can be stopped and re-run.
// 3. The saved pages are read into data/profixio/<slug>.json, in the shape of fetch-portalen.mjs's
//    files but with Profixio's names and clubs and no player ids (rate.mjs identifies the players on
//    every run: profixio-players.mjs), and a report of who is and isn't identified
//    (data/profixio/players-report.txt). --offline does only this, from the saved pages.
// Only data/profixio/*.json is kept in the raw bucket (.github/raw-data.filter); the saved pages
// stay where they were fetched.
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { unescape, text } from "./portalen.mjs";
import { identifyAll } from "./profixio-players.mjs";

const DIR = new URL(".", import.meta.url).pathname;
const OUT = `${DIR}data/profixio`;
const RAW = `${OUT}/raw`;
const BASE = "https://www.profixio.com/app";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36";
const FROM = "2007-01-01"; // Profixio's first badminton tournaments are from the autumn of 2007
const TO = "2014-08-31"; // badmintonportalen's tournament results start in September 2014
const DELAY_MS = 400;
const MAX_ATTEMPTS = 5;

const args = process.argv.slice(2);
const offline = args.includes("--offline");
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, attempt = 1) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    await sleep(DELAY_MS);
    return html;
  } catch (e) {
    if (attempt >= MAX_ATTEMPTS) throw new Error(`${url}: ${e.message}`);
    await sleep(2000 * 2 ** attempt);
    return get(url, attempt + 1);
  }
}

// The page's text, one token per element ("Pulje 2", "21", "Petter Svendsen")
const tokens = (html) =>
  unescape(html.replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/g, "").replace(/<[^>]*>/g, "\n"))
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

// 1. Every Norwegian badminton tournament on Profixio: { id, slug, name, date, matchCount }
async function listTournaments() {
  const filters = { open_registration: "false", land_id: "no", type: "turnering", idrett: "BM", listingtype: "competitions", show_club_tournaments: "false", ongoing: "false" };
  const query = new URLSearchParams([...Object.entries(filters).map(([k, v]) => [`filters[${k}]`, v]), ["tab", "cuper"]]);
  const res = await fetch(`${BASE}/tournaments?${query}`, { headers: { "User-Agent": UA } });
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  const html = await res.text();
  const token = html.match(/name="csrf-token" content="([^"]+)"/)?.[1];
  const snapshot = [...html.matchAll(/wire:snapshot="([^"]*)"/g)].map((m) => unescape(m[1])).find((s) => s.includes("start-page-cups"));
  if (!token || !snapshot) throw new Error("Profixio's tournament list has changed: no csrf token or list component");
  const body = { _token: token, components: [{ snapshot, updates: { limit: 1000 }, calls: [{ method: "loadMore", params: [], metadata: {} }] }] };
  const update = await fetch(`${BASE}/livewire/update`, {
    method: "POST",
    headers: { "User-Agent": UA, "Content-Type": "application/json", Accept: "application/json", "X-Livewire": "1", Cookie: cookie },
    body: JSON.stringify(body),
  });
  if (!update.ok) throw new Error(`Profixio's tournament list: HTTP ${update.status}`);
  const list = (await update.json()).components[0].effects.html;
  return list
    .split("<article")
    .slice(1)
    .map((card) => {
      const t = tokens(card);
      const dateAt = t.findIndex((s) => /^\d{4}-\d\d-\d\d •/.test(s));
      return {
        id: +card.match(/wire:key="cup-(\d+)"/)?.[1] || null,
        slug: card.match(/href="https:\/\/www\.profixio\.com\/app\/([^"/?]+)"/)?.[1] ?? null,
        name: text(card.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1] ?? ""),
        date: t[dateAt]?.slice(0, 10) ?? null,
        matchCount: +(t.find((s) => /^\d+ kamper$/.test(s))?.match(/\d+/)[0] ?? 0),
      };
    })
    .filter((t) => t.slug && t.date);
}

// 1b. The unlisted tournaments (profixio-unlisted.txt: "<slug> <first day> <id>  # name"), in the
// list's shape. The day and id are the file's (a one-day tournament's page links no days); the page is
// read for the name, and to check the address, that its id is the file's and that it isn't a team
// series ("er_serie": club against club, without the players or their scores). The pages are saved
// (data/profixio/raw/unlisted/<slug>.html), so a re-run doesn't fetch them again.
async function unlistedTournaments(listed) {
  const file = `${DIR}profixio-unlisted.txt`;
  if (!existsSync(file)) return [];
  const have = new Set(listed.map((t) => t.slug));
  const rows = (await readFile(file, "utf8"))
    .split("\n")
    .map((l) => l.replace(/#.*/, "").trim().split(/\s+/))
    .filter(([slug, date, id]) => slug && /^\d{4}-\d\d-\d\d$/.test(date ?? "") && /^\d+$/.test(id ?? "") && !have.has(slug))
    .filter(([, date]) => date >= FROM && date <= TO); // no request for the ones outside the range
  await mkdir(`${RAW}/unlisted`, { recursive: true });
  const found = [];
  for (const [slug, date, id] of rows) {
    try {
      const html = unescape(await save(`${RAW}/unlisted`, slug, `${BASE}/${slug}`));
      const pageId = html.match(/"turnering_id":(\d+)/)?.[1];
      if (!pageId || !html.includes(`/app/${slug}/`)) throw new Error("no tournament at this address");
      if (pageId !== id) throw new Error(`its page has id ${pageId}, the file ${id}`);
      if (/"er_serie":true/.test(html)) throw new Error("a team series, without the players");
      found.push({ id: +id, slug, name: text(html.match(/<title>([\s\S]*?)- Profixio/)?.[1] ?? slug), date, matchCount: 0 });
    } catch (e) {
      console.warn(`profixio-unlisted.txt: ${slug} left out: ${e.message}`);
    }
  }
  return found;
}

// 2. A tournament's pages, saved as they are. Paginated pages are fetched until the next one isn't linked.
async function save(dir, name, url) {
  const file = `${dir}/${name}.html`;
  if (existsSync(file)) return readFile(file, "utf8");
  const html = await get(url);
  await writeFile(file, html);
  return html;
}

async function savePages(dir, name, url) {
  for (let page = 1; ; page++) {
    const html = await save(dir, `${name}-${page}`, page === 1 ? url : `${url}?page=${page}`);
    if (!unescape(html).includes(`page=${page + 1}"`)) return;
  }
}

async function fetchTournament(t) {
  const dir = `${RAW}/${t.slug}`;
  if (existsSync(`${dir}/done`)) return;
  await mkdir(dir, { recursive: true });
  const app = `${BASE}/${t.slug}`;
  const days = await save(dir, "days", `${app}/days`);
  const dates = [...new Set([...days.matchAll(new RegExp(`/${t.slug}/days/(\\d{4}-\\d\\d-\\d\\d)"`, "g"))].map((m) => m[1]))];
  if (dates.length) for (const date of dates) await savePages(dir, `day-${date}`, `${app}/days/${date}`);
  else await savePages(dir, "day-all", `${app}/days`);
  const categories = await save(dir, "categories", `${app}/categories`);
  for (const id of new Set([...categories.matchAll(new RegExp(`/${t.slug}/category/(\\d+)"`, "g"))].map((m) => m[1]))) {
    // A few class pages are broken on Profixio (they redirect to themselves): noted, and the class's
    // matches are then read as one group (readTournament)
    if (existsSync(`${dir}/category-${id}.failed`)) continue;
    try {
      await save(dir, `category-${id}`, `${app}/category/${id}`);
    } catch (e) {
      await writeFile(`${dir}/category-${id}.failed`, e.message);
      console.warn(`${t.slug}: class page ${id} failed, left out: ${e.message}`);
    }
  }
  await savePages(dir, "teams", `${app}/teams`);
  await writeFile(`${dir}/done`, new Date().toISOString());
}

// 3. Reading the saved pages

const DISCIPLINES = [
  [/^herresingle|^hs/i, "MensSingles"],
  [/^damesingle|^ds/i, "WomensSingles"],
  [/^herredouble|^hd/i, "MensDoubles"],
  [/^damedouble|^dd/i, "WomensDoubles"],
  [/^mix|^md|^xd|^mx/i, "MixedDoubles"],
];
const HEADING = /^(herre|dame)(single|double)|^mix(ed)?\s*double|^mix/i;

// "Herresingle U15A" -> "U15 A", "Herresingle A" -> "A"; badmintonportalen's class names
const className = (full, code) => {
  const rest = full.replace(HEADING, "").trim() || code.replace(/^(HS|DS|HD|DD|MD|XD|MX)/i, "").trim();
  const age = rest.match(/^(U\s*\d+)\s*([A-Z])?$/i);
  if (age) return [age[1].replace(/\s/g, "").toUpperCase(), age[2]?.toUpperCase()].filter(Boolean).join(" ");
  // Senior classes are just the letter ("A"); veteran classes V1, V3, V5 are taken to be 35+, 45+
  // and 55+ (a guess: Profixio doesn't say)
  if (/^[A-EX]$/i.test(rest)) return `SEN ${rest.toUpperCase()}`;
  const veteran = rest.match(/^V\s*(\d)$/i);
  if (veteran) return `O${30 + 5 * +veteran[1]} A`;
  return rest;
};

// An entry's players: [{ name, club }]. "Wallem, Kristine" -> "Kristine Wallem"; a pair "A/B" or
// "A / B" -> two. Some tournaments write the clubs in the name: "Lise Hildrum (Grong)", "T. Treff/A.
// Skottun (SaBK)" (both of SaBK), "K. Landmark/M. Haukebøe (HoBK/Mrvl)" (one each), sometimes cut
// short ("(Kristiansan"); some the same name twice ("Siw Årstad/Siw Årstad"): one player, but the
// same initials twice are two ("C. Hem / C. Hem", a brother and sister in mixed doubles; told apart
// in profixio-players.mjs). Placeholders ("Seed #5", "Bye") are no one.
const playerNames = (entry) => {
  const pairClub = entry.match(/\(([^()]*)\)?\s*$/)?.[1];
  const pairClubs = pairClub?.split("/").map((c) => c.trim()) ?? [];
  const parts = entry.replace(/\s*\([^()]*\)?\s*$/, "").split("/");
  const players = [];
  for (const [i, part] of parts.entries()) {
    const club = part.match(/\(([^()]*)\)?\s*$/)?.[1]?.trim() ?? pairClubs[i] ?? pairClubs[0] ?? null;
    const n = part.replace(/\s*\([^()]*\)?\s*$/, "").trim();
    const name = (n.includes(",") ? n.replace(/^([^,]+),\s*(.+)$/, "$2 $1") : n).replace(/\s+/g, " ");
    if (!name || /^(seed\b|bye$|w\.?o\.?$)/i.test(name)) continue;
    if (players.some((p) => p.name === name) && !/(^|\s)\p{L}\.(\s|$)/u.test(name)) continue;
    players.push({ name, club });
  }
  return players;
};

// The matches of a day page: { id, nr, code, full, time, names1, names2, sets, winner, played }
function dayMatches(html) {
  const out = [];
  const blocks = html.split(/<li wire:key="listkamp_/).slice(1);
  for (const block of blocks) {
    const id = +block.match(/^(\d+)/)[1];
    const xdata = unescape(block.match(/x-data="([^"]*)"/)?.[1] ?? "");
    const hasResult = /hasResult:\s*true/.test(xdata);
    const winner = xdata.match(/winner:\s*'([HB]?)'/)?.[1] ?? "";
    const timestamp = +(xdata.match(/timestamp:\s*(\d+)/)?.[1] ?? 0);
    const sideAt = (s) => block.indexOf(`winner == '${s}' }"`);
    const [h, b] = [sideAt("H"), sideAt("B")];
    if (h < 0 || b < 0) continue;
    const name = (at) => text(block.slice(at).match(/>([\s\S]*?)<\/div>/)[1]);
    const head = tokens(block.slice(0, h));
    const codeAt = head.findIndex((s) => /^- /.test(s));
    // The timestamp is the day's midnight; the start time is written out ("13:10")
    const [hours, minutes] = (head.find((s) => /^\d{1,2}:\d\d$/.test(s)) ?? "0:00").split(":").map(Number);
    // After the away side: each set's points (home, away), then the sets won by each
    const numbers = tokens(block.slice(b).replace(/^[^>]*>[\s\S]*?<\/div>/, "")).filter((s) => /^\d+$/.test(s)).map(Number);
    const setsWon = numbers.slice(-2);
    const points = numbers.slice(0, -2);
    const sets = [];
    for (let i = 0; i + 1 < points.length; i += 2) sets.push([points[i], points[i + 1]]);
    out.push({
      id,
      nr: head[codeAt + 1] ?? null,
      code: codeAt > 0 ? head[codeAt - 1] : null,
      full: codeAt >= 0 ? head[codeAt].slice(2).trim() : null,
      time: timestamp + hours * 3600 + minutes * 60,
      names1: playerNames(name(h)),
      names2: playerNames(name(b)),
      sets,
      setsWon,
      winner: winner === "H" ? 1 : winner === "B" ? 2 : setsWon.length === 2 && setsWon[0] !== setsWon[1] ? (setsWon[0] > setsWon[1] ? 1 : 2) : null,
      played: hasResult,
    });
  }
  return out;
}

// A class page: its code and the group of each group match (match id -> "Pulje 2")
function classGroups(html) {
  const code = text(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "").replace(/\s*-\s*Profixio\s*$/, "");
  const groups = new Map();
  const sections = html.split(/id="pulje\d+"/).slice(1);
  for (const section of sections) {
    const group = text(section.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1] ?? "") || "Pulje 1";
    for (const [, id] of section.matchAll(/<li wire:key="listkamp_(\d+)"/g)) groups.set(+id, /^pulje/i.test(group) ? group : `Pulje ${group}`);
  }
  return { code, groups };
}

// The entry list: name -> club, from "Name | Club | Class | Date" rows. An entry has one club, so a
// pair from two clubs has one of theirs, often the partner's; a player's club in the tournament is
// the one their entries give most, a singles entry counting 2, a pair's 1, and a pair's that is the
// partner's own singles club 0.5 (the earlier entry on a tie). `oneClub`: the list gives every entry
// (10 or more) the same club, as Fosentreffen 2008's "Vaksdal IL" for all 107 (see readTournament).
function entryClubs(pages) {
  const rows = new Map(); // name -> [{ club, partners }]
  const all = new Set();
  let count = 0;
  for (const html of pages) {
    const t = tokens(html);
    for (let i = 3; i < t.length; i++) {
      if (!/^\d{1,2}\. \p{L}+ \d{4}/u.test(t[i])) continue;
      const [entry, club] = [t[i - 3], t[i - 2]];
      if (!club) continue;
      count++;
      all.add(club);
      const names = playerNames(entry).map((p) => p.name);
      for (const name of names) {
        if (!rows.has(name)) rows.set(name, []);
        rows.get(name).push({ club, partners: names.filter((n) => n !== name) });
      }
    }
  }
  const clubs = new Map();
  clubs.oneClub = count >= 10 && all.size === 1;
  // The club of a player's singles entries (the earlier on a tie)
  const singles = new Map();
  for (const [name, list] of rows) {
    const tally = new Map();
    for (const r of list) if (!r.partners.length) tally.set(r.club, (tally.get(r.club) ?? 0) + 1);
    if (tally.size) singles.set(name, [...tally].reduce((a, b) => (b[1] > a[1] ? b : a))[0]);
  }
  for (const [name, list] of rows) {
    const score = new Map();
    for (const r of list) {
      const weight = !r.partners.length ? 2 : r.partners.some((n) => singles.get(n) === r.club) ? 0.5 : 1;
      score.set(r.club, (score.get(r.club) ?? 0) + weight);
    }
    clubs.set(name, [...score].reduce((a, b) => (b[1] > a[1] ? b : a))[0]);
  }
  return clubs;
}

// Knockout rounds, which Profixio doesn't name: the final is the last match whose two sides each
// won a knockout match before it (or the last match), and each round before is the matches that
// sides of the next one won to get there. Named as badmintonportalen does; matches outside that
// tree (a play-off for third, placement matches) are "Sluttspill".
function knockoutRounds(matches) {
  const key = (players) => players.map((p) => p.name).join("|");
  const sorted = [...matches].sort((a, b) => a.time - b.time || a.id - b.id);
  const wonBefore = (m, side) => sorted.filter((p) => p.time <= m.time && p !== m && p.winner && key(p[`names${p.winner}`]) === key(m[`names${side}`]) && sorted.indexOf(p) < sorted.indexOf(m));
  const rounds = new Map();
  const final = [...sorted].reverse().find((m) => wonBefore(m, 1).length && wonBefore(m, 2).length) ?? sorted.at(-1);
  if (!final) return rounds;
  let level = [final];
  for (let depth = 0; level.length && depth < 8; depth++) {
    const name = depth === 0 ? "Finale" : depth === 1 ? "Semifinaler" : depth === 2 ? "Kvartfinaler" : `1/${2 ** depth}`;
    for (const m of level) rounds.set(m.id, name);
    level = level.flatMap((m) => [1, 2].map((side) => wonBefore(m, side).at(-1)).filter((p) => p && !rounds.has(p.id)));
  }
  return rounds;
}

const dateOf = (seconds) => new Date(seconds * 1000).toLocaleDateString("sv-SE", { timeZone: "Europe/Oslo" });
const seasonOf = (date) => (+date.slice(5, 7) >= 7 ? +date.slice(0, 4) : +date.slice(0, 4) - 1);

async function readTournament(t) {
  const dir = `${RAW}/${t.slug}`;
  const files = (await readdir(dir)).sort();
  const read = (f) => readFile(`${dir}/${f}`, "utf8");
  const byId = new Map();
  for (const f of files.filter((f) => /^day-.*\.html$/.test(f))) for (const m of dayMatches(await read(f))) byId.set(m.id, m);
  const groups = new Map();
  const codes = new Set();
  for (const f of files.filter((f) => /^category-\d+\.html$/.test(f))) {
    const c = classGroups(await read(f));
    codes.add(c.code);
    for (const [id, g] of c.groups) groups.set(id, g);
  }
  let clubs = entryClubs(await Promise.all(files.filter((f) => /^teams-\d+\.html$/.test(f)).map(read)));
  // An entry list with one club for everyone is wrong where the match names write the clubs: use those
  if (clubs.oneClub && [...byId.values()].some((m) => [...m.names1, ...m.names2].some((p) => p.club))) clubs = new Map();
  const warnings = [];
  const played = [...byId.values()].filter((m) => m.played && m.winner && m.names1.length && m.names2.length);
  const byClass = Map.groupBy(played, (m) => m.code);
  const matches = [];
  for (const [code, list] of byClass) {
    const full = list.find((m) => m.full)?.full ?? code;
    const discipline = DISCIPLINES.find(([re]) => re.test(full) || re.test(code))?.[1];
    if (!discipline) {
      warnings.push(`${t.slug}: class ${code} (${full}) isn't a known discipline, left out`);
      continue;
    }
    const doubles = /Doubles$/.test(discipline);
    // Without its class page (broken on Profixio), a class's groups and knockout can't be told apart:
    // its matches are one group, in playing order
    const noPage = !codes.has(code);
    if (noPage) warnings.push(`${t.slug}: class ${code} has no class page, its matches are read as one group`);
    const knockout = noPage ? new Map() : knockoutRounds(list.filter((m) => !groups.has(m.id)));
    for (const m of list.sort((a, b) => a.time - b.time || a.id - b.id)) {
      if (m.names1.length !== (doubles ? 2 : 1) || m.names2.length !== (doubles ? 2 : 1)) {
        warnings.push(`${t.slug}: ${code} match ${m.id} has ${m.names1.map((p) => p.name).join("/")} vs ${m.names2.map((p) => p.name).join("/")}, left out`);
        continue;
      }
      const round = noPage ? "Pulje 1" : (groups.get(m.id) ?? knockout.get(m.id) ?? "Sluttspill");
      // A walkover has no sets won (0-0, with a winner). Some tournaments (many in 2012) give only the sets won
      // ("2 1"), not their points: played, rated without a score (as a typical margin)
      const walkover = !m.sets.length && !(m.setsWon[0] + m.setsWon[1] > 0);
      matches.push({
        className: className(full, code),
        discipline,
        round,
        date: dateOf(m.time),
        matchId: m.id,
        side1: m.names1.map((p) => ({ id: null, name: p.name, club: clubs.get(p.name) ?? p.club ?? "" })),
        side2: m.names2.map((p) => ({ id: null, name: p.name, club: clubs.get(p.name) ?? p.club ?? "" })),
        winner: m.winner,
        score: walkover ? "W.O." : m.sets.map(([a, b]) => `${a}/${b}`).join(","),
        walkover,
      });
    }
  }
  // Group stages first, then the knockout rounds up to the final, as badmintonportalen lists them
  const stage = (r) => (/^pulje/i.test(r) ? 0 : r === "Sluttspill" ? 1 : r === "Finale" ? 5 : r === "Semifinaler" ? 4 : r === "Kvartfinaler" ? 3 : 2);
  matches.sort((a, b) => stage(a.round) - stage(b.round));
  const setsOnly = matches.filter((m) => !m.walkover && !m.score).length;
  if (setsOnly) warnings.push(`${t.slug}: ${setsOnly} of ${matches.length} matches have only the sets won, no points`);
  const dates = matches.map((m) => m.date).sort();
  if (t.matchCount && Math.abs(byId.size - t.matchCount) > 0) warnings.push(`${t.slug}: ${byId.size} matches on the day pages, the list says ${t.matchCount}`);
  return {
    tournamentId: `P${t.id}`,
    source: "profixio",
    slug: t.slug,
    url: `${BASE}/${t.slug}`,
    name: t.name,
    title: t.name,
    season: seasonOf(dates[0] ?? t.date),
    startDate: dates[0] ?? t.date,
    endDate: dates.at(-1) ?? t.date,
    classes: [...new Set(matches.map((m) => m.className))],
    matches,
    warnings,
  };
}

await mkdir(RAW, { recursive: true });
let list;
if (offline) list = JSON.parse(await readFile(`${RAW}/tournaments.json`, "utf8"));
else {
  list = await listTournaments();
  list.push(...(await unlistedTournaments(list)));
  await writeFile(`${RAW}/tournaments.json`, JSON.stringify(list, null, 1));
}
const wanted = list.filter((t) => t.date >= FROM && t.date <= TO && (!only || t.slug === only));
console.log(`${list.length} tournaments on Profixio, ${wanted.length} from ${FROM} to ${TO}`);

if (!offline) {
  for (const [i, t] of wanted.entries()) {
    try {
      await fetchTournament(t);
      console.log(`[${i + 1}/${wanted.length}] ${t.slug}`);
    } catch (e) {
      console.error(`[${i + 1}/${wanted.length}] ${t.slug} failed: ${e.message}`);
    }
  }
}

const tournaments = [];
for (const t of wanted.filter((t) => existsSync(`${RAW}/${t.slug}/done`))) tournaments.push(await readTournament(t));
// The files keep Profixio's names and clubs, without ids: rate.mjs identifies the players on every
// run (profixio-players.mjs), so identities.txt and a newer player register apply without fetching
// again. The report is from identifying them now.
for (const t of tournaments) {
  const { warnings, ...file } = t;
  for (const w of warnings) console.warn(w);
  await writeFile(`${OUT}/${t.slug}.json`, JSON.stringify(file));
}
const report = identifyAll(structuredClone(tournaments));
await writeFile(`${OUT}/players-report.txt`, report.text);
await writeFile(`${OUT}/unidentified.txt`, report.fillIn + "\n");
console.log(report.summary);
