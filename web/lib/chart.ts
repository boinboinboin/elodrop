// Shared pieces of the charts (components/LineChart.tsx).

export const DAY = 86_400_000;
export const WEEK = 7 * DAY;

// Categorical palette in fixed order (validated: CVD and normal-vision separation pass on white;
// slots 3-5 are below 3:1 contrast, so charts using them carry a legend, tooltip and table).
export const PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
export const COLORS = { series: PALETTE[0], grid: "#e7e5e4", axis: "#6b7280", text: "#111827", crosshair: "#9ca3af", surface: "#ffffff" };
// Clubs past the eighth share a neutral "other" colour
export const OTHER_COLOR = "#8a8984";
export const MARGIN = { top: 12, right: 52, bottom: 28, left: 48 };

export const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** "2,569", "1.23", or with `signed` "+1.23" / "−0.40" */
export function formatNumber(value: number, decimals = 0, signed = false): string {
  const text = Math.abs(value).toLocaleString("en-GB", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  if (value < 0) return `−${text}`;
  return signed && value > 0 ? `+${text}` : text;
}

/** Smallest round step that gives at most `max` intervals */
export function niceStep(range: number, max = 5): number {
  for (const step of [0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 25, 50, 100, 200, 250, 500, 1000]) if (range / step <= max) return step;
  return 1000;
}

/** A linear y scale with round gridlines covering [min, max] */
export function yDomain(min: number, max: number) {
  const step = niceStep(Math.max(max - min, 0.1));
  const yMin = Math.floor(min / step) * step;
  const yMax = Math.max(Math.ceil(max / step) * step, yMin + step);
  const ticks: number[] = [];
  for (let k = 0; yMin + k * step <= yMax + step / 1000; k++) ticks.push(yMin + k * step);
  const decimals = step < 1 ? (Number.isInteger(step * 10) ? 1 : 2) : 0;
  return { yMin, yMax, ticks, decimals };
}

/** A log scale for ranks: ticks at 1, 2, 5, 10, 20, ... (only powers of ten when that would be too many) */
export function logDomain(min: number, max: number) {
  const steps: number[] = [];
  for (let power = 1; power <= 1e6; power *= 10) for (const m of [1, 2, 5]) steps.push(m * power);
  const yMin = steps.findLast((s) => s <= min) ?? 1;
  const yMax = steps.find((s) => s >= max && s > yMin) ?? max;
  let ticks = steps.filter((s) => s >= yMin && s <= yMax);
  if (ticks.length > 7) ticks = ticks.filter((s) => String(s).startsWith("1") || s === yMin || s === yMax);
  return { yMin, yMax, ticks, decimals: 0 };
}

/** One label per year along the bottom, thinned so labels don't collide */
export function yearTicks(t0: number, t1: number, width: number): number[] {
  const first = new Date(t0).getUTCFullYear() + 1;
  const last = new Date(t1).getUTCFullYear();
  const step = Math.max(1, Math.ceil((last - first + 1) / Math.max(1, Math.floor(width / 56))));
  const years: number[] = [];
  for (let y = first; y <= last; y += step) years.push(y);
  return years;
}
