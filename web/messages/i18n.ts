// The site's text, from the translation files: messages/<locale>/<area>.json, merged in
// messages/<locale>/index.ts. English is the only language so far, imported statically, so pages
// stay static and the text costs nothing at runtime. Keys are checked at compile time (a missing or
// misspelt key doesn't build).
//
// - t("players.history.title"), with {placeholders}: t("rankings.count", { count: num(n) })
// - plural("common.matches", n): an entry { "one": "{count} match", "other": "{count} matches" }
//   chosen by the language's plural rules ({count} is n, unless given in the values)
// - rich("tournaments.howItWorks.seeds", { strong: (text) => <strong>{text}</strong>, link: … }):
//   a sentence with markup, <strong>…</strong> and {placeholders} that are React nodes
//
// For Norwegian: add messages/nb/ with the same keys, choose the messages by locale here (from a
// [lang] route segment, next/root-params in server components), and pass the locale's messages to
// the client components that render text.
import { createElement, Fragment, type ReactNode } from "react";
import { en } from "./en";

type Messages = typeof en;
type Plural = { one: string; other: string };
type Join<P extends string, K extends string> = P extends "" ? K : `${P}.${K}`;
/** The dotted keys of the entries of type V (texts, or plural entries) */
type Keys<T, V, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends V ? Join<P, K> : T[K] extends string | Plural ? never : Keys<T[K], V, Join<P, K>>;
}[keyof T & string];
export type MessageKey = Keys<Messages, string>;
export type PluralKey = Keys<Messages, Plural>;
type Values = Record<string, string | number>;

const messages: Messages = en;
const LANGUAGE = "en";

const lookup = (key: string): unknown => key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages);
const fill = (text: string, values?: Values) => (values ? text.replace(/\{(\w+)\}/g, (match, name) => (name in values ? String(values[name]) : match)) : text);

/** A text, with its {placeholders} filled in */
export function t(key: MessageKey, values?: Values): string {
  return fill(lookup(key) as string, values);
}

/**
 * A text by count ("1 match", "3 matches"), with {count} and any other placeholders filled in. With
 * `decimals`, the count as it's shown with that many decimals ("1.0 points" takes the plural).
 */
export function plural(key: PluralKey, count: number, values?: Values, { decimals = 0 } = {}): string {
  const entry = lookup(key) as Plural;
  const rule = new Intl.PluralRules(LANGUAGE, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).select(count);
  return fill(rule === "one" ? entry.one : entry.other, { count, ...values });
}

type Part = ReactNode | ((text: ReactNode) => ReactNode);

/** A text with markup: <tag>…</tag> wrapped by parts[tag], {name} replaced by parts[name] (or values) */
export function rich(key: MessageKey, parts: Record<string, Part>, values?: Values): ReactNode {
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
}
