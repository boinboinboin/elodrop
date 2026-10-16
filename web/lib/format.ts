// Number and date formatting shared by the pages.

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

const dateFormats = {
  day: { day: "numeric", month: "short", year: "numeric" },
  long: { day: "numeric", month: "long", year: "numeric" },
  dayMonth: { day: "numeric", month: "short" },
  monthYear: { month: "long", year: "numeric" },
  month: { month: "long" },
  dayOnly: { day: "numeric" },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

// Three-letter months ("Sep", not en-GB's "Sept")
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** A date ("2026-10-15" or ISO time) as "15 Oct 2026" (or another format), in UTC */
export function date(value: string, format: keyof typeof dateFormats = "day"): string {
  const d = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (format === "day") return `${d.getUTCDate()} ${SHORT_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  if (format === "dayMonth") return `${d.getUTCDate()} ${SHORT_MONTHS[d.getUTCMonth()]}`;
  return new Intl.DateTimeFormat("en-GB", { ...dateFormats[format], timeZone: "UTC" }).format(d);
}

/** A date range: "23–25 Oct 2026", or "29 Aug 2026" for one day */
export function dateRange(from: string | null, to: string | null, long = false): string {
  if (!from) return "";
  if (!to || to === from) return date(from, long ? "long" : "day");
  return `${date(from, "dayOnly")}–${date(to, long ? "long" : "day")}`;
}

export const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

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
