// Achievements: the badges a player has earned, worked out from the results (pipeline/README.md,
// Achievements). Each rule is a function in RULES, keyed by the badge's key in the site's Sanity
// Studio (web/sanity/schemas/badge.ts), which gives the badge its title, description and art; a
// badge given by hand (the creator's) has no rule here, only player ids in the Studio.
//
// A new rule: a function here returning its awards, its key in the Studio's list of rules
// (BADGE_RULES in web/sanity/schemas/badge.ts), and the badge itself in the Studio.
//
// Usage: import { achievements } from "./achievements.mjs" (export.mjs), or
//        node achievements.mjs   prints how many of each badge, and the senior NMs found
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { correctedMatches } from "./rate.mjs";

const DIR = new URL(".", import.meta.url).pathname;
const POOLS = { MensSingles: "men", WomensSingles: "women", MensDoubles: "mensDoubles", WomensDoubles: "womensDoubles", MixedDoubles: "mixedDoubles" };
const KIND = { men: "singles", women: "singles", mensDoubles: "doubles", womensDoubles: "doubles", mixedDoubles: "mixed" };

// The senior national championships (NM), by their title on badmintonportalen: "Kristiansand: NM
// 2014", "NBF: NM Senior (Bygdøhus)", "Kristiansand: RT 17 + NM Senior"; not the junior, U23,
// veteran or team championships, or a cancelled one. Only their senior classes count. Tournaments the
// titles get wrong are added or left out by badmintonportalen id here.
const NM = /\bNM\b|norgesmesterskap/i;
const NOT_SENIOR_NM = /junior|\bu\s*-?\s*23\b|veteran|for lag|avlyst/i;
const NM_SENIOR_EXTRA = new Set([]);
const NM_SENIOR_EXCLUDE = new Set([]);
export const isSeniorNM = (t) => !NM_SENIOR_EXCLUDE.has(t.tournamentId) && (NM_SENIOR_EXTRA.has(t.tournamentId) || (NM.test(t.title ?? t.name) && !NOT_SENIOR_NM.test(t.title ?? t.name)));

const isGroup = (round) => /^pulje/i.test(round.trim());
const isFinal = (round) => /^finale$/i.test(round.trim());
// A side by its players (ids, or names for players without one)
const sideKey = (side) => side.map((p) => p.id ?? p.name).sort().join("+");
const sets = (score) =>
  (score ?? "")
    .split(",")
    .map((s) => s.split("/").map(Number))
    .filter(([a, b]) => a >= 0 && b >= 0);

/**
 * A group's sides, best first, by badminton's rules: by wins; two sides level on wins by the match
 * between them; three or more by set difference, then point difference (then two still level by
 * their match)
 */
function standings(matches) {
  const table = new Map(); // side key -> [wins, sets won − lost, points won − lost]
  const add = (key, wins, setDiff, pointDiff) => {
    const row = table.get(key) ?? [0, 0, 0];
    table.set(key, [row[0] + wins, row[1] + setDiff, row[2] + pointDiff]);
  };
  for (const m of matches) {
    const s = sets(m.score);
    const setDiff = s.filter(([a, b]) => a > b).length - s.filter(([a, b]) => b > a).length;
    const pointDiff = s.reduce((sum, [a, b]) => sum + a - b, 0);
    add(sideKey(m.side1), m.winner === 1 ? 1 : 0, setDiff, pointDiff);
    add(sideKey(m.side2), m.winner === 2 ? 1 : 0, -setDiff, -pointDiff);
  }
  // 1 when a beat b, -1 when b beat a, 0 when they didn't meet
  const beat = (a, b) => {
    const m = matches.find((m) => [sideKey(m.side1), sideKey(m.side2)].sort().join("|") === [a, b].sort().join("|"));
    if (!m) return 0;
    return sideKey(winnerOf(m)) === a ? 1 : -1;
  };
  const tied = (wins) => [...table.values()].filter((row) => row[0] === wins).length;
  return [...table]
    .sort(([a, x], [b, y]) => {
      if (x[0] !== y[0]) return y[0] - x[0];
      if (tied(x[0]) === 2) return -beat(a, b);
      return y[1] - x[1] || y[2] - x[2] || -beat(a, b);
    })
    .map(([key]) => key);
}

const winnerOf = (m) => (m.winner === 1 ? m.side1 : m.winner === 2 ? m.side2 : null);

/**
 * An event's winning side, from its matches in playing order (groups, then the knockout up to the
 * final), or null when the matches don't say: no final after a knockout, several groups and no
 * knockout, or a final that isn't decided.
 *
 * - A knockout's winner is the final's ("Finale"). Some events list placement matches under
 *   "Finale" too (the group runners-up playing for 3rd, say): the final is then the one whose two
 *   sides each won their match before it (or, from the groups, won their group); several of those
 *   (a B play-off's final), the one whose sides won the most matches in the event.
 * - An event that is a single group: the top of its standings.
 */
export function eventWinner(matches) {
  const decided = matches.filter((m) => m.winner === 1 || m.winner === 2);
  const groups = Map.groupBy(
    decided.filter((m) => isGroup(m.round)),
    (m) => m.round.trim(),
  );
  const knockout = matches.filter((m) => !isGroup(m.round));
  if (!knockout.length) {
    if (groups.size !== 1) return null;
    const [top] = standings([...groups.values()][0]);
    const match = decided.find((m) => sideKey(m.side1) === top || sideKey(m.side2) === top);
    return match ? (sideKey(match.side1) === top ? match.side1 : match.side2) : null;
  }
  const finals = knockout.filter((m) => isFinal(m.round));
  if (finals.length <= 1) return finals[0] ? winnerOf(finals[0]) : null;

  const groupWinners = new Set([...groups.values()].map((g) => standings(g)[0]));
  const plays = (m, key) => sideKey(m.side1) === key || sideKey(m.side2) === key;
  const won = (m, key) => {
    const w = winnerOf(m);
    return w !== null && sideKey(w) === key;
  };
  const cameThrough = (final, side) => {
    const key = sideKey(side);
    const before = knockout.filter((m) => m !== final && !isFinal(m.round) && plays(m, key)).at(-1);
    return before ? won(before, key) : groupWinners.has(key);
  };
  const candidates = finals.filter((f) => cameThrough(f, f.side1) && cameThrough(f, f.side2));
  if (candidates.length <= 1) return candidates[0] ? winnerOf(candidates[0]) : null;
  const wins = (side) => decided.filter((m) => won(m, sideKey(side))).length;
  const strength = (f) => wins(f.side1) + wins(f.side2);
  const best = Math.max(...candidates.map(strength));
  const top = candidates.filter((f) => strength(f) === best);
  return top.length === 1 ? winnerOf(top[0]) : null;
}

/** A tournament's event winners: { className, pool, players: [{ id, name }] } (players without an id left out) */
export function eventWinners(t) {
  const events = Map.groupBy(correctedMatches(t), (m) => `${m.className}|${m.discipline}`);
  const winners = [];
  for (const matches of events.values()) {
    const pool = POOLS[matches[0].discipline];
    const side = pool ? eventWinner(matches) : null;
    const players = (side ?? []).filter((p) => p.id).map((p) => ({ id: p.id, name: p.name }));
    if (players.length) winners.push({ className: matches[0].className, pool, players });
  }
  return winners;
}

const tournamentOf = (t) => ({ date: t.endDate ?? t.startDate, tournamentId: t.tournamentId, tournament: t.name });

// The rules: each gets { tournaments: [{ t, winners }], upsets } and returns [playerId, award] pairs
export const RULES = {
  // Won a singles, a doubles and a mixed doubles event at the same tournament (in any classes)
  triple({ tournaments }) {
    const awards = [];
    for (const { t, winners } of tournaments) {
      const won = new Map(); // player id -> { kind -> event }
      for (const w of winners) {
        for (const p of w.players) {
          if (!won.has(p.id)) won.set(p.id, {});
          won.get(p.id)[KIND[w.pool]] ??= { className: w.className, pool: w.pool };
        }
      }
      for (const [id, kinds] of won) {
        if (kinds.singles && kinds.doubles && kinds.mixed) awards.push([id, { ...tournamentOf(t), events: [kinds.singles, kinds.doubles, kinds.mixed] }]);
      }
    }
    return awards;
  },

  // Won an event in a senior class of the senior national championships
  nationalChampion({ tournaments }) {
    const awards = [];
    for (const { t, winners } of tournaments) {
      if (!isSeniorNM(t)) continue;
      const year = Number(t.startDate.slice(0, 4));
      for (const w of winners) {
        if (!/^SEN\b/i.test(w.className)) continue;
        for (const p of w.players) awards.push([p.id, { ...tournamentOf(t), year, events: [{ className: w.className, pool: w.pool }] }]);
      }
    }
    return awards;
  },

  // Won the week's biggest upset (the first of the week's upsets: data/upsets.json)
  upsetOfTheWeek({ upsets }) {
    const awards = [];
    for (const { week, matches } of upsets?.weeks ?? []) {
      const m = matches[0];
      if (!m) continue;
      const tournamentId = Number(m.key.match(/^T(\d+)/)?.[1]) || null;
      for (const p of m.winners) awards.push([p.id, { date: m.day, week, pool: m.pool, event: m.event, tournamentId, winChance: m.winChance }]);
    }
    return awards;
  },
};

/** The results the rules use: every tournament on badmintonportalen with its event winners, and the weekly upsets */
export function readResults() {
  const dir = `${DIR}data/portalen`;
  const tournaments = (existsSync(dir) ? readdirSync(dir) : [])
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8")))
    .map((t) => ({ t, winners: eventWinners(t) }));
  const upsetsFile = `${DIR}data/upsets.json`;
  const upsets = existsSync(upsetsFile) ? JSON.parse(readFileSync(upsetsFile, "utf8")) : null;
  return { tournaments, upsets };
}

/** Every player's awards, by player id, newest first: { badge, date, ... } */
export function achievements(results = readResults()) {
  const byPlayer = new Map();
  for (const [badge, rule] of Object.entries(RULES)) {
    for (const [id, award] of rule(results)) {
      if (!byPlayer.has(id)) byPlayer.set(id, []);
      byPlayer.get(id).push({ badge, ...award });
    }
  }
  for (const list of byPlayer.values()) list.sort((a, b) => b.date.localeCompare(a.date) || a.badge.localeCompare(b.badge));
  return byPlayer;
}

/** How many awards a badge's "latest" list has (the achievements page) */
const LATEST = 5;

/**
 * Per badge, for the achievements page: how many players have earned it and how many times, and the
 * newest awards (one per player), with the player's name and club. `players`: id → { name, club } of
 * every player with a rating (the share's base)
 */
export function achievementStats(awards, players) {
  const badges = {};
  for (const [id, list] of awards) {
    const player = players.get(id);
    if (!player) continue;
    for (const [badge, own] of Map.groupBy(list, (a) => a.badge)) {
      badges[badge] ??= { players: 0, awards: 0, latest: [] };
      badges[badge].players++;
      badges[badge].awards += own.length;
      badges[badge].latest.push({ id, name: player.name, club: player.club ?? null, ...own[0] });
    }
  }
  for (const b of Object.values(badges)) b.latest = b.latest.sort((x, y) => y.date.localeCompare(x.date) || x.id - y.id).slice(0, LATEST);
  return { players: players.size, badges };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const results = readResults();
  const nm = results.tournaments.filter(({ t }) => isSeniorNM(t));
  console.log(`Senior NMs (${nm.length}):`);
  for (const { t, winners } of nm.sort((a, b) => a.t.startDate.localeCompare(b.t.startDate))) {
    const senior = winners.filter((w) => /^SEN\b/i.test(w.className));
    console.log(`  #${t.tournamentId} ${t.startDate} ${t.title}: ${senior.map((w) => `${w.className} ${w.pool} ${w.players.map((p) => p.name).join(" / ")}`).join("; ") || "no winners"}`);
  }
  const events = results.tournaments.flatMap(({ t }) => [...Map.groupBy(t.matches ?? [], (m) => `${m.className}|${m.discipline}`)]);
  const won = results.tournaments.reduce((n, { winners }) => n + winners.length, 0);
  console.log(`Event winners: ${won} of ${events.length} events.`);
  const counts = {};
  for (const list of achievements(results).values()) for (const a of list) counts[a.badge] = (counts[a.badge] ?? 0) + 1;
  console.log("Awards:", counts);
}
