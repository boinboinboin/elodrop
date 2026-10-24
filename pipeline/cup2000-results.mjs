// Results of tournaments being played, from their Cup2000 draws (data/upcoming/raw, upcoming.mjs),
// so the matches of a weekend are rated the night after they're played. badmintonportalen gets a
// tournament's results only after it has ended (fetch-portalen.mjs fetches it then): until there
// is a data/portalen/<id>.json for it, its matches played so far are taken from the draw, in the
// same shape as fetch-portalen.mjs writes, and once there is, that is used instead (also if it has
// no matches), so finished tournaments are rated from badmintonportalen as before.
// Players are identified by name: from the tournament's entry list on badmintonportalen (the event's,
// then the whole tournament's), then the player register if only one player has that name. Matches
// with a player not identified are left out until the tournament's results are fetched.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { unescape, parsePlayer } from "./fetch-tournament.mjs";

const DIR = new URL(".", import.meta.url).pathname;
const RAW = `${DIR}data/upcoming/raw`;

// Cup2000 event code (e=) -> badmintonportalen discipline and its heading in the entry lists
export const EVENTS = {
  0: { pool: "men", discipline: "MensSingles", heading: "Herresingle" },
  1: { pool: "mensDoubles", discipline: "MensDoubles", heading: "Herredouble" },
  2: { pool: "women", discipline: "WomensSingles", heading: "Damesingle" },
  3: { pool: "womensDoubles", discipline: "WomensDoubles", heading: "Damedouble" },
  4: { pool: "mixedDoubles", discipline: "MixedDoubles", heading: "Mixeddouble" },
};

export const normalize = (s) =>
  s.toLowerCase().replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "a").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();

// A draw's name that isn't a player: "Vinner av Pulje 3", "Winner of match 12", "Bye"
const notPlayer = (name) => /vinner|pulje|winner|loser|^bye$/i.test(name.trim());

// "10/15 15/13 6/15" (side 1's points first) -> "10/15,15/13,6/15", as on badmintonportalen; a
// walkover ("9/10 W.O.") as written
const isWalkover = (s) => /w\.?\s*o/i.test(s ?? "");
const score = (s) => (isWalkover(s) ? s.trim() : (s ?? "").trim().split(/\s+/).filter(Boolean).join(","));

// Knockout round by its number of matches, named as on badmintonportalen (rate.mjs orders by it)
const roundName = (size) => (size === 1 ? "Finale" : size === 2 ? "Semifinaler" : size === 4 ? "Kvartfinaler" : `1/${size}`);

// The played matches of one event's draw pages: group matches first, then the knockout rounds in
// playing order, each { round, names1, names2, winner, score, walkover }
function playedMatches(pages) {
  const out = [];
  const add = (round, names1, names2, m) => {
    if (m[5] !== 1 && m[5] !== 2) return;
    if (!names1?.length || !names2?.length || [...names1, ...names2].some(notPlayer)) return;
    out.push({ round, names1, names2, winner: m[5], score: score(m[3]), walkover: isWalkover(m[3]) });
  };
  for (const page of pages.filter((p) => p.renderMethod === 3)) {
    // [title, standings rows [index, ?, ?, ?, place, names, ...], [matches, venues]]
    const [title, rows, [matches]] = page.data;
    const names = new Map(rows.filter((row) => row[5]?.length).map((row) => [row[0], row[5]]));
    const group = +(unescape(title).match(/(?:group|pulje)\s*(\d+)\s*$/i)?.[1] ?? 0) || 1;
    for (const m of matches) add(`Pulje ${group}`, names.get(m[8]), names.get(m[9]), m);
  }
  for (const page of pages.filter((p) => p.renderMethod === 4)) {
    // [title, players [[position, empty, place, names]], rounds [[size, [matches, venues]]]]: a
    // position keeps its player through the rounds (a match's winner plays on from their position)
    const names = new Map(page.data[1].filter(([, empty, , list]) => !empty && list?.length).map(([position, , , list]) => [position, list]));
    for (const [, [list]] of page.data[2]) for (const m of list) add(roundName(list.length), names.get(m[8]), names.get(m[9]), m);
  }
  return out;
}

let register = null; // normalized name -> [player] from data/players.json
function fromRegister(name) {
  if (!register) {
    register = new Map();
    const file = `${DIR}data/players.json`;
    for (const p of existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : []) {
      const key = normalize(p.name);
      register.set(key, [...(register.get(key) ?? []), p]);
    }
  }
  const found = register.get(normalize(name)) ?? [];
  return found.length === 1 ? found[0].id : null;
}

// One side of a draw ("Name, Club" each) as badmintonportalen's [{ id, name, club }]
function side(names, eventPlayers, allPlayers) {
  return names.map((n) => {
    const { name, club } = parsePlayer(n);
    const key = normalize(name);
    const same = (p) => normalize(p.name) === key;
    const listed = eventPlayers.find(same) ?? allPlayers.find(same);
    return { id: listed?.id ?? fromRegister(name), name, club: club ?? "" };
  });
}

// The tournaments with a Cup2000 draw and played matches but no results from badmintonportalen yet,
// as fetch-portalen.mjs's files: { tournamentId, name, startDate, endDate, provisional, matches }
export function provisionalTournaments() {
  if (!existsSync(RAW)) return [];
  const tournaments = [];
  for (const file of readdirSync(RAW).filter((f) => f.endsWith(".json")).sort()) {
    const raw = JSON.parse(readFileSync(`${RAW}/${file}`, "utf8"));
    if (!raw.portalenId || !raw.info?.startDate || existsSync(`${DIR}data/portalen/${raw.portalenId}.json`)) continue;
    const allPlayers = raw.info.lists.flatMap((l) => l.entries.flat());
    const matches = [];
    for (const draw of raw.draws) {
      const event = EVENTS[draw.e];
      if (!event) continue;
      const eventPlayers = raw.info.lists.filter((l) => l.className === draw.className && l.heading === event.heading).flatMap((l) => l.entries.flat());
      for (const m of playedMatches(draw.pages)) {
        matches.push({
          className: draw.className,
          discipline: event.discipline,
          round: m.round,
          side1: side(m.names1, eventPlayers, allPlayers),
          side2: side(m.names2, eventPlayers, allPlayers),
          winner: m.winner,
          score: m.score,
          walkover: m.walkover,
        });
      }
    }
    if (!matches.length) continue;
    // Group stages first, then the knockout rounds, as badmintonportalen lists them
    matches.sort((a, b) => /^pulje/i.test(b.round) - /^pulje/i.test(a.round));
    tournaments.push({ tournamentId: raw.portalenId, name: raw.info.name, startDate: raw.info.startDate, endDate: raw.info.endDate, provisional: true, matches });
  }
  return tournaments;
}
