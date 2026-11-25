// A match's key, as shown under each match on the player pages and written in pipeline/corrections.txt:
// "T6084 22113 vs 20814". T<tournament id> (TP<id>: a Profixio tournament) or L<league tie id> (".2" after it for the
// same sides' second meeting there), then each side's player ids (doubles: "id+id"; a player without a page has a
// negative one). The same match can be written with its sides, or a pair's players, in either order, so keys are
// compared in one order (as pipeline/rate.mjs `canonical`).
const KEY = /^((?:TP?|L)\d+(?:\.\d+)?) (-?\d+(?:\+-?\d+)?) vs (-?\d+(?:\+-?\d+)?)$/;

/** A key in one order (sides and pairs sorted as text) and its players' ids (those with a page); null when it isn't a match key */
export function parseMatchKey(key: string): { key: string; players: number[] } | null {
  const m = KEY.exec(key.trim().replace(/\s+/g, " "));
  if (!m) return null;
  const sides = [m[2], m[3]].map((side) => side.split("+").sort().join("+")).sort();
  return { key: `${m[1]} ${sides.join(" vs ")}`, players: sides.flatMap((side) => side.split("+").map(Number)).filter((id) => id > 0) };
}
