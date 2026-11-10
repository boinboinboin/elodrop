// Eliteserien seasons in review: the team strengths before each round (the same model as
// eliteserien.mjs, with the ratings and ranking points from right before the round) against what
// actually happened.
// Usage: node eliteserien-review.mjs [2021-22|2022-23|2023-24|2024-25|2025-26]   (all seasons without an argument; after
// rate.mjs; needs data/league, data/history, data/matches and the ranking versions from
// fetch-ranking.mjs <season> --before <round date>)
//
// For each tie: the expected result if both teams field their best lineup ("potential"), the
// expected result with the lineups they actually played (each match's win chance from right before
// it, as in the match logs) and the actual result. Walkovers and unplayed matches are left out.
// Writes data/eliteserien-<season>.json.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { SLOTS, SLOT_POOL, bestLineup, playedOdds, playerRatings, readRoster, references, tablePoints, tieOdds, win } from "./eliteserien.mjs";
import { GAME_SLOTS, POOL_OF, applyPlayed, currentPlayers, decided, goldenSet, isPlayoff, loggedGame, seasonTies, sourceAt } from "./eliteserien-season.mjs";
import { sideRating } from "./rules.mjs";

const DIR = new URL(".", import.meta.url).pathname;
// Per season: the team list, the rounds with the ranking version from right before each
// (fetch-ranking.mjs --before), and the official final standings (badmintonportalen), regular
// season and after the play-offs.
// badmintonportalen keeps only each season's final ranking before 2025/26, so for those seasons
// each round uses the closest season-end list instead (the ranking covers the 12 months before
// its date): the one before the season for Lillerunden, the season's own for the rest.
const seasonEndNote = (season, before, own) =>
  `The ranking versions from before each round are no longer available for ${season}: the order rules use the closest season-end ranking instead (to July ${before} for Lillerunden, to July ${own} for the rest).`;
const SEASONS = {
  "2021-22": {
    season: "2021/2022",
    source: "https://www.badminton.no/contentassets/3641b056d63a468ba5e8f5fa7b08d6fb/eliteserien-spillere-2021-2022-per-28.-januar-2022.pdf",
    rankingNote: seasonEndNote("2021/2022", 2021, 2022),
    // No golden set yet: two play-off ties ended 4-4 and were left drawn
    goldenSet: false,
    rounds: [
      { name: "Lillerunden", from: "2021-11-20", to: "2021-11-21", ranking: "2002020" },
      { name: "Storrunden", from: "2022-01-29", to: "2022-01-30", ranking: "2002021" },
      { name: "Sluttspill", from: "2022-05-21", to: "2022-05-22", ranking: "2002021" },
    ],
    standings: {
      regular: ["Kristiansand", "Frogner", "Bergen", "Haugerud", "Sandefjord", "Moss", "Vestre Aker", "Tromsø"],
      // The final (Kristiansand–Frogner) and the match for 5th (Sandefjord–Moss) ended 4-4
      final: ["Frogner", "Kristiansand", "Haugerud", "Bergen", "Moss", "Sandefjord", "Vestre Aker", "Tromsø"],
    },
  },
  "2022-23": {
    season: "2022/2023",
    source: "https://www.badminton.no/siteassets/dokumenter/eliteserie/eliteserien-spillere-2022-2023-per-29.-november-2022.pdf",
    rankingNote: seasonEndNote("2022/2023", 2022, 2023),
    rounds: [
      { name: "Lillerunden", from: "2022-11-19", to: "2022-11-20", ranking: "2002021" },
      { name: "Storrunden", from: "2023-01-28", to: "2023-01-29", ranking: "2002022" },
      { name: "Sluttspill", from: "2023-03-18", to: "2023-03-19", ranking: "2002022" },
    ],
    standings: {
      regular: ["Kristiansand", "Frogner", "Bergen", "Moss", "Haugerud", "Sandefjord", "Vestre Aker", "Bærum"],
      final: ["Frogner", "Kristiansand", "Bergen", "Moss", "Haugerud", "Sandefjord", "Vestre Aker", "Bærum"],
    },
  },
  "2023-24": {
    season: "2023/2024",
    source: "https://www.badminton.no/contentassets/8ee49abea2f24b0cb9cd337cb26cb5e1/spillere-i-eliteserien-2023-24.pdf",
    rankingNote: seasonEndNote("2023/2024", 2023, 2024),
    rounds: [
      { name: "Lillerunden", from: "2023-11-18", to: "2023-11-19", ranking: "2002022" },
      { name: "Storrunden", from: "2024-01-27", to: "2024-01-28", ranking: "2002023" },
      { name: "Sluttspill", from: "2024-03-16", to: "2024-03-17", ranking: "2002023" },
    ],
    standings: {
      regular: ["Bergen", "Kristiansand", "Frogner", "Moss", "Haugerud", "Sandefjord", "Sotra", "Vestre Aker"],
      final: ["Bergen", "Kristiansand", "Frogner", "Moss", "Haugerud", "Sotra", "Sandefjord", "Vestre Aker"],
    },
  },
  "2024-25": {
    season: "2024/2025",
    source: "https://www.badminton.no/contentassets/071fd88d2d5b4e908d919531979608d0/spillere-i-eliteserien-2024-25.pdf",
    rankingNote: seasonEndNote("2024/2025", 2024, 2025),
    rounds: [
      { name: "Lillerunden", from: "2024-11-16", to: "2024-11-17", ranking: "2002023" },
      { name: "Storrunden", from: "2025-01-25", to: "2025-01-26", ranking: "2002024" },
      { name: "Sluttspill", from: "2025-04-05", to: "2025-04-06", ranking: "2002024" },
    ],
    standings: {
      regular: ["Bergen", "Kristiansand", "Moss", "Frogner", "Haugerud", "Sotra", "Sandefjord", "OSI"],
      final: ["Kristiansand", "Bergen", "Frogner", "Moss", "Haugerud", "Sotra", "Sandefjord", "OSI"],
    },
  },
  "2025-26": {
    season: "2025/2026",
    source: "https://www.badminton.no/siteassets/dokumenter/eliteserie/spillere-i-eliteserien-2025-26-1.pdf",
    rounds: [
      { name: "Lillerunden", from: "2025-11-15", to: "2025-11-16", ranking: "2002025-2025-11-14" },
      { name: "Storrunden", from: "2026-01-24", to: "2026-01-25", ranking: "2002025-2026-01-23" },
      { name: "Sluttspill", from: "2026-03-21", to: "2026-03-22", ranking: "2002025-2026-03-20" },
    ],
    standings: {
      regular: ["Bergen", "Kristiansand", "Moss", "Haugerud", "Sotra", "Frogner", "NTNUI", "Sandefjord"],
      final: ["Kristiansand", "Bergen", "Haugerud", "Moss", "Sotra", "Frogner", "NTNUI", "Sandefjord"],
    },
  },
};
const KEY = process.argv[2];
if (!KEY) {
  for (const key of Object.keys(SEASONS)) execFileSync(process.execPath, [process.argv[1], key], { stdio: "inherit" });
  process.exit(0);
}
if (!SEASONS[KEY]) throw new Error(`Unknown season ${KEY} (${Object.keys(SEASONS).join(", ")})`);
const CONFIG = SEASONS[KEY];
const SEASON = CONFIG.season;
const ROSTER = `${DIR}eliteserien-${KEY}.txt`;
const SOURCE = CONFIG.source;
const ROUNDS = CONFIG.rounds;
const STANDINGS = CONFIG.standings;
// The season's Eliteserien ties
const { ties } = seasonTies(KEY.slice(0, 4));
const roundOf = (day) => ROUNDS.find((r) => day >= r.from && day <= r.to);

// Current ratings: names, clubs, genders and the lowest ratings for players without a rating
const players0 = currentPlayers();
const { current, replacement } = players0;

// Teams: the list, plus players who played for a team without being on its list (available from
// their first match), and players listed for one team who played for another moved to that one.
const teams = readRoster(ROSTER).map((t) => ({ ...t, players: t.players.map((p) => ({ ...p, from: null })) }));
const changes = applyPlayed(teams, ties, current);

// Best lineups of every team before each round
const roundTeams = new Map(); // round name -> team -> { players, lineup }
for (const round of ROUNDS) {
  const source = sourceAt(round.from, `${DIR}data/ranking/${round.ranking}.json`, players0);
  const rated = teams.map((t) => ({
    team: t.team,
    players: t.players.filter((p) => !p.from || p.from <= round.to).map((p) => playerRatings(p, source)),
  }));
  const ref = references(rated);
  const byTeam = new Map();
  for (const t of rated) {
    byTeam.set(t.team, { ...t, lineup: bestLineup(t.players.filter((p) => p.gender === "M"), t.players.filter((p) => p.gender === "K"), ref) });
  }
  roundTeams.set(round.name, { byTeam, ref, period: source.period });
}

const round2 = (x, d = 2) => Math.round(x * 10 ** d) / 10 ** d;

// Seasons before the golden set (2021/22) left a play-off tie at 4-4 drawn
const GOLDEN = CONFIG.goldenSet !== false;
// A listed match that wasn't played (the tie had already been decided): its win chance from the
// players' ratings before the round
const RATING_OF = { MensSingles: "singles", WomensSingles: "singles", MensDoubles: "doubles", WomensDoubles: "doubles", MixedDoubles: "mixed" };
function listedChance(game, home, away) {
  const side = (players, team) => sideRating(players.map((p) => team.players.find((x) => x.id === p.id)?.[RATING_OF[game.discipline]] ?? replacementFor(game.discipline, p)));
  return win(side(game.side1, home), side(game.side2, away), POOL_OF[game.discipline]);
}
function replacementFor(discipline, p) {
  const male = current.get(p.id)?.gender !== "K";
  return { MensSingles: replacement.men, WomensSingles: replacement.women, MensDoubles: replacement.mensDoubles, WomensDoubles: replacement.womensDoubles, MixedDoubles: male ? replacement.mixedM : replacement.mixedK }[discipline];
}

const players = new Map(); // id -> { name, team, games, expected, won }
const tieResults = ties.map((tie) => {
  const round = roundOf(tie.day);
  const { byTeam } = roundTeams.get(round.name);
  const home = byTeam.get(tie.home);
  const away = byTeam.get(tie.away);
  // Potential: both teams at their best
  const potentialChances = SLOTS.map((s) => win(home.lineup[s.key].rating, away.lineup[s.key].rating, SLOT_POOL[s.type]));
  const playoff = isPlayoff(tie);
  let potential = tieOdds(potentialChances);
  if (playoff && GOLDEN) potential = decided(potential, goldenSet((key) => potentialChances[SLOTS.findIndex((s) => s.key === key)]));
  // What was played: win chance from right before each match, and the result
  const games = [];
  for (const game of tie.games) {
    const slot = GAME_SLOTS[game.game];
    const log = game.winner && !game.walkover ? loggedGame(tie, game) : null;
    if (!slot || !log) continue;
    games.push({ slot, chance: log.winChance, won: game.winner === 1 ? 1 : 0, side1: game.side1.map((p) => p.id), side2: game.side2.map((p) => p.id) });
    for (const [side, team, chance, won] of [[game.side1, tie.home, log.winChance, game.winner === 1], [game.side2, tie.away, 1 - log.winChance, game.winner === 2]]) {
      for (const p of side) {
        const stats = players.get(p.id) ?? { id: p.id, name: current.get(p.id)?.name ?? p.name, team, games: 0, expected: 0, won: 0 };
        stats.games++;
        stats.expected += chance;
        stats.won += won ? 1 : 0;
        players.set(p.id, stats);
      }
    }
  }
  // With the lineups played: the matches compared, plus walkovers
  const walkovers = [1, 2].map((side) => tie.games.filter((g) => g.walkover && g.winner === side && GAME_SLOTS[g.game]).length);
  let played = playedOdds(games.map((g) => g.chance), walkovers);
  const homeWon = tie.games.filter((g) => g.winner === 1).length;
  const awayWon = tie.games.filter((g) => g.winner === 2).length;
  if (playoff) {
    // The lineups listed, with the unplayed matches' chances from the ratings before the round
    const chances = new Map(games.map((g) => [g.slot, g.chance]));
    for (const game of tie.games) {
      const slot = GAME_SLOTS[game.game];
      if (slot && !game.winner && game.side1.length && game.side2.length) chances.set(slot, listedChance(game, home, away));
    }
    played = playedOdds([...chances.values()], walkovers);
    if (GOLDEN) played = decided(played, goldenSet((key) => chances.get(key) ?? 0.5));
  }
  const golden = tie.goldenSet && {
    discipline: tie.goldenSet.discipline,
    side1: tie.goldenSet.side1.map((p) => current.get(p.id)?.name ?? p.name),
    side2: tie.goldenSet.side2.map((p) => current.get(p.id)?.name ?? p.name),
    winner: tie.goldenSet.winner,
    score: tie.goldenSet.score,
  };
  const winner = homeWon > awayWon ? 1 : homeWon < awayWon ? 2 : (golden?.winner ?? 0);
  const oddsOut = (o) => ({
    expected: round2(o.expected), win: round2(o.win), draw: round2(o.draw), loss: round2(o.loss), points: round2(o.points),
    ...(o.golden && { drawBefore: round2(o.drawBefore), golden: { slot: o.golden.slot, discipline: o.golden.discipline, chance: round2(o.golden.chance) } }),
  });
  return {
    matchId: tie.matchId,
    day: tie.day,
    round: round.name,
    group: tie.group,
    home: tie.home,
    away: tie.away,
    playoff,
    score: [homeWon, awayWon], // every decided match, walkovers included (a golden set not counted)
    winner, // 1 home, 2 away, 0 draw
    goldenSet: golden ?? null,
    // points: the home team's expected table points (the away team's are 4 minus them)
    potential: oddsOut(potential),
    points: [tablePoints(homeWon), tablePoints(awayWon)],
    // The same with the lineups actually played (home team's view; walkovers as certain wins)
    played: oddsOut(played),
    // Over the matches compared (no walkovers or unplayed matches)
    compared: games.length,
    expected: round2(games.reduce((sum, g) => sum + g.chance, 0)),
    won: games.reduce((sum, g) => sum + g.won, 0),
    potentialCompared: round2(games.reduce((sum, g) => sum + potentialChances[SLOTS.findIndex((s) => s.key === g.slot)], 0)),
    games,
  };
});

// Per team over the season, from the team's side of each tie (matches compared only)
const teamResults = teams.map((t) => {
  const own = tieResults.flatMap((r) => {
    if (r.home === t.team) return [{ potential: r.potentialCompared, expected: r.expected, won: r.won, matches: r.compared }];
    if (r.away === t.team) return [{ potential: r.compared - r.potentialCompared, expected: r.compared - r.expected, won: r.compared - r.won, matches: r.compared }];
    return [];
  });
  const sum = (key) => own.reduce((s, x) => s + x[key], 0);
  // Table points in the regular season: expected with both teams at their best, and actual
  const regular = tieResults.filter((r) => !r.playoff && (r.home === t.team || r.away === t.team));
  const home = (r) => r.home === t.team;
  return {
    team: t.team,
    potentialPoints: round2(regular.reduce((s, r) => s + (home(r) ? r.potential.points : 4 - r.potential.points), 0), 1),
    points: regular.reduce((s, r) => s + r.points[home(r) ? 0 : 1], 0),
    ties: own.length,
    matches: sum("matches"),
    potential: round2(sum("potential"), 1),
    expected: round2(sum("expected"), 1),
    won: sum("won"),
    regularRank: STANDINGS.regular.indexOf(t.team) + 1,
    finalRank: STANDINGS.final.indexOf(t.team) + 1,
  };
}).sort((a, b) => b.won - b.potential - (a.won - a.potential));

// Before the season: team strengths with the ratings and ranking before the first round
const first = roundTeams.get(ROUNDS[0].name).byTeam;
// The predicted regular-season table: expected table points from one tie against each team
const preseason = [...first.values()].map((a) => {
  const odds = [...first.values()].filter((b) => b !== a).map((b) => tieOdds(SLOTS.map((s) => win(a.lineup[s.key].rating, b.lineup[s.key].rating, SLOT_POOL[s.type]))));
  const mean = (key) => odds.reduce((s, o) => s + o[key], 0) / odds.length;
  return { team: a.team, tablePoints: round2(mean("points") * odds.length, 1), expected: round2(mean("expected")), win: round2(mean("win")) };
}).sort((a, b) => b.tablePoints - a.tablePoints || b.expected - a.expected).map((t, i) => ({ rank: i + 1, ...t, regularRank: STANDINGS.regular.indexOf(t.team) + 1, finalRank: STANDINGS.final.indexOf(t.team) + 1 }));

const lineupOut = (lineup) => Object.fromEntries(SLOTS.map((s) => [s.key, { rating: Math.round(lineup[s.key].rating), players: lineup[s.key].players.map((p) => p.id ?? p.listName) }]));
const out = {
  key: KEY,
  season: SEASON,
  rankingNote: CONFIG.rankingNote ?? null,
  source: SOURCE,
  generatedAt: new Date().toISOString(),
  rounds: ROUNDS.map((r) => ({ ...r, rankingPeriod: roundTeams.get(r.name).period })),
  standings: STANDINGS,
  changes,
  preseason: preseason.map((t) => ({ ...t, points: teamResults.find((r) => r.team === t.team).points })),
  teams: teamResults,
  bestLineups: Object.fromEntries(ROUNDS.map((r) => [r.name, Object.fromEntries([...roundTeams.get(r.name).byTeam].map(([team, t]) => [team, lineupOut(t.lineup)]))])),
  ties: tieResults,
  players: [...players.values()].map((p) => ({ ...p, expected: round2(p.expected), diff: round2(p.won - p.expected) })).sort((a, b) => b.diff - a.diff),
};
writeFileSync(`${DIR}data/eliteserien-${KEY}.json`, JSON.stringify(out, null, 1));

console.log(`\nEliteserien ${SEASON}: ${ties.length} ties, ${tieResults.reduce((s, r) => s + r.compared, 0)} matches compared.`);
if (changes.length) console.log(`Team changes against the list: ${changes.map((c) => `${c.name} (${c.team}, ${c.change})`).join("; ")}`);
console.log("\nBefore the season (ratings before Lillerunden): rank, team, expected matches per tie, regular season and final rank");
for (const t of out.preseason) console.log(`${t.rank}. ${t.team.padEnd(13)} ${t.tablePoints.toFixed(1).padStart(4)} points (actual ${t.points})  ${t.expected.toFixed(2)} matches   regular ${t.regularRank}, final ${t.finalRank}`);
console.log("\nOver the season (matches compared): potential = best lineups, expected = lineups played, won");
for (const t of teamResults) console.log(`${t.team.padEnd(13)} ${t.ties} ties  potential ${t.potential.toFixed(1)}  expected ${t.expected.toFixed(1)}  won ${t.won}  (won − potential ${(t.won - t.potential).toFixed(1)})  regular-season points: potential ${t.potentialPoints.toFixed(1)}, actual ${t.points}`);
console.log("\nPlayers (4+ matches), most above and below expectation:");
const regular = out.players.filter((p) => p.games >= 4);
for (const p of [...regular.slice(0, 6), ...regular.slice(-6)]) console.log(`${(p.diff >= 0 ? "+" : "") + p.diff.toFixed(2)}  ${p.name} (${p.team}): won ${p.won} of ${p.games}, expected ${p.expected.toFixed(2)}`);
