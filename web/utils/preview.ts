// Small helpers for the head to head link previews (app/[lang]/(site)/head-to-head/**/preview.png)
import type { Record3 } from "@/types";

/** First names, unless two of them share one */
export function shortNames(names: string[]): string[] {
  const first = names.map((name) => name.split(" ")[0]);
  return new Set(first).size === first.length ? first : names;
}

/** A record from the first side's view: "3–1", with the draws in the middle when there are any ("3–1–1") */
export const recordValue = (r: Record3) => (r.draws ? `${r.wins}–${r.draws}–${r.losses}` : `${r.wins}–${r.losses}`);
