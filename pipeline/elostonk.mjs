// EloStonk, the site's fantasy game (README: "EloStonk"): the files the game reads, written by export.mjs into
// export/elostonk/ and uploaded with the rest of the site's data.
//
// A round runs Friday to Thursday (Norwegian days) and locks at the start of its Friday. A player's points in a round
// are how much better than expected they did in its matches, over every discipline, by the match's day: each match
// scores 100 × (result − their chance of winning it), so a win at a 20 % chance is +80, a win at 90 % +10 and a loss at
// 90 % −90 (a draw: 0.5). That is what moves a rating, but on the same scale at every level: the rating change itself is
// up to 3 times bigger for low ratings (rules.mjs, the current rating multiplier), which would make picking low-rated
// players the whole game. Losses count, so points can be negative. Only players who can be picked are scored:
// 18 or older this year (a known birth year) and active in a discipline (a match in the last 12 months).
//
//   elostonk/players.json         { minAge, rounds: [the last ROUNDS Fridays, newest first], players: [[id, name, club,
//                                  gender, birthYear, { pool: [rating, rank] }, [points in each of those rounds],
//                                  [[cup2000Id, tournament, startDate], …] (drawn in, not over)], …] }
//   elostonk/rounds/<Friday>.json { round, final, points: { id: [points, matches] } } for the last SCORED rounds: late
//                                  results change a recent round, so each is written again until it's final (3 weeks)
//
// The game's database (Supabase, supabase/migrations/*_elostonk.sql) imports both every night (stonk_import()).
// No generatedAt in them: a file whose content hasn't changed isn't uploaded again.

/** The youngest age a player can be picked at (in step with the database's stonk_min_age setting) */
export const MIN_AGE = 18;
/** Rounds in players.json (each player's recent points) and rounds written as files (still changing with late results) */
const ROUNDS = 8;
const SCORED = 6;
/** A round is final this many days after it ended */
const FINAL_DAYS = 21;

/** A day ("2026-11-20") moved by `n` days */
const addDays = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
/** The round a day is in: its Friday */
export function roundOf(day) {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay(); // Sunday 0 … Saturday 6
  return addDays(day, -((weekday - 5 + 7) % 7));
}
/** Today in Norway */
export const osloToday = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Oslo" });

/**
 * The game's files. `byPlayer`: id → { pool: rating entry } (ratings.json); `matchesOf(id)`: the player's match logs per
 * pool (data/matches/<id>.json); `birthYears`: id → year; `tournaments`: the drawn tournaments (upcoming.json's) with
 * `entriesOf(cup2000Id)` giving each one's events.
 */
export function stonkFiles({ byPlayer, matchesOf, birthYears, tournaments, entriesOf, today = osloToday() }) {
  const youngest = +today.slice(0, 4) - MIN_AGE;
  const current = roundOf(today);
  const rounds = Array.from({ length: ROUNDS }, (_, i) => addDays(current, -7 * i));
  const first = rounds.at(-1);

  // Who can be picked, and their points per round
  const eligible = [];
  const points = new Map(rounds.map((r) => [r, {}]));
  for (const [id, entries] of byPlayer) {
    const born = birthYears[id];
    const list = Object.values(entries);
    if (!born || born > youngest || !list.some((p) => p.active)) continue;
    const perRound = new Map();
    const logs = matchesOf(id);
    for (const pool of Object.keys(entries)) {
      for (const m of logs[pool]?.all ?? []) {
        if (m.day < first) break; // newest first
        const round = roundOf(m.day);
        if (!points.has(round)) continue;
        const [p, n] = perRound.get(round) ?? [0, 0];
        perRound.set(round, [p + 100 * (m.result - m.winChance), n + 1]);
      }
    }
    for (const [round, [p, n]] of perRound) points.get(round)[id] = [Math.round(p * 10) / 10, n];
    eligible.push({ id, entries, born, perRound });
  }

  // The drawn tournaments not over yet, and who is entered in each
  const upcoming = new Map(); // player id → [[cup2000Id, name, startDate], …]
  for (const t of tournaments ?? []) {
    if (t.cancelled || !t.startDate || (t.endDate ?? t.startDate) < today) continue;
    const ids = new Set();
    for (const e of entriesOf(t.cup2000Id)?.events ?? []) for (const entry of e.entries) if (!entry.withdrew) for (const p of entry.players) if (p.id) ids.add(p.id);
    for (const id of ids) {
      if (!upcoming.has(id)) upcoming.set(id, []);
      upcoming.get(id).push([t.cup2000Id, t.name, t.startDate]);
    }
  }

  const players = eligible
    .map(({ id, entries, born, perRound }) => {
      const list = Object.values(entries);
      return [
        id,
        list[0].name,
        list[0].club ?? null,
        list[0].gender ?? null,
        born,
        Object.fromEntries(Object.entries(entries).map(([pool, p]) => [pool, [Math.round(p.rating), p.rank]])),
        rounds.map((r) => (perRound.has(r) ? Math.round(perRound.get(r)[0] * 10) / 10 : 0)),
        (upcoming.get(id) ?? []).sort((a, b) => a[2].localeCompare(b[2])),
      ];
    })
    .sort((a, b) => a[1].localeCompare(b[1], "nb"));

  const files = [{ path: "elostonk/players.json", value: { minAge: MIN_AGE, rounds, players } }];
  for (const round of rounds.slice(0, SCORED)) {
    const final = addDays(round, 6 + FINAL_DAYS) < today;
    files.push({ path: `elostonk/rounds/${round}.json`, value: { round, final, points: points.get(round) } });
  }
  return files;
}
