// A badge's text and art as a player has earned it (components/players/Achievements.tsx, the achievements page, the
// account's overview): its {placeholders} filled in, and a milestone's level. No server code, so any component can use it.
import type { Achievement, Badge } from "@/types";

/** Years as ranges, oldest first: [2015, 2016, 2017, 2019] → "2015–2017, 2019" */
export function yearRanges(years: number[]): string {
  const sorted = [...new Set(years)].sort((a, b) => a - b);
  const ranges: [number, number][] = [];
  for (const y of sorted) {
    const last = ranges.at(-1);
    if (last && y === last[1] + 1) last[1] = y;
    else ranges.push([y, y]);
  }
  return ranges.map(([a, b]) => (a === b ? String(a) : `${a}–${b}`)).join(", ");
}

/** {year} (the awards' years), {tournament} (the newest's), {level} and {value} (a milestone's, as `format` writes numbers) filled in; without awards, taken out */
export const fillBadgeText = (text: string, awards: Achievement[], format: (n: number) => string = String) =>
  text
    .replace(/\{year\}/g, yearRanges(awards.flatMap((a) => (a.year ? [a.year] : []))))
    .replace(/\{tournament\}/g, awards[0]?.tournament ?? "")
    .replace(/\{level\}/g, awards[0]?.level !== undefined ? format(awards[0].level) : "")
    .replace(/\{value\}/g, awards[0]?.value !== undefined ? format(awards[0].value) : "")
    .replace(/\s+([.,!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

/**
 * A badge as shown at a level: the title, description and art of its highest level at or below it
 * (from the Studio's levels), the badge's own where that level leaves them empty or has none
 */
export function levelView(badge: Badge, level: number | undefined) {
  const own = level === undefined ? undefined : badge.levels.filter((l) => l.level <= level).at(-1);
  // The art's "Invert in dark mode" goes with the art: the level's own, else the badge's
  const artInvert = own?.art ? own.artInvert : badge.artInvert;
  return { title: own?.title ?? badge.title, description: own?.description ?? badge.description, art: own?.art ?? badge.art, ...(artInvert ? { artInvert } : {}) };
}

/** The level a milestone's number reaches: the highest of the badge's levels at or below it (undefined: below them all) */
export const levelReached = (badge: Badge, value: number) => badge.levels.filter((l) => l.level <= value).at(-1)?.level;
