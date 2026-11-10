// This season's Eliteserien as it goes (eliteserien.mjs): the real table from the ties played, and a forecast of the
// rest, simulated SIMS times from the teams' best lineups: the regular season's ties still to play (the group's
// schedule), then the play-offs. Also what's at stake in the next day's ties, the play-off picture, the results with
// the chances given the night before, the season's players against expectation and its biggest upsets, and who may
// play in the play-offs; the ties after the next day, from badmintonportalen's schedule, with their chances.
//
// Rules (pipeline/README.md, "Eliteserien"):
// - Table points per tie: 6-2 or better 4-0, 5-3 3-1, 4-4 2-2 (tablePoints). Teams level on points are ranked by
//   match difference, then set difference, then rally difference. Simulated ties have matches but no sets, so
//   their sets and rallies are the real ones so far; still level, a coin decides.
// - The play-offs (Sluttspill): 1–4 and 5–8, semi-finals 1 v 4 and 2 v 3 (5 v 8, 6 v 7), then a final and a match
//   for 3rd (5th, 7th). A play-off tie has no draw: at 4-4 a golden set decides (eliteserien-season.mjs).
// - 8th is relegated; 7th plays the qualification against 1. divisjon teams.
// - A player who played no match for the team in the regular season (Lillerunden and Storrunden) may not play in
//   the play-offs. While a team has regular-season ties left, all its players might still play.
import { SLOTS, SLOT_POOL, bestLineup, tablePoints, tieOdds, win } from "./eliteserien.mjs";
import { decided, goldenSet, isPlayoff } from "./eliteserien-season.mjs";

export const SIMS = 20_000;
const ROUND_NAMES = ["Lillerunden", "Storrunden", "Sluttspill"];
/** Outcomes followed for what's at stake: the title, the top 4 (the play-offs for the title), 7th and 8th */
const OUTCOMES = ["champion", "top4", "qualification", "relegated"];
const r3 = (x) => Math.round(x * 1000) / 1000;
const r2 = (x) => Math.round(x * 100) / 100;

/** A seeded random number generator (mulberry32), so the same data gives the same forecast */
export function random(seed = 20261114) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The season's rounds from the scheduled (or played) days: runs of days a week or more apart, the play-offs last */
export function seasonRounds(days, playoffDays) {
  const sorted = [...new Set(days)].sort();
  const runs = [];
  for (const day of sorted) {
    const last = runs.at(-1);
    if (last && (Date.parse(day) - Date.parse(last.to)) / 86_400_000 < 7) last.to = day;
    else runs.push({ from: day, to: day });
  }
  return runs.map((r, i) => ({ name: [...playoffDays].some((d) => d >= r.from && d <= r.to) ? ROUND_NAMES[2] : (ROUND_NAMES[i] ?? `Round ${i + 1}`), ...r }));
}

/** Sets and rallies won by each side in a game's score ("21/15,18/21,21/12") */
function setsAndRallies(score) {
  const out = { sets: [0, 0], rallies: [0, 0] };
  for (const set of (score ?? "").split(",")) {
    const m = set.match(/^(\d+)\/(\d+)$/);
    if (!m) continue;
    const [a, b] = [+m[1], +m[2]];
    out.sets[a > b ? 0 : 1]++;
    out.rallies[0] += a;
    out.rallies[1] += b;
  }
  return out;
}

/** The regular-season table from the ties played: per team, played, won, drawn, lost, matches, sets, rallies and points */
export function realTable(teamNames, ties) {
  const rows = new Map(teamNames.map((team) => [team, { team, played: 0, won: 0, drawn: 0, lost: 0, matches: [0, 0], sets: [0, 0], rallies: [0, 0], points: 0 }]));
  for (const tie of ties) {
    const home = rows.get(tie.home);
    const away = rows.get(tie.away);
    if (!home || !away) continue;
    const won = [tie.games.filter((g) => g.winner === 1).length, tie.games.filter((g) => g.winner === 2).length];
    for (const [row, own, other] of [[home, 0, 1], [away, 1, 0]]) {
      row.played++;
      row[won[own] > won[other] ? "won" : won[own] < won[other] ? "lost" : "drawn"]++;
      row.matches[0] += won[own];
      row.matches[1] += won[other];
      row.points += tablePoints(won[own], won[0] + won[1]);
    }
    for (const game of tie.games) {
      const { sets, rallies } = setsAndRallies(game.score);
      for (const [row, i] of [[home, 0], [away, 1]]) {
        row.sets[0] += sets[i];
        row.sets[1] += sets[1 - i];
        row.rallies[0] += rallies[i];
        row.rallies[1] += rallies[1 - i];
      }
    }
  }
  return rows;
}
const diff = (pair) => pair[0] - pair[1];

/** Sample a value index from a distribution (chances adding up to 1) */
function sample(dist, rand) {
  let x = rand();
  for (let i = 0; i < dist.length; i++) {
    x -= dist[i];
    if (x < 0) return i;
  }
  return dist.length - 1;
}

/** Odds of a tie between two lineups (home first): regular season (with the score distribution) or play-off (no draw) */
export function lineupOdds(home, away, playoff) {
  const chances = SLOTS.map((s) => win(home[s.key].rating, away[s.key].rating, SLOT_POOL[s.type]));
  const odds = tieOdds(chances);
  return playoff ? decided(odds, goldenSet((key) => chances[SLOTS.findIndex((s) => s.key === key)])) : odds;
}

/** A team's lineup from some of its players, padded with replacement-level players when too few are left (3 men and 3 women are needed) */
function lineupFrom(players, ref, replacement) {
  const men = players.filter((p) => p.gender === "M");
  const women = players.filter((p) => p.gender === "K");
  const pad = (list, gender) => {
    const out = [...list];
    const r = gender === "M" ? { singles: replacement.men, doubles: replacement.mensDoubles, mixed: replacement.mixedM } : { singles: replacement.women, doubles: replacement.womensDoubles, mixed: replacement.mixedK };
    while (out.length < 3) out.push({ gender, id: null, listName: `replacement ${gender}${out.length}`, name: null, ...r, points: { singles: 0, mixed: 0 }, replacement: true });
    return out;
  };
  return bestLineup(pad(men, "M"), pad(women, "K"), ref);
}

/**
 * The season so far and the forecast. `teams`: [{ team, players (playerRatings'), lineup }] with their best lineups
 * (bestLineup, `ref`); `groups`: the season's groups with their schedules; `ties`: the ties played (eliteserien-season.mjs);
 * `history`: the earlier snapshots ([{ key, ... }]); `chanceOf(tie, game)`: a game's win chance for side 1 from right
 * before it (null if not known). Returns { forecast, snapshot }.
 */
export function forecastSeason({ teams, ref, replacement, groups, ties, history = [], chanceOf, rand = random() }) {
  const names = teams.map((t) => t.team);
  const byName = new Map(teams.map((t) => [t.team, t]));
  const regularGroup = groups.find((g) => !isPlayoff(g));
  const regularPlayed = ties.filter((t) => !isPlayoff(t));
  const playedIds = new Set(ties.map((t) => t.matchId));
  // The regular season's ties: the schedule (or, without one, the ties played)
  const schedule = (regularGroup?.schedule ?? regularPlayed).map((s) => ({ matchId: s.matchId, time: s.time, home: s.home, away: s.away }));
  const remaining = schedule.filter((s) => !playedIds.has(s.matchId) && byName.has(s.home) && byName.has(s.away));
  const playoffGroups = groups.filter(isPlayoff).sort((a, b) => a.group.localeCompare(b.group));
  const playoffDays = playoffGroups.flatMap((g) => (g.schedule ?? []).map((s) => s.time.slice(0, 10)));
  const allDays = [...schedule.map((s) => s.time.slice(0, 10)), ...ties.map((t) => t.day), ...playoffDays];
  const rounds = seasonRounds(allDays, new Set([...playoffDays, ...ties.filter(isPlayoff).map((t) => t.day)]));
  const roundOf = (day) => rounds.find((r) => day >= r.from && day <= r.to)?.name ?? null;

  // Who has played in the regular season, per team; and the teams with regular-season ties left
  const appearances = new Map(); // `${team}|${id}` -> matches
  for (const tie of regularPlayed) {
    for (const game of tie.games) {
      for (const [side, team] of [[game.side1, tie.home], [game.side2, tie.away]]) {
        for (const p of side) appearances.set(`${team}|${p.id}`, (appearances.get(`${team}|${p.id}`) ?? 0) + 1);
      }
    }
  }
  const tiesLeft = new Map(names.map((n) => [n, remaining.filter((s) => s.home === n || s.away === n).length]));
  const eligibility = (team, p) => {
    const played = p.id ? (appearances.get(`${team}|${p.id}`) ?? 0) : 0;
    return { played, status: played > 0 ? "eligible" : tiesLeft.get(team) > 0 ? "mustPlay" : "ineligible" };
  };
  // Play-off lineups: from the players who may still play in the play-offs
  for (const t of teams) {
    const eligible = t.players.filter((p) => eligibility(t.team, p).status !== "ineligible");
    t.playoffLineup = eligible.length === t.players.length ? t.lineup : lineupFrom(eligible, ref, replacement);
  }

  // Odds between every two teams: regular season (score distribution) and play-off (no draw)
  const regularOdds = new Map();
  const playoffOdds = new Map();
  for (const a of teams) {
    for (const b of teams) {
      if (a === b) continue;
      regularOdds.set(`${a.team}|${b.team}`, lineupOdds(a.lineup, b.lineup, false));
      playoffOdds.set(`${a.team}|${b.team}`, lineupOdds(a.playoffLineup, b.playoffLineup, true));
    }
  }

  // The real table so far
  const table = realTable(names, regularPlayed);
  const realOrder = (rows, tiebreak = () => 0) =>
    [...rows].sort((a, b) => b.points - a.points || diff(b.matches) - diff(a.matches) || diff(b.sets) - diff(a.sets) || diff(b.rallies) - diff(a.rallies) || tiebreak(a, b));

  // The play-offs: each bracket's ties in the schedule's order (semi-final 1, semi-final 2, final, 3rd place), with
  // the real ones played; without a schedule, the ties played in order
  const brackets = [0, 1].map((i) => {
    const group = playoffGroups[i];
    const played = ties.filter((t) => isPlayoff(t) && t.group === group?.group);
    const slots = (group?.schedule ?? played).map((s) => played.find((t) => t.matchId === s.matchId) ?? { matchId: s.matchId, time: s.time, home: s.home, away: s.away });
    return { name: i === 0 ? "1-4" : "5-8", group: group?.group ?? null, slots };
  });
  const tieWinner = (tie) => {
    const home = tie.games.filter((g) => g.winner === 1).length;
    const away = tie.games.filter((g) => g.winner === 2).length;
    return home > away ? tie.home : home < away ? tie.away : tie.goldenSet?.winner === 1 ? tie.home : tie.goldenSet?.winner === 2 ? tie.away : null;
  };
  // A play-off tie between two teams: the real winner if it was played between them, else drawn from the odds
  const playoffTie = (slot, home, away) => {
    if (slot?.games && slot.home === home && slot.away === away) return tieWinner(slot) ?? home;
    if (slot?.games && slot.home === away && slot.away === home) return tieWinner(slot) ?? away;
    return rand() < playoffOdds.get(`${home}|${away}`).win ? home : away;
  };
  // A simulated play-off tie, noted when it's one of the next day's (its teams are known then)
  let simResults = null;
  const playoffResult = (slot, home, away) => {
    const winner = playoffTie(slot, home, away);
    const i = slot ? nextIndex.get(slot.matchId) : undefined;
    if (i !== undefined && simResults) simResults.set(i, winner === nextTies[i].home ? 0 : 2);
    return winner;
  };

  // The next day with ties to play: the regular season's, or the play-offs' with their teams known
  const regularDone = remaining.length === 0;
  const realRanked = realOrder([...table.values()], (a, b) => a.team.localeCompare(b.team));
  const knownPlayoff = [];
  if (regularDone) {
    for (const [i, bracket] of brackets.entries()) {
      const seeds = realRanked.slice(i * 4, i * 4 + 4).map((r) => r.team);
      const [s1, s2, fin, third] = bracket.slots;
      const semis = [[s1, seeds[0], seeds[3]], [s2, seeds[1], seeds[2]]];
      for (const [slot, home, away] of semis) if (slot && !slot.games) knownPlayoff.push({ ...slot, home, away, stage: slot === s1 ? "semi1" : "semi2", bracket: bracket.name });
      const winners = semis.map(([slot]) => (slot?.games ? tieWinner(slot) : null));
      if (winners.every(Boolean)) {
        const losers = semis.map(([slot], k) => (winners[k] === slot.home ? slot.away : slot.home));
        if (fin && !fin.games) knownPlayoff.push({ ...fin, home: winners[0], away: winners[1], stage: "final", bracket: bracket.name });
        if (third && !third.games) knownPlayoff.push({ ...third, home: losers[0], away: losers[1], stage: "third", bracket: bracket.name });
      }
    }
  }
  const upcoming = regularDone ? knownPlayoff : remaining;
  const nextDay = upcoming.map((s) => s.time.slice(0, 10)).sort()[0] ?? null;
  const nextTies = nextDay ? upcoming.filter((s) => s.time.slice(0, 10) === nextDay).sort((a, b) => a.time.localeCompare(b.time) || a.matchId - b.matchId) : [];

  // The simulations
  const n = names.length;
  const counts = new Map(names.map((t) => [t, { regular: Array(n).fill(0), final: Array(n).fill(0), points: 0, top4: 0, final2: 0, champion: 0, qualification: 0, relegated: 0 }]));
  const seedCounts = [0, 1].map(() => Array.from({ length: 4 }, () => new Map())); // bracket -> seed -> team -> count
  // What's at stake: per next tie, per result (home win, draw, away win), the outcomes of each of its teams
  const stakes = nextTies.map(() => [0, 1, 2].map(() => ({ n: 0, home: Object.fromEntries(OUTCOMES.map((o) => [o, 0])), away: Object.fromEntries(OUTCOMES.map((o) => [o, 0])) })));
  const nextIndex = new Map(nextTies.map((s, i) => [s.matchId, i]));
  for (let sim = 0; sim < SIMS; sim++) {
    const rows = new Map([...table.values()].map((r) => [r.team, { ...r, matches: [...r.matches], noise: rand() }]));
    const results = new Map(); // next tie index -> 0 home win, 1 draw, 2 away win
    simResults = results;
    for (const s of remaining) {
      const odds = regularOdds.get(`${s.home}|${s.away}`);
      const won = sample(odds.dist, rand);
      const home = rows.get(s.home);
      const away = rows.get(s.away);
      home.points += tablePoints(won);
      away.points += tablePoints(8 - won);
      home.matches[0] += won;
      home.matches[1] += 8 - won;
      away.matches[0] += 8 - won;
      away.matches[1] += won;
      if (nextIndex.has(s.matchId)) results.set(nextIndex.get(s.matchId), won > 4 ? 0 : won === 4 ? 1 : 2);
    }
    const ranked = realOrder([...rows.values()], (a, b) => a.noise - b.noise).map((r) => r.team);
    const final = [];
    for (const [i, bracket] of brackets.entries()) {
      const seeds = ranked.slice(i * 4, i * 4 + 4);
      seeds.forEach((team, k) => seedCounts[i][k].set(team, (seedCounts[i][k].get(team) ?? 0) + 1));
      const [s1, s2, fin, third] = bracket.slots;
      const w1 = playoffResult(s1, seeds[0], seeds[3]);
      const w2 = playoffResult(s2, seeds[1], seeds[2]);
      const l1 = w1 === seeds[0] ? seeds[3] : seeds[0];
      const l2 = w2 === seeds[1] ? seeds[2] : seeds[1];
      const champion = playoffResult(fin, w1, w2);
      const third3 = playoffResult(third, l1, l2);
      final.push(champion, champion === w1 ? w2 : w1, third3, third3 === l1 ? l2 : l1);
    }
    ranked.forEach((team, place) => {
      const c = counts.get(team);
      c.regular[place]++;
      c.points += rows.get(team).points;
      if (place < 4) c.top4++;
    });
    final.forEach((team, place) => {
      const c = counts.get(team);
      c.final[place]++;
      if (place <= 1) c.final2++;
      if (place === 0) c.champion++;
      if (place === 6) c.qualification++;
      if (place === 7) c.relegated++;
    });
    for (const [i, result] of results) {
      const s = nextTies[i];
      const bucket = stakes[i][result];
      bucket.n++;
      for (const [side, team] of [["home", s.home], ["away", s.away]]) {
        const place = final.indexOf(team);
        if (place === 0) bucket[side].champion++;
        if (ranked.indexOf(team) < 4) bucket[side].top4++;
        if (place === 6) bucket[side].qualification++;
        if (place === 7) bucket[side].relegated++;
      }
    }
  }
  const share = (x) => r3(x / SIMS);

  // The table: the real one (ranked as the league ranks it; before any tie, by expected points), with the forecast
  const expected = new Map(names.map((t) => [t, counts.get(t).points / SIMS]));
  const ordered = realOrder([...table.values()], (a, b) => expected.get(b.team) - expected.get(a.team));
  const tableOut = ordered.map((row, i) => {
    const c = counts.get(row.team);
    return {
      place: i + 1,
      ...row,
      expectedPoints: r2(c.points / SIMS),
      regularPlaces: c.regular.map(share),
      finalPlaces: c.final.map(share),
      top4: share(c.top4),
      final: share(c.final2),
      champion: share(c.champion),
      qualification: share(c.qualification),
      relegated: share(c.relegated),
    };
  });

  // What's at stake in the next ties: per team, the outcome whose chance changes most between winning and losing
  const nextOut = nextTies.map((s, i) => {
    const playoff = !!s.stage;
    const odds = playoff ? playoffOdds.get(`${s.home}|${s.away}`) : regularOdds.get(`${s.home}|${s.away}`);
    const [hw, dr, aw] = stakes[i];
    const at = (bucket, side, o) => (bucket.n ? r3(bucket[side][o] / bucket.n) : null);
    const stake = (side) => {
      const [winB, lossB] = side === "home" ? [hw, aw] : [aw, hw];
      const best = OUTCOMES.map((o) => ({ outcome: o, win: at(winB, side, o), draw: playoff ? null : at(dr, side, o), loss: at(lossB, side, o) }))
        .filter((x) => x.win !== null && x.loss !== null)
        .sort((a, b) => Math.abs(b.win - b.loss) - Math.abs(a.win - a.loss))[0];
      return best && Math.abs(best.win - best.loss) >= 0.01 ? best : null;
    };
    return {
      matchId: s.matchId,
      time: s.time,
      home: s.home,
      away: s.away,
      stage: s.stage ?? null,
      bracket: s.bracket ?? null,
      odds: { win: r3(odds.win), draw: r3(odds.draw), loss: r3(odds.loss), expected: r2(odds.expected), points: r2(odds.points) },
      stakes: { home: stake("home"), away: stake("away") },
    };
  });

  // The ties after the next day (badmintonportalen's schedule), with their chances
  const laterOut = upcoming
    .filter((s) => s.time.slice(0, 10) !== nextDay)
    .sort((a, b) => a.time.localeCompare(b.time) || a.matchId - b.matchId)
    .map((s) => {
      const odds = s.stage ? playoffOdds.get(`${s.home}|${s.away}`) : regularOdds.get(`${s.home}|${s.away}`);
      return { matchId: s.matchId, time: s.time, round: roundOf(s.time.slice(0, 10)), home: s.home, away: s.away, stage: s.stage ?? null, bracket: s.bracket ?? null, odds: { win: r3(odds.win), draw: r3(odds.draw), loss: r3(odds.loss), expected: r2(odds.expected) } };
    });

  // The play-off picture: each seed's most likely teams; each bracket's ties, real or still to play, with their odds
  const playoffsOut = brackets.map((bracket, i) => ({
    name: bracket.name,
    seeds: seedCounts[i].map((m, k) => ({
      seed: i * 4 + k + 1,
      teams: [...m].map(([team, c]) => ({ team, chance: share(c) })).filter((x) => x.chance >= 0.005).sort((a, b) => b.chance - a.chance).slice(0, 3),
    })),
    ties: bracket.slots.map((slot, k) => {
      const stage = ["semi1", "semi2", "final", "third"][k];
      const known = slot.games ? slot : knownPlayoff.find((x) => x.matchId === slot.matchId);
      const odds = known && byName.has(known.home) && byName.has(known.away) ? playoffOdds.get(`${known.home}|${known.away}`) : null;
      return {
        stage,
        matchId: slot.matchId,
        time: slot.time,
        home: known ? known.home : null,
        away: known ? known.away : null,
        score: slot.games ? [slot.games.filter((g) => g.winner === 1).length, slot.games.filter((g) => g.winner === 2).length] : null,
        winner: slot.games ? tieWinner(slot) : null,
        odds: odds && !slot.games ? { win: r3(odds.win), loss: r3(odds.loss) } : null,
      };
    }),
  }));

  // Results by day, with the chances the forecast gave the night before (the last snapshot before the day)
  // (The chances right before the tie: the last snapshot before it that had it among the next ties; the lineups, and so
  // the chances, are those of the night before)
  const order = new Map(ties.map((t, i) => [t.matchId, i]));
  const before = (tie) => {
    for (const h of [...history].reverse()) if ((h.played ?? 0) <= order.get(tie.matchId) && h.next?.[tie.matchId]) return h.next[tie.matchId];
    return null;
  };
  const resultsOut = [...Map.groupBy(ties, (t) => t.day)].map(([day, list]) => ({
    day,
    round: roundOf(day),
    ties: list.map((tie) => {
      const score = [tie.games.filter((g) => g.winner === 1).length, tie.games.filter((g) => g.winner === 2).length];
      const winner = tieWinner(tie);
      const odds = before(tie);
      const chance = odds && winner ? (winner === tie.home ? odds.win : odds.loss) : null;
      return { matchId: tie.matchId, time: tie.time, group: tie.group, home: tie.home, away: tie.away, score, winner: winner === tie.home ? 1 : winner === tie.away ? 2 : 0, goldenSet: !!tie.goldenSet, before: odds, upset: chance !== null && chance < 0.3 };
    }),
  }));

  // The season's players against expectation, and its biggest upsets (matches won with the smallest chance)
  const players = new Map();
  const upsets = [];
  for (const tie of ties) {
    for (const game of tie.games) {
      if (!game.winner || game.walkover) continue;
      const chance = chanceOf(tie, game);
      if (chance === null) continue;
      for (const [side, team, c, won] of [[game.side1, tie.home, chance, game.winner === 1], [game.side2, tie.away, 1 - chance, game.winner === 2]]) {
        for (const p of side) {
          const stats = players.get(p.id) ?? { id: p.id, name: p.name, team, games: 0, won: 0, expected: 0 };
          stats.games++;
          stats.won += won ? 1 : 0;
          stats.expected += c;
          players.set(p.id, stats);
        }
      }
      const winnerChance = game.winner === 1 ? chance : 1 - chance;
      if (winnerChance < 0.5) {
        const [w, l] = game.winner === 1 ? [game.side1, game.side2] : [game.side2, game.side1];
        upsets.push({
          matchId: tie.matchId,
          day: tie.day,
          game: game.game,
          discipline: game.discipline,
          team: game.winner === 1 ? tie.home : tie.away,
          opponent: game.winner === 1 ? tie.away : tie.home,
          winners: w.map((p) => ({ id: p.id, name: p.name })),
          losers: l.map((p) => ({ id: p.id, name: p.name })),
          chance: r3(winnerChance),
          score: game.winner === 1 ? game.score : (game.score ?? "").split(",").map((s) => s.split("/").reverse().join("/")).join(","),
        });
      }
    }
  }

  const lastDay = ties.map((t) => t.day).sort().at(-1) ?? null;
  const forecast = {
    sims: SIMS,
    rounds: rounds.map((r) => ({ ...r, ties: [...schedule, ...playoffGroups.flatMap((g) => g.schedule ?? [])].filter((s) => s.time.slice(0, 10) >= r.from && s.time.slice(0, 10) <= r.to).length || ties.filter((t) => t.day >= r.from && t.day <= r.to).length, played: ties.filter((t) => t.day >= r.from && t.day <= r.to).length })),
    lastDay,
    lastRound: lastDay ? roundOf(lastDay) : null,
    regular: { played: regularPlayed.length, total: schedule.length },
    table: tableOut,
    next: nextDay ? { day: nextDay, round: roundOf(nextDay), ties: nextOut } : null,
    later: laterOut,
    playoffs: playoffsOut,
    results: resultsOut.reverse(),
    players: [...players.values()].map((p) => ({ ...p, expected: r2(p.expected), diff: r2(p.won - p.expected) })).sort((a, b) => b.diff - a.diff),
    upsets: upsets.sort((a, b) => a.chance - b.chance).slice(0, 10),
  };
  // The snapshot after the last tie played (or before the season), for the chances over time and the chances given
  // before each tie
  const last = ties.at(-1);
  const snapshot = {
    key: last ? String(last.matchId) : "preseason",
    day: last?.day ?? null,
    round: last ? roundOf(last.day) : null,
    played: ties.length,
    tie: last ? { home: last.home, away: last.away, score: [last.games.filter((g) => g.winner === 1).length, last.games.filter((g) => g.winner === 2).length] } : null,
    teams: Object.fromEntries(tableOut.map((t) => [t.team, { champion: t.champion, top4: t.top4, qualification: t.qualification, relegated: t.relegated, expectedPoints: t.expectedPoints }])),
    next: Object.fromEntries(nextOut.map((s) => [s.matchId, s.odds])),
  };
  return { forecast, snapshot, eligibility };
}
