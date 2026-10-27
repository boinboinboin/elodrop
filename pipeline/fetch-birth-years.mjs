// Fetch every player's birth year from their profile on badmintonportalen.no (NBF), for the junior
// rankings' age groups and the player pages.
// Usage: node fetch-birth-years.mjs [--limit 100]
//
// The players are those in the register (data/players.json) and everyone in the fetched results
// (data/portalen, data/league). Each profile (GetPlayerProfile) is one request and shows the birth
// year only ("Født 2006"), so only players without a saved year are fetched: the first run takes about
// an hour, later ones only fetch new players. Writes data/birth-years.json: { id: year or null }
// (null: the profile shows no year; not asked again). Saved as it goes, so it can be stopped and re-run.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { call } from "./portalen.mjs";

const DIR = new URL(".", import.meta.url).pathname;
const OUT = `${DIR}data/birth-years.json`;
const CONCURRENCY = 2;
const SAVE_EVERY = 200;
const limitIndex = process.argv.indexOf("--limit");
const limit = limitIndex > 0 ? +process.argv[limitIndex + 1] : Infinity;

const read = (file) => JSON.parse(readFileSync(file, "utf8"));
const readDir = (sub) => (existsSync(`${DIR}data/${sub}`) ? readdirSync(`${DIR}data/${sub}`).map((f) => read(`${DIR}data/${sub}/${f}`)) : []);

const ids = new Set(read(`${DIR}data/players.json`).map((p) => p.id));
const addSides = (m) => [...m.side1, ...m.side2].forEach((p) => p.id && ids.add(p.id));
for (const t of readDir("portalen")) t.matches.forEach(addSides);
for (const g of readDir("league")) for (const tie of g.ties) tie.games.forEach(addSides);

const years = existsSync(OUT) ? read(OUT) : {};
const todo = [...ids].filter((id) => !(id in years)).slice(0, limit);
const save = () => writeFileSync(OUT, JSON.stringify(Object.fromEntries(Object.entries(years).sort(([a], [b]) => a - b))));

// <h2>F&#248;dt</h2>\n2006<br />
async function birthYear(id) {
  const { Html: html } = await call("GetPlayerProfile", { seasonid: null, playerid: id, getplayerdata: true, showUserProfile: false, showheader: false });
  const year = html.match(/<h2>F(?:&#248;|ø)dt<\/h2>\s*(\d{4})/)?.[1];
  return year ? +year : null;
}

console.error(`${ids.size} players, ${Object.keys(years).length} with a saved birth year (or none shown), ${todo.length} to fetch`);
let done = 0;
let failed = 0;
async function worker() {
  while (todo.length) {
    const id = todo.shift();
    try {
      years[id] = await birthYear(id);
    } catch (err) {
      failed++; // not saved: asked again on the next run
      console.error(`${id}: ${err.message}`);
    }
    if (++done % SAVE_EVERY === 0) {
      save();
      console.error(`${done} fetched, ${todo.length} to go`);
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
save();
const known = Object.values(years).filter(Boolean).length;
console.error(`Done: ${done} fetched (${failed} failed), ${known} of ${Object.keys(years).length} players with a birth year -> ${OUT}`);
