// Fetch the official NBF senior ranking lists (badmintonportalen.no/NBF/Ranglister/): singles, to
// compare our Elo ratings against, and doubles and mixed doubles (the Eliteserien lineup rules use
// the ranking points).
// Usage: node fetch-ranking.mjs [seasonId...]   (default 2002026 = 2026/2027; "all" = 2002014 to 2002026)
//
// Writes data/ranking/<seasonId>.json: { period, men, women, mensDoubles, womensDoubles, mixedMen,
// mixedWomen } (lists of rank, player number, internal id (the same id as in our match data), name,
// club, class and points; mixed doubles has one list for men and one for women).
// Finished seasons only keep their final list (a rolling 12 months up to about July 1).
// The current list is saved with its publication date (`published`); with --if-new, the lists are
// only fetched when a newer version has been published (one request to check, for the nightly runs).
//
// Usage: node fetch-ranking.mjs <seasonId> --before <yyyy-mm-dd>
// fetches the latest version of the lists published before that date (they are updated about twice
// a week) into data/ranking/<seasonId>-<version date>.json, e.g. for the ranking at a past match.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { AGE_GROUPS, LISTS, rankingList, versions } from "./ranking-lists.mjs";

const DIR = new URL(".", import.meta.url).pathname;
const ALL = Array.from({ length: 13 }, (_, i) => String(2002014 + i));
const beforeIndex = process.argv.indexOf("--before");
const before = beforeIndex > 0 ? process.argv[beforeIndex + 1] : null;
const ifNew = process.argv.includes("--if-new");
const plain = process.argv.slice(2).filter((a, i, all) => a !== "--before" && a !== "--if-new" && all[i - 1] !== "--before");
const seasons = plain[0] === "all" ? ALL : plain.length ? plain : ["2002026"];
const { group, first } = AGE_GROUPS.SEN;
// The lists, in the order they're saved in
const POOLS = ["men", "women", "mensDoubles", "womensDoubles", "mixedWomen", "mixedMen"];

mkdirSync(`${DIR}data/ranking`, { recursive: true });
// The latest list version published before a date (yyyy-mm-dd)
const versionBefore = async (season, date) => (await versions(season)).find((v) => v < date);

for (const season of seasons) {
  const version = before ? await versionBefore(season, before) : "";
  if (before && !version) throw new Error(`No ${season} ranking version before ${before}`);
  // The current list: when it was published, and with --if-new nothing to do if we have it already
  let published = null;
  if (!before) {
    published = (await versions(season))[0] ?? null;
    const file = `${DIR}data/ranking/${season}.json`;
    const saved = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
    if (ifNew && published && saved?.published === published) {
      console.log(`${season}: no new list (the one published ${published} is saved)`);
      continue;
    }
  }
  const result = { season, version: version || null, published, fetchedAt: new Date().toISOString() };
  for (const pool of POOLS) {
    const { period, rows } = await rankingList(season, group, first + LISTS[pool], version || null);
    result.period ??= period;
    result[pool] = rows;
  }
  writeFileSync(`${DIR}data/ranking/${season}${result.version ? `-${result.version}` : ""}.json`, JSON.stringify(result, null, 1));
  console.log(`${season} (${result.period}): ${POOLS.map((pool) => `${result[pool].length} ${pool}`).join(", ")}`);
}
