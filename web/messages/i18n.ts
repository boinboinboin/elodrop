// The site's text and formatting in its two languages: Norwegian (bokmål, "nb", at the site's root)
// and English ("en", under /en). The text is in the translation files, messages/<language>/<area>.json,
// merged in messages/<language>/index.ts; Norwegian has the same keys as English (a missing or extra
// key doesn't build), and keys are checked at compile time.
//
// Everything that depends on the language comes from one object per language, createI18n(lang):
// server components get it with `await getI18n()` (messages/server.ts, from the URL's language),
// client components with `useI18n()` (messages/client.tsx). Then, as before:
//
// - t("players.history.title"), with {placeholders}: t("rankings.count", { count: num(n) })
// - plural("common.matches", n): an entry { "one": "{count} match", "other": "{count} matches" }
//   chosen by the language's plural rules ({count} is n, unless given in the values)
// - rich("tournaments.howItWorks.seeds", { strong: (text) => <strong>{text}</strong>, link: … }):
//   a sentence with markup, <strong>…</strong> and {placeholders} that are React nodes
// - num, signed, pct, chance, date, dateRange, dateTime, dayAt, weekAt: numbers and dates as the
//   language writes them ("2 646" and "31. okt. 2026" in Norwegian, "2,646" and "31 Oct 2026" in English)
// - pools, poolCodes: the disciplines' names and short codes
// - href("/players/1"): a page's address in this language ("/en/players/1" in English)
import { format as formatDate, getISOWeek, getISOWeekYear, isSameMonth, isSameYear, parseISO } from "date-fns";
import { enGB, nb as nbDates } from "date-fns/locale";
import { createElement, Fragment, type ReactNode } from "react";
import type { Pool } from "@/types";
import { en } from "./en";
import { nb } from "./nb";

export type Messages = typeof en;
type Plural = { one: string; other: string };
type Join<P extends string, K extends string> = P extends "" ? K : `${P}.${K}`;
/** The dotted keys of the entries of type V (texts, or plural entries) */
type Keys<T, V, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends V ? Join<P, K> : T[K] extends string | Plural ? never : Keys<T[K], V, Join<P, K>>;
}[keyof T & string];
export type MessageKey = Keys<Messages, string>;
export type PluralKey = Keys<Messages, Plural>;
type Values = Record<string, string | number>;
type Part = ReactNode | ((text: ReactNode) => ReactNode);

export type Language = "nb" | "en";
/** Norwegian first: the site's root language */
export const LANGUAGES: Language[] = ["nb", "en"];
export const DEFAULT_LANGUAGE: Language = "nb";
export const isLanguage = (value: unknown): value is Language => value === "nb" || value === "en";

const CATALOGUES: Record<Language, Messages> = { nb, en };
/** Number and date formats, and the language's tag for <html lang> and Open Graph */
const LOCALES = {
  nb: { intl: "nb-NO", dates: nbDates, openGraph: "nb_NO" },
  en: { intl: "en-GB", dates: enGB, openGraph: "en_GB" },
} as const;
const POOL_KEYS: Pool[] = ["men", "women", "mensDoubles", "womensDoubles", "mixedDoubles"];

// Dates (date-fns). The data's days are calendar dates ("2026-10-15"): parsed as that day at local
// midnight and formatted back the same, so no time zone shifts them. Times (ISO with a time) are
// shown in the time zone they're rendered in.
const DATE_FORMATS = {
  nb: { day: "d. MMM yyyy", long: "d. MMMM yyyy", dayMonth: "d. MMM", dayMonthLong: "d. MMMM", monthYear: "MMMM yyyy", month: "MMMM", monthShort: "MMM", dayOnly: "d." },
  en: { day: "d MMM yyyy", long: "d MMMM yyyy", dayMonth: "d MMM", dayMonthLong: "d MMMM", monthYear: "MMMM yyyy", month: "MMMM", monthShort: "MMM", dayOnly: "d" },
} as const;
export type DateFormat = keyof (typeof DATE_FORMATS)["en"];

function build(lang: Language) {
  const messages = CATALOGUES[lang];
  const locale = LOCALES[lang];
  const formats = DATE_FORMATS[lang];
  const lookup = (key: string): unknown => key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages);
  const fill = (text: string, values?: Values) => (values ? text.replace(/\{(\w+)\}/g, (match, name) => (name in values ? String(values[name]) : match)) : text);

  /** A text, with its {placeholders} filled in */
  const t = (key: MessageKey, values?: Values): string => fill(lookup(key) as string, values);

  /**
   * A text by count ("1 match", "3 matches"), with {count} and any other placeholders filled in. With
   * `decimals`, the count as it's shown with that many decimals ("1.0 points" takes the plural).
   */
  const plural = (key: PluralKey, count: number, values?: Values, { decimals = 0 } = {}): string => {
    const entry = lookup(key) as Plural;
    const rule = new Intl.PluralRules(locale.intl, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).select(count);
    return fill(rule === "one" ? entry.one : entry.other, { count, ...values });
  };

  /** A text with markup: <tag>…</tag> wrapped by parts[tag], {name} replaced by parts[name] (or values) */
  const rich = (key: MessageKey, parts: Record<string, Part>, values?: Values): ReactNode => {
    const text = fill(lookup(key) as string, values);
    const nodes: ReactNode[] = [];
    let last = 0;
    for (const m of text.matchAll(/<(\w+)>([\s\S]*?)<\/\1>|\{(\w+)\}/g)) {
      if (m.index > last) nodes.push(text.slice(last, m.index));
      const part = parts[m[1] ?? m[3]];
      nodes.push(typeof part === "function" ? part(m[2] ?? "") : (part ?? m[0]));
      last = m.index + m[0].length;
    }
    if (last < text.length) nodes.push(text.slice(last));
    return nodes.map((node, i) => createElement(Fragment, { key: i }, node));
  };

  const numberFormats = new Map<number, Intl.NumberFormat>();
  const numberFormat = (decimals: number) => {
    let f = numberFormats.get(decimals);
    if (!f) numberFormats.set(decimals, (f = new Intl.NumberFormat(locale.intl, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })));
    return f;
  };
  /** Norwegian puts a space before the percent sign: "37 %" */
  const percent = (text: string) => (lang === "nb" ? `${text} %` : `${text}%`);

  /** "2 569" / "2,569", or with decimals "1,23" / "1.23" */
  const num = (value: number, decimals = 0): string => numberFormat(decimals).format(value);

  /** "+1.23" / "−0.40" / "±0.00" (a proper minus sign); a value that rounds to zero is zero ("±0.0", not "+0.0" or "−0.0");
   * `zero` is zero's sign, "" for none */
  const signed = (value: number, decimals = 2, zero: "±" | "" = "±"): string => {
    const text = numberFormat(decimals).format(Math.abs(value));
    const rounded = Number(Math.abs(value).toFixed(decimals));
    return (rounded === 0 ? zero : value > 0 ? "+" : "−") + text;
  };

  /** A chance as a percentage: "37%", "<1%" (above zero), ">99%" (below one); with decimals a share as it is, "10.7%" */
  const pct = (x: number, decimals = 0): string => {
    if (decimals) return percent(num(x * 100, decimals));
    const p = Math.round(x * 100);
    if (x > 0 && p < 1) return percent("<1");
    if (x < 1 && p > 99) return percent(">99");
    return percent(String(p));
  };

  /** A chance shown as a prediction: "37%", and never 0% or 100% ("<1%", ">99%" at the ends) */
  const chance = (x: number): string => {
    const p = Math.round(x * 100);
    return percent(p > 99 ? ">99" : p < 1 ? "<1" : String(p));
  };

  /** A day ("2026-10-15") or time (ISO) as "15. okt. 2026" / "15 Oct 2026", or another format */
  const date = (value: string | Date, format: DateFormat = "day"): string =>
    formatDate(typeof value === "string" ? parseISO(value) : value, formats[format], { locale: locale.dates });

  // The one formatter not on date-fns: its time zone support (@date-fns/tz) reads the current time
  // when it builds a date, which Next.js doesn't allow while prerendering. Intl only needs the time.
  const osloTime = new Intl.DateTimeFormat(locale.intl, { timeZone: "Europe/Oslo", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  /** A time (ISO) in Norwegian time, whatever time zone the page is rendered in: "17 October 2026, 05:24" */
  const dateTime = (value: string): string => {
    const parts = Object.fromEntries(osloTime.formatToParts(parseISO(value)).map((p) => [p.type, p.value]));
    return lang === "nb" ? `${parts.day}. ${parts.month} ${parts.year} kl. ${parts.hour}:${parts.minute}` : `${parts.day} ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute}`;
  };

  /** A date range: "23–25 Oct 2026", "30 Sep – 2 Oct 2026", "29 Dec 2026 – 3 Jan 2027", or one day */
  const dateRange = (from: string | null, to: string | null, long = false): string => {
    if (!from) return "";
    const full = long ? "long" : "day";
    if (!to || to === from) return date(from, full);
    const [a, b] = [parseISO(from), parseISO(to)];
    if (isSameMonth(a, b)) return `${date(a, "dayOnly")}–${date(b, full)}`;
    if (isSameYear(a, b)) return `${date(a, long ? "dayMonthLong" : "dayMonth")} – ${date(b, full)}`;
    return `${date(a, full)} – ${date(b, full)}`;
  };

  /** A chart's time (milliseconds, a day at UTC midnight or later that day) as that day: "15 Oct 2026" */
  const dayAt = (time: number, format: DateFormat = "day") => date(new Date(time).toISOString().slice(0, 10), format);

  /** A chart's week (its time, as for dayAt) as its ISO week number: "Week 41, 2026" */
  const weekAt = (time: number): string => {
    const day = parseISO(new Date(time).toISOString().slice(0, 10));
    return t("common.week", { week: getISOWeek(day), year: getISOWeekYear(day) });
  };

  /** Each pool's name ("Men's singles") and short code ("MS"), where five names don't fit in a row */
  const pools = Object.fromEntries(POOL_KEYS.map((pool) => [pool, t(`common.pools.${pool}`)])) as Record<Pool, string>;
  const poolCodes = Object.fromEntries(POOL_KEYS.map((pool) => [pool, t(`common.poolCodes.${pool}`)])) as Record<Pool, string>;

  /** A page's address in this language: as it is in Norwegian, under /en in English ("/" → "/en") */
  const href = (path: string): string => (lang === "en" && path.startsWith("/") ? (path === "/" ? "/en" : `/en${path}`) : path);

  return { lang, locale: locale.intl, openGraphLocale: locale.openGraph, t, plural, rich, num, signed, pct, chance, date, dateTime, dateRange, dayAt, weekAt, pools, poolCodes, href };
}

export type I18n = ReturnType<typeof build>;

const built = new Map<Language, I18n>();
/** Everything that depends on the language, built once per language */
export function createI18n(lang: Language): I18n {
  let i18n = built.get(lang);
  if (!i18n) built.set(lang, (i18n = build(lang)));
  return i18n;
}

/**
 * A path without its language prefix ("/en/players/1" → "/players/1"), and its language. Norwegian's
 * internal prefix too: on a page rendered on request (head to head), usePathname() gives the address
 * the rewrite served ("/nb/head-to-head"), not the one in the address bar.
 */
export function splitLanguage(path: string): { lang: Language; path: string } {
  for (const lang of LANGUAGES) {
    if (path === `/${lang}` || path.startsWith(`/${lang}/`)) return { lang, path: path.slice(lang.length + 1) || "/" };
  }
  return { lang: DEFAULT_LANGUAGE, path };
}
