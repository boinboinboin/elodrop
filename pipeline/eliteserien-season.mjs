// What a season of Eliteserien is made of, shared by the season reviews (eliteserien-review.mjs) and this
// season's forecast (eliteserien-forecast.mjs): the season's ties and schedule from the league data, the
// teams as they actually played (the list, plus players who played without being on it), ratings from right
// before a day (weekly histories), each match's win chance from the match logs, and the play-offs' golden set.
import { readdirSync, readFileSync } from "node:fs";
import { lowestRatings, rankingPoints } from "./eliteserien.mjs";

const DIR = new URL(".", import.meta.url).pathname;
export const read = (file) => JSON.parse(readFileSync(file, "utf8"));

// A tie's game ("1. HS") as a lineup slot, and a discipline as its rating pool
export const GAME_SLOTS = { "1. HS": "MS1", "2. HS": "MS2", "1. DS": "WS1", "2. DS": "WS2", "1. HD": "MD", "1. DD": "WD", "1. MD": "XD1", "2. MD": "XD2" };
export const POOL_OF = { MensSingles: "men", WomensSingles: "women", MensDoubles: "mensDoubles", WomensDoubles: "womensDoubles", MixedDoubles: "mixedDoubles" };

/** A team as its club's name ("Bergen 2" → "Bergen") */
export const teamName = (team) => team.replace(/\s+\d+$/, "").trim();
const DAY_MS = 86_400_000;
const days = (a, b) => (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS;

/**
 * The season's Eliteserien groups (season: its first year, 2025 for 2025/26; not the qualification against
 * 1. divisjon teams, whose groups are named "Eliteserien Kvalifisering", "Kvalifisering til eliteserien" and the
 * like), with their ties played, in order: { groups: [{ group, schedule }], ties }
 */
export function seasonTies(season) {
  const groups = readdirSync(`${DIR}data/league`)
    .filter((f) => f.startsWith(`${season}-`))
    .map((f) => read(`${DIR}data/league/${f}`))
    .filter((g) => /^eliteserien \d{4}\//i.test(g.division));
  const ties = groups
    .flatMap((g) => g.ties.map((t) => ({ ...t, group: g.group, day: t.time.slice(0, 10), home: teamName(t.home), away: teamName(t.away) })))
    .sort((a, b) => a.time.localeCompare(b.time) || a.matchId - b.matchId);
  return { groups: groups.map((g) => ({ division: g.division, group: g.group, schedule: g.schedule ?? null })), ties };
}

/** Current ratings: each player (names, clubs, genders) and the lowest ratings, for players without a rating */
export function currentPlayers() {
  const { pools } = read(`${DIR}data/ratings.json`);
  const current = new Map();
  for (const list of Object.values(pools)) for (const p of list) if (!current.has(p.id)) current.set(p.id, p);
  return { pools, current, replacement: lowestRatings(pools) };
}

/**
 * The teams as they played (teams: readRoster's, their players with `from: null`): players who played for a
 * team without being on its list are added (available from their first match), and players listed for one
 * team who played for another are moved to that one. Changes `teams`; returns the changes.
 */
export function applyPlayed(teams, ties, current) {
  const played = new Map(); // player id -> { team, first day, gender }
  for (const tie of ties) {
    for (const game of tie.games) {
      for (const [side, team] of [[game.side1, tie.home], [game.side2, tie.away]]) {
        for (const p of side) {
          const gender = /^Mens/.test(game.discipline) ? "M" : /^Womens/.test(game.discipline) ? "K" : current.get(p.id)?.gender;
          if (!played.has(p.id)) played.set(p.id, { team, first: tie.day, gender, name: p.name });
        }
      }
    }
  }
  const changes = [];
  for (const [id, info] of played) {
    const listed = teams.find((t) => t.players.some((p) => p.id === id));
    if (listed?.team === info.team) continue;
    const target = teams.find((t) => t.team === info.team);
    if (!target) continue;
    if (listed) {
      const player = listed.players.find((p) => p.id === id);
      listed.players = listed.players.filter((p) => p !== player);
      target.players.push({ ...player, movedFrom: listed.team, from: null });
      changes.push({ id, name: info.name, team: info.team, change: `listed for ${listed.team}` });
    } else {
      target.players.push({ gender: info.gender ?? "M", id, listName: info.name, loanFrom: null, added: true, from: info.first });
      changes.push({ id, name: info.name, team: info.team, change: `not on the list, first played ${info.first}` });
    }
  }
  return changes;
}

// Ratings right before a day: the rating at the end of the previous week (weekly histories)
const histories = new Map();
const history = (id) => {
  if (!histories.has(id)) {
    try {
      histories.set(id, read(`${DIR}data/history/${id}.json`));
    } catch {
      histories.set(id, {});
    }
  }
  return histories.get(id);
};
export function ratingBefore(id, pool, day) {
  const h = history(id)[pool];
  if (!h) return null;
  const week = Math.floor(days(h.from, day) / 7); // the week containing `day`
  if (week < 1) return null;
  return h.ratings[Math.min(week - 1, h.ratings.length - 1)];
}
/** A rating source (eliteserien.mjs's playerRatings) with the ratings from right before `day` and the ranking points of `rankingFile` */
export function sourceAt(day, rankingFile, { current, replacement }) {
  const { period, points } = rankingPoints(rankingFile);
  return {
    rating: (id, pool) => ratingBefore(id, pool, day),
    name: (id) => current.get(id)?.name ?? null,
    club: (id) => current.get(id)?.club ?? null,
    points,
    period,
    replacement,
  };
}

// A game's win chance for side 1 from right before it, from side 1's first player's match log
const matchLogs = new Map();
function logOf(id) {
  if (!matchLogs.has(id)) {
    try {
      matchLogs.set(id, read(`${DIR}data/matches/${id}.json`));
    } catch {
      matchLogs.set(id, {});
    }
  }
  return matchLogs.get(id);
}
export function loggedGame(tie, game) {
  const key = `L${tie.matchId} ${game.side1.map((p) => p.id).join("+")} vs ${game.side2.map((p) => p.id).join("+")}`;
  return (logOf(game.side1[0]?.id)[POOL_OF[game.discipline]]?.all ?? []).find((m) => m.key === key) ?? null;
}

// Play-offs: a tie ends as soon as a team has won 5 matches, and a tie at 4-4 is decided by a
// golden set in one discipline (the teams take turns striking disciplines). We take the golden
// set to be played in the discipline whose top players or pairs (1st singles, the doubles, 1st
// mixed) are closest in rating, with that match's win chance. Stopping at 5 wins doesn't change
// who wins, so a play-off tie is won with P(5+ of 8) + P(4-4) × P(golden set); there's no draw.
export const isPlayoff = (tie) => /^sluttspill/i.test(tie.group);
export const GOLDEN_SLOTS = { MS1: "MensSingles", WS1: "WomensSingles", MD: "MensDoubles", WD: "WomensDoubles", XD1: "MixedDoubles" };
export function goldenSet(chanceOf) {
  const [slot, chance] = Object.keys(GOLDEN_SLOTS)
    .map((key) => [key, chanceOf(key)])
    .sort((a, b) => Math.abs(a[1] - 0.5) - Math.abs(b[1] - 0.5))[0];
  return { slot, discipline: GOLDEN_SLOTS[slot], chance };
}
export function decided(odds, golden) {
  return { ...odds, win: odds.win + odds.draw * golden.chance, loss: odds.loss + odds.draw * (1 - golden.chance), draw: 0, drawBefore: odds.draw, golden };
}
