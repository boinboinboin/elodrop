// One person with more than one id on badmintonportalen (registered again, often under another club
// or name), merged into one player: same-players.txt, written by hand, one person per line, the id
// kept first (the one they play under now), then the others:
//   <id kept>  <other id> [<other id> ...]   # note, without the name
// and two ids checked and found to be different people (so find-duplicates.mjs doesn't list them again):
//   <id> != <id>
// rate.mjs (and the modules reading results through it) read every match with the other ids as the id
// kept, so the person has one rating and one page; export.mjs sends the other ids' pages to it.
import { existsSync, readFileSync } from "node:fs";

const DIR = new URL(".", import.meta.url).pathname;

let merged = null; // other id -> id kept
let different = null; // "id|id" (the lower first) of two players who aren't the same person
function read() {
  merged = new Map();
  different = new Set();
  const file = `${DIR}same-players.txt`;
  for (const raw of existsSync(file) ? readFileSync(file, "utf8").split("\n") : []) {
    const line = raw.replace(/#.*/, "").trim();
    const not = line.match(/^(\d+)\s*!=\s*(\d+)$/);
    if (not) {
      different.add([+not[1], +not[2]].sort((a, b) => a - b).join("|"));
      continue;
    }
    const ids = line.split(/\s+/).filter(Boolean).map(Number);
    if (ids.length < 2 || ids.some((id) => !Number.isInteger(id) || id <= 0)) {
      if (ids.length) console.warn(`same-players.txt: can't read "${raw.trim()}"`);
      continue;
    }
    for (const other of ids.slice(1)) merged.set(other, ids[0]);
  }
}
export function mergedIds() {
  if (!merged) read();
  return merged;
}
/** Two ids checked and found to be different people */
export function notSame(a, b) {
  if (!different) read();
  return different.has([a, b].sort((x, y) => x - y).join("|"));
}

/** The id a player is rated under: the id kept for a merged one, else their own */
export const samePlayer = (id) => mergedIds().get(id) ?? id;

/** A match (tournament or league) with merged players' ids as the ids kept; the same object if none */
export function withSamePlayers(m) {
  const ids = mergedIds();
  if (!ids.size || ![...m.side1, ...m.side2].some((p) => ids.has(p.id))) return m;
  const side = (list) => list.map((p) => (ids.has(p.id) ? { ...p, id: ids.get(p.id) } : p));
  return { ...m, side1: side(m.side1), side2: side(m.side2) };
}
