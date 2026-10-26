// How women's ratings compare with men's: fitted on the matches women have played against men in
// men's singles and men's doubles, where a woman's result against men can be set against her rating
// in her own discipline (women's singles or doubles) at the time. The site uses it for the
// head-to-head comparisons "just for fun" across the men's and women's disciplines.
// Usage: node gender-gap.mjs   (after rate.mjs) → data/gender-gap.json
//
// The model: a woman rated w in her own discipline plays like a man rated
//   w + a + b · (w − P0)
// on the men's scale (P0: the top level start rating), with a and b fitted by maximum likelihood over
// those matches (the expected score as in rules.mjs). Women's own-discipline ratings at the time are from the weekly history,
// at the end of the week before the match, so the result doesn't feed its own predictor. In
// doubles only matches with a male partner count, and the side plays at the average of her mapped
// rating and his.
import { readFileSync, writeFileSync } from "node:fs";
import { DOUBLES_UNIT, P0, SCALE } from "./rules.mjs";

const DIR = new URL(".", import.meta.url).pathname;
const DATA = `${DIR}data`;
// Rating difference scale per format: a doubles side is the average of two players, so a difference
// in her rating moves the side by half as much
const SCALES = { singles: SCALE, doubles: SCALE * DOUBLES_UNIT };
const WEEK_MS = 7 * 86_400_000;
const FORMATS = { singles: { men: "men", women: "women" }, doubles: { men: "mensDoubles", women: "womensDoubles" } };

const read = (file) => JSON.parse(readFileSync(`${DATA}/${file}`, "utf8"));
const ratings = read("ratings.json");
const gender = new Map();
for (const players of Object.values(ratings.pools)) for (const p of players) if (p.gender) gender.set(p.id, p.gender);

/** The rating at the end of the week before `day`, from a weekly history */
function before(history, day) {
  if (!history) return null;
  const i = Math.floor((Date.parse(day) - Date.parse(history.from)) / WEEK_MS) - 1;
  return i >= 0 && i < history.ratings.length ? history.ratings[i] : null;
}

/** Maximum likelihood a, b by Newton's method; the sides' rating difference is (w + a + b·(w − P0) + rest) · SCALE / scale */
function fit(rows, scale) {
  const k = Math.LN10 / scale;
  let a = 0, b = 0;
  for (let step = 0; step < 50; step++) {
    let ga = 0, gb = 0, haa = 0, hab = 0, hbb = 0;
    for (const { t, rest, y } of rows) {
      const p = 1 / (1 + 10 ** (-(t + P0 + a + b * t + rest) / scale));
      const v = p * (1 - p);
      ga += y - p;
      gb += (y - p) * t;
      haa += v;
      hab += v * t;
      hbb += v * t * t;
    }
    const det = haa * hbb - hab * hab;
    const da = (hbb * ga - hab * gb) / det / k;
    const db = (haa * gb - hab * ga) / det / k;
    a += da;
    b += db;
    if (Math.abs(da) < 1e-6 && Math.abs(db) < 1e-9) {
      // Standard errors from the inverse of the information matrix
      const scale = 1 / (k * k * det);
      return { a, b, aError: Math.sqrt(hbb * scale), bError: Math.sqrt(haa * scale) };
    }
  }
  throw new Error("The gender gap fit did not converge");
}

const logLoss = (rows, scale, a, b) => rows.reduce((s, { t, rest, y }) => {
  const p = 1 / (1 + 10 ** (-(t + P0 + a + b * t + rest) / scale));
  return s - (y * Math.log(p) + (1 - y) * Math.log(1 - p));
}, 0) / rows.length;

const rows = { singles: [], doubles: [] };
for (const [id, g] of gender) {
  if (g !== "K") continue;
  let matches, history;
  try {
    matches = read(`matches/${id}.json`);
    history = read(`history/${id}.json`);
  } catch {
    continue;
  }
  for (const [format, pools] of Object.entries(FORMATS)) {
    for (const m of matches[pools.men]?.all ?? []) {
      if (m.opponents.some((o) => gender.get(o.id) !== "M")) continue;
      if (format === "doubles" && gender.get(m.partner?.id) !== "M") continue;
      const w = before(history[pools.women], m.day);
      if (w == null) continue;
      const rest = (m.partner?.rating ?? 0) - m.opponents.reduce((s, o) => s + o.rating, 0);
      rows[format].push({ t: w - P0, rest, y: m.result });
    }
  }
}

const out = { generatedAt: ratings.generatedAt };
for (const [format, list] of Object.entries(rows)) {
  const scale = SCALES[format];
  const f = fit(list, scale);
  const ws = list.map((r) => r.t + P0).sort((x, y) => x - y);
  out[format] = {
    p0: P0,
    a: Math.round(f.a * 10) / 10,
    b: Math.round(f.b * 1000) / 1000,
    aError: Math.round(f.aError * 10) / 10,
    bError: Math.round(f.bError * 1000) / 1000,
    matches: list.length,
    // The women's ratings the fit covers (5th to 95th percentile): beyond them it's extrapolated
    range: [Math.round(ws[Math.floor(ws.length * 0.05)]), Math.round(ws[Math.floor(ws.length * 0.95)])],
    logLoss: { fitted: Math.round(logLoss(list, scale, f.a, f.b) * 1e4) / 1e4, noGap: Math.round(logLoss(list, scale, 0, 0) * 1e4) / 1e4 },
  };
  const gaps = [-300, 0, 300, 600].map((x) => `${P0 + x}: ${Math.round(f.a + f.b * x)}`).join(", ");
  console.log(
    `${format}: ${list.length} matches, a = ${f.a.toFixed(0)} ± ${f.aError.toFixed(0)}, b = ${f.b.toFixed(2)} ± ${f.bError.toFixed(2)};` +
      ` gap at ${gaps}; log loss ${out[format].logLoss.fitted} (no gap: ${out[format].logLoss.noGap})`,
  );
}
writeFileSync(`${DATA}/gender-gap.json`, JSON.stringify(out, null, 2));
