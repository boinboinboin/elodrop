// Formatting that's the same in both languages. Numbers and dates as a language writes them (num,
// pct, date, dateRange, …) come with its text from getI18n() / useI18n() (messages/i18n.ts).
import { addDays as addDaysTo, format as formatDate, parseISO } from "date-fns";

/** An empty table cell's mark: no value (no rank, not rated that season) */
export const EMPTY = "–";

/** A placement: 1, 2, 3–4 (shared, 3.5), 5 */
export function place(p: number): string {
  return p === Math.round(p) ? String(p) : `${Math.round(p - 0.5)}–${Math.round(p + 0.5)}`;
}

/** The day `n` days after `day` (both "yyyy-MM-dd") */
export const addDays = (day: string, n: number) => formatDate(addDaysTo(parseISO(day), n), "yyyy-MM-dd");

/** Accents and case ignored, æ/ø/å as ae/o/a: for the name searches */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "");
}

export const words = (query: string) => normalize(query).split(/\s+/).filter(Boolean);

/** The text with its first letter in capitals */
export const capitalize = (text: string) => text[0].toUpperCase() + text.slice(1);

/** The text colour of a gain (green, zero too) or a loss (red) */
export const toneClass = (value: number) => (value >= 0 ? "text-green-700" : "text-red-700");

/** A season starting in `year` as "2025/2026", or short "25/26" */
export function seasonLabel(year: number, short = false): string {
  const two = (y: number) => String(y % 100).padStart(2, "0");
  return short ? `${two(year)}/${two(year + 1)}` : `${year}/${year + 1}`;
}
