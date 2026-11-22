// Players on badmintonportalen who may be one person with two ids (registered again, often under
// another club or name): two ids with rated matches, the same birth year (data/birth-years.json), not
// of different genders, and similar names. For checking by hand: the ones that are go into
// same-players.txt, and the ones that aren't as "<id> != <id>". Pairs in either are left out.
// Usage: node find-duplicates.mjs   (after rate.mjs) -> data/possible-duplicates.txt
//
// Similar names: the same name; one word spelled differently (Marcus/Markus, Botcharove/Botcharova:
// one letter in words of up to 4 letters, two in longer ones); one name with all the other's words
// (a middle name or a second surname added); or the same first and last name. Pairs whose ids never
// played at the same time come first: most likely one person who got a new id.
import { readFileSync, writeFileSync } from "node:fs";
import { normalize } from "./cup2000-results.mjs";
import { mergedIds, notSame, samePlayer } from "./same-players.mjs";

const DIR = new URL(".", import.meta.url).pathname;
const read = (file) => JSON.parse(readFileSync(`${DIR}data/${file}`, "utf8"));

// Edit distance, up to 3 (more is 3)
function distance(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur.push(Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] !== b[j - 1])));
    prev = cur;
  }
  return Math.min(prev[b.length], 3);
}

function similar(a, b) {
  const [wa, wb] = [a.words, b.words];
  if (!wa.length || !wb.length) return null;
  if (a.key === b.key) return "same name";
  const [small, large] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
  if (small.length >= 2 && small.every((w) => large.includes(w))) return "one name has all the other's words";
  if (wa.length === wb.length && wa.length >= 2) {
    const diff = wa.map((w, i) => [w, wb[i]]).filter(([x, y]) => x !== y);
    if (diff.length === 1 && distance(...diff[0]) <= (Math.min(diff[0][0].length, diff[0][1].length) <= 4 ? 1 : 2)) return "one word spelled differently";
  }
  if (small.length >= 2 && small[0] === large[0] && small.at(-1) === large.at(-1)) return "same first and last name";
  return null;
}

const born = read("birth-years.json");
const people = new Map();
for (const entries of Object.values(read("ratings.json").pools)) {
  for (const e of entries) {
    const p = people.get(e.id) ?? { id: e.id, name: e.name, club: e.club, gender: e.gender, first: e.firstPlayed, last: e.lastPlayed, matches: 0 };
    p.matches += e.matches;
    if (e.firstPlayed < p.first) p.first = e.firstPlayed;
    if (e.lastPlayed > p.last) p.last = e.lastPlayed;
    people.set(e.id, p);
  }
}
const byYear = new Map();
for (const p of people.values()) {
  p.born = born[p.id] ?? null;
  p.key = normalize(p.name);
  p.words = p.key.split(" ").filter(Boolean);
  if (p.born) byYear.set(p.born, [...(byYear.get(p.born) ?? []), p]);
}

const ORDER = ["same name", "one word spelled differently", "one name has all the other's words", "same first and last name"];
const pairs = [];
for (const list of byYear.values()) {
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const [a, b] = [list[i], list[j]];
      if ((a.gender && b.gender && a.gender !== b.gender) || samePlayer(a.id) === samePlayer(b.id) || notSame(a.id, b.id)) continue;
      const how = similar(a, b);
      if (!how) continue;
      const [first, second] = [a, b].sort((x, y) => x.first.localeCompare(y.first));
      pairs.push({ how, overlap: second.first <= first.last, first, second });
    }
  }
}
pairs.sort((x, y) => x.overlap - y.overlap || ORDER.indexOf(x.how) - ORDER.indexOf(y.how) || y.first.matches + y.second.matches - (x.first.matches + x.second.matches));

const line = (p) => `  ${String(p.id).padStart(6)}  ${p.name} (${p.club ?? "no club"}), ${p.matches} ${p.matches === 1 ? "match" : "matches"}, ${p.first.slice(0, 7)} to ${p.last.slice(0, 7)}`;
const section = (title, list) => [`== ${title} (${list.length}) ==`, "", ...list.flatMap((x) => [`born ${x.first.born}, ${x.how}:`, line(x.first), line(x.second), "  same? = ", ""])];
const apart = pairs.filter((x) => !x.overlap);
const text = [
  "Players on badmintonportalen who may be the same person: two ids with matches, the same birth year",
  'and similar names (find-duplicates.mjs). After each pair\'s "same? =", write yes or no (or leave it',
  "empty if you don't know). The ones that are go into same-players.txt.",
  `${mergedIds().size} ids merged already, and pairs found to be different people, are left out (same-players.txt). Players without a birth year can't be checked.`,
  "",
  ...section("Never played at the same time: most likely one person who got a new id", apart),
  ...section("Both ids have matches in the same period", pairs.filter((x) => x.overlap)),
].join("\n");
writeFileSync(`${DIR}data/possible-duplicates.txt`, text + "\n");
const count = (list) => Object.entries(Object.groupBy(list, (x) => x.how)).map(([how, l]) => `${how} ${l.length}`).join(", ");
console.log(`${pairs.length} pairs: ${apart.length} never played at the same time (${count(apart)}), ${pairs.length - apart.length} did (${count(pairs.filter((x) => x.overlap))}). Written to data/possible-duplicates.txt`);
