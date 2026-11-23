// Turns the top-10 export (pipeline/data/racing, made by racing-export.mjs) into one JSON per list in
// public/data, and copies the club logos and the site's font. Run after a new export: node prepare.mjs
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from "node:fs";

const ROOT = new URL("..", import.meta.url).pathname;
const RACING = `${ROOT}pipeline/data/racing`;
const PUBLIC = new URL("public/", import.meta.url).pathname;
const LISTS = ["men", "women", "mensDoubles", "womensDoubles", "mixedDoubles-men", "mixedDoubles-women"];

// A small CSV reader (quoted fields with commas and doubled quotes)
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') (field += '"'), i++;
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") row.push(field), (field = "");
    else if (c === "\n") row.push(field), rows.push(row), (row = []), (field = "");
    else if (c !== "\r") field += c;
  }
  if (field || row.length) row.push(field), rows.push(row);
  return rows;
}

// Club name -> logo file in public/: the logos in Sanity (as the site shows them, cropped as set in the Studio),
// downloaded to public/club-logos/sanity; else the old files of web/content/clubs.json
const env = Object.fromEntries(
  readFileSync(`${ROOT}web/.env.local`, "utf8").split("\n").filter((l) => /^\w+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^["']|["']$/g, "")]),
);
const logos = Object.fromEntries(
  JSON.parse(readFileSync(`${ROOT}web/content/clubs.json`, "utf8")).filter((c) => c.logo).map((c) => [c.title, `club-logos/${c.logo}`]),
);
const projectId = env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
const groq = `*[_type == "club" && defined(logo.asset)] { title, "slug": slug.current, "url": logo.asset->url, "width": logo.asset->metadata.dimensions.width, "height": logo.asset->metadata.dimensions.height, "crop": logo.crop }`;
const clubs = (await (await fetch(`https://${projectId}.apicdn.sanity.io/v2025-02-19/data/query/${dataset}?query=${encodeURIComponent(groq)}`)).json()).result;
mkdirSync(`${PUBLIC}club-logos/sanity`, { recursive: true });
for (const c of clubs) {
  // The crop as web/utils/sanityImage.ts does it, as a PNG at most 256 px
  const params = ["w=256", "h=256", "fit=max", "fm=png"];
  if (c.crop && c.width && c.height) {
    const { left, top, right, bottom } = c.crop;
    params.unshift(`rect=${Math.round(left * c.width)},${Math.round(top * c.height)},${Math.round((1 - left - right) * c.width)},${Math.round((1 - top - bottom) * c.height)}`);
  }
  const file = `club-logos/sanity/${c.slug}.png`;
  writeFileSync(`${PUBLIC}${file}`, Buffer.from(await (await fetch(`${c.url}?${params.join("&")}`)).arrayBuffer()));
  logos[c.title.replace(/\s+/g, " ").trim()] = file;
}
console.log(`${clubs.length} logos from Sanity, ${Object.keys(logos).length} clubs with a logo`);

const long = parseCsv(readFileSync(`${RACING}/top10-long.csv`, "utf8")).slice(1);
mkdirSync(`${PUBLIC}data`, { recursive: true });

for (const list of LISTS) {
  const wide = parseCsv(readFileSync(`${RACING}/top10-${list}-wide.csv`, "utf8"));
  const weeks = wide[0].slice(4);
  const index = new Map(weeks.map((w, i) => [w, i]));
  const players = wide.slice(1).map(([id, name, club, , ...cells]) => ({
    id: +id,
    name,
    values: cells.map((v) => (v === "" ? null : +v)),
    // The club played for in each week in the top 10 (filled below); the current club otherwise
    club,
    clubs: {},
  }));
  const byId = new Map(players.map((p) => [p.id, p]));
  const top = weeks.map(() => []);
  for (const [week, l, rank, id, , club] of long) {
    if (l !== list) continue;
    const w = index.get(week);
    top[w][+rank - 1] = +id;
    byId.get(+id).clubs[w] = club;
  }
  // Club per week as periods [[firstWeek, club], ...], the club carried on between top-10 weeks
  for (const p of players) {
    const periods = [];
    for (const [w, club] of Object.entries(p.clubs).sort((a, b) => a[0] - b[0]))
      if (periods.at(-1)?.[1] !== club) periods.push([+w, club]);
    if (!periods.length) periods.push([0, p.club]);
    periods[0][0] = 0;
    p.clubs = periods;
    delete p.club;
  }
  writeFileSync(`${PUBLIC}data/${list}.json`, JSON.stringify({ list, weeks, players, top, logos }));
  console.log(list, `${weeks.length} weeks, ${players.length} players`);
}

// The clubs shown in the videos without a logo, most weeks on screen first (any list), for adding them in the Studio
const missing = new Map();
for (const [, list, , , , club] of long) {
  if (!club || logos[club]) continue;
  const m = missing.get(club) ?? { weeks: 0, lists: new Set() };
  m.weeks++;
  m.lists.add(list);
  missing.set(club, m);
}
const rows = [...missing].sort((a, b) => b[1].weeks - a[1].weeks);
writeFileSync(`${RACING}/missing-logos.csv`, "club,top10_weeks_all_lists,lists\n" + rows.map(([club, m]) => `"${club}",${m.weeks},"${[...m.lists].join("; ")}"`).join("\n") + "\n");
console.log(`${rows.length} clubs in the videos without a logo (${RACING}/missing-logos.csv)`);

cpSync(`${ROOT}web/public/club-logos`, `${PUBLIC}club-logos`, { recursive: true });
mkdirSync(`${PUBLIC}fonts`, { recursive: true });
for (const f of ["Redaction-Regular.woff2", "Redaction-Bold.woff2"]) {
  const from = `${ROOT}web/app/fonts/redaction/${f}`;
  cpSync(existsSync(from) ? from : `${ROOT}web/app/fonts/${f}`, `${PUBLIC}fonts/${f}`);
}
