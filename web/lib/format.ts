// Number and date formatting shared by the pages.
import { addDays as addDaysTo, format as formatDate, isSameMonth, isSameYear, parseISO, startOfISOWeek } from "date-fns";

const numberFormat = (decimals: number) =>
  new Intl.NumberFormat("en-GB", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** "2,569", or with decimals "1.23" */
export function num(value: number, decimals = 0): string {
  return numberFormat(decimals).format(value);
}

/** "+1.23" / "−0.40" / "±0.00" (a proper minus sign) */
export function signed(value: number, decimals = 2): string {
  const text = numberFormat(decimals).format(Math.abs(value));
  return (value > 0 ? "+" : value < 0 ? "−" : "±") + text;
}

/** A chance as a percentage: "37%", "<1%" (above zero), ">99%" (below one) */
export function pct(x: number): string {
  const p = Math.round(x * 100);
  if (x > 0 && p < 1) return "<1%";
  if (x < 1 && p > 99) return ">99%";
  return `${p}%`;
}

/** A placement: 1, 2, 3–4 (shared, 3.5), 5 */
export function place(p: number): string {
  return p === Math.round(p) ? String(p) : `${Math.round(p - 0.5)}–${Math.round(p + 0.5)}`;
}

// Dates (date-fns). The data's days are calendar dates ("2026-10-15"): parsed as that day at local
// midnight and formatted back the same, so no time zone shifts them. Times (ISO with a time) are
// shown in the time zone they're rendered in.
const DATE_FORMATS = {
  day: "d MMM yyyy", // 15 Oct 2026
  long: "d MMMM yyyy", // 15 October 2026
  dayMonth: "d MMM", // 15 Oct
  monthYear: "MMMM yyyy", // October 2026
  month: "MMMM", // October
  monthShort: "MMM", // Oct
  dayOnly: "d", // 15
} as const;
export type DateFormat = keyof typeof DATE_FORMATS;

/** A day ("2026-10-15") or time (ISO) as "15 Oct 2026", or another format */
export function date(value: string | Date, format: DateFormat = "day"): string {
  return formatDate(typeof value === "string" ? parseISO(value) : value, DATE_FORMATS[format]);
}

/** A time (ISO) in Norwegian time, whatever time zone the page is rendered in: "17 October 2026, 05:24" */
// The one formatter not on date-fns: its time zone support (@date-fns/tz) reads the current time
// when it builds a date, which Next.js doesn't allow while prerendering. Intl only needs the time.
const osloTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Oslo", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
export function dateTime(value: string): string {
  const parts = Object.fromEntries(osloTime.formatToParts(parseISO(value)).map((p) => [p.type, p.value]));
  return `${parts.day} ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute}`;
}

/** A date range: "23–25 Oct 2026", "30 Sep – 2 Oct 2026", "29 Dec 2026 – 3 Jan 2027", or one day */
export function dateRange(from: string | null, to: string | null, long = false): string {
  if (!from) return "";
  const full = long ? "long" : "day";
  if (!to || to === from) return date(from, full);
  const [a, b] = [parseISO(from), parseISO(to)];
  if (isSameMonth(a, b)) return `${date(a, "dayOnly")}–${date(b, full)}`;
  if (isSameYear(a, b)) return `${formatDate(a, long ? "d MMMM" : "d MMM")} – ${date(b, full)}`;
  return `${date(a, full)} – ${date(b, full)}`;
}

/** The day `n` days after `day` (both "yyyy-MM-dd") */
export const addDays = (day: string, n: number) => formatDate(addDaysTo(parseISO(day), n), "yyyy-MM-dd");

/** Today ("yyyy-MM-dd"), in the time zone it's rendered in */
export const today = () => formatDate(new Date(), "yyyy-MM-dd");

/** The Monday of the week of `day` ("yyyy-MM-dd") */
export const mondayOf = (day: string) => formatDate(startOfISOWeek(parseISO(day)), "yyyy-MM-dd");

/** A chart's time (milliseconds, a day at UTC midnight or later that day) as that day: "15 Oct 2026" */
export const dayAt = (time: number, format: DateFormat = "day") => date(new Date(time).toISOString().slice(0, 10), format);

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
