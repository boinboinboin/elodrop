// The rating classes' cut-offs (web/utils/classes.ts), the same in every discipline: the mean of the active
// players' ratings plus 2.5, 1.5 and 0.5 standard deviations (E, A, B) and minus 0.5 (C), rounded to 25; D is
// everything below. Mean and standard deviation are over the five disciplines, each counting equally, so mixed
// doubles (men and women in one list) doesn't count twice. The ratings are skewed (a long tail at the top), so
// the classes come out as a pyramid, about 2/6/17/39/36% in each discipline. Run once a season, at its start
// (1 July), and copy the numbers into classes.ts: they stay fixed for the season, so a player's class only
// changes with their own rating.
// Usage: node class-cutoffs.mjs   (after export.mjs) → prints the cut-offs and each class's share per discipline
import { readFileSync } from "node:fs";

const DIR = new URL(".", import.meta.url).pathname;
const POOLS = ["men", "women", "mensDoubles", "womensDoubles", "mixedDoubles"];
const SIGMAS = [2.5, 1.5, 0.5, -0.5];
const CLASSES = ["E", "A", "B", "C", "D"];

const ratings = Object.fromEntries(
  POOLS.map((pool) => [pool, JSON.parse(readFileSync(`${DIR}export/rankings/${pool}.json`, "utf8")).players.filter((p) => p.active).map((p) => p.rating)]),
);
const average = (values) => values.reduce((a, b) => a + b, 0) / values.length;
// Each discipline counts equally: the mean of the disciplines' means, and the average squared distance from it
const mean = average(POOLS.map((pool) => average(ratings[pool])));
const sd = Math.sqrt(average(POOLS.map((pool) => average(ratings[pool].map((r) => (r - mean) ** 2)))));
const cutoffs = SIGMAS.map((k) => Math.round((mean + k * sd) / 25) * 25);
console.log(`Cut-offs: [${cutoffs.join(", ")}]  (mean ${Math.round(mean)}, SD ${Math.round(sd)})`);

for (const pool of POOLS) {
  const list = ratings[pool];
  // The class of a rating as the site shows it (rounded): the first cut-off it reaches, else D
  const counts = CLASSES.map(() => 0);
  for (const r of list) {
    const i = cutoffs.findIndex((c) => Math.round(r) >= c);
    counts[i < 0 ? 4 : i]++;
  }
  const own = average(list);
  const shares = counts.map((c, i) => `${CLASSES[i]} ${c} (${Math.round((100 * c) / list.length)}%)`).join(", ");
  console.log(`${pool}: mean ${Math.round(own)}, SD ${Math.round(Math.sqrt(average(list.map((r) => (r - own) ** 2))))}, ${list.length} active: ${shares}`);
}
