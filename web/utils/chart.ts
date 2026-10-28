// Shared pieces of the charts (components/charts/LineChart.tsx).
import type { I18n } from "@/messages/i18n";

export const DAY = 86_400_000;
export const WEEK = 7 * DAY;

// Categorical palette in fixed order, and the chart's other colours: CSS variables, so they follow
// the theme (values per theme in app/globals.css; each theme's palette is validated for CVD and
// normal-vision separation against its chart surface). Set as styles, not SVG attributes.
export const PALETTE = Array.from({ length: 8 }, (_, i) => `var(--color-chart-${i + 1})`);
export const COLORS = {
  series: PALETTE[0],
  grid: "var(--color-chart-grid)",
  axis: "var(--color-chart-axis)",
  text: "var(--color-chart-text)",
  crosshair: "var(--color-chart-crosshair)",
  surface: "var(--color-chart-surface)",
};
// The two sides of a head to head (the chart lines, the swatches by their names)
export const SIDE_COLORS = [PALETTE[0], PALETTE[1]];
// Clubs past the palette share a neutral "other" colour
export const OTHER_COLOR = "var(--color-chart-other)";
// right: room for the value label at the end of a single line; with several lines (no end label)
// only for the end dots and the last year label
export const MARGIN = { top: 12, right: 52, rightWithoutLabel: 16, bottom: 28, left: 48 };

/** "2,569", "1.23", or with `withSign` "+1.23" / "−0.40" (zero without a sign either way) */
export const formatNumber = ({ num, signed }: I18n, value: number, decimals = 0, withSign = false): string =>
  withSign || value < 0 ? signed(value, decimals, "") : num(value, decimals);

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
