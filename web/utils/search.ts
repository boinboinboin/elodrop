// The site search, run in the browser: the search bar and the player pickers load the index
// (/api/search-index/<language>) once per visit and search it as you type. Every word of the query must be
// in the text, with case, accents and spellings that sound alike folded together (utils/format.ts
// normalize). When that finds fewer results than wanted, close matches follow: every word of the query
// is the start of a word of the text, give or take a typo (none in words of up to 3 letters, 1 up to 7,
// 2 from 8), closest first.
import type { Language } from "@/messages/i18n";
import { normalize, words as splitWords } from "@/utils/format";
import { playerHref } from "@/utils/hrefs";

/** A player: [id, name, club], ranked players first, then by most matches */
export type SearchPlayer = [number, string, string | null];
/** A club, tournament or Eliteserien page; terms is the text searched, not shown */
export interface SearchPage {
  name: string;
  detail: string;
  url: string;
  logo?: string | null;
  terms: string;
}
export interface SearchIndex {
  players: SearchPlayer[];
  clubs: SearchPage[];
  tournaments: SearchPage[];
  eliteserien: SearchPage[];
}

/** The index with every searched text normalized once */
interface Loaded {
  players: { id: number; name: string; club: string | null; text: string }[];
  pages: Record<PageGroup, (SearchPage & { text: string })[]>;
  /** For the close matches: each list's words, with the items (their places in the list) that have them */
  words: Record<"players" | PageGroup, Map<string, number[]>>;
}
type PageGroup = "clubs" | "tournaments" | "eliteserien";

/** The words of a list's texts, each with the places of the items that have it */
function wordsOf(list: { text: string }[]): Map<string, number[]> {
  const words = new Map<string, number[]>();
  list.forEach(({ text }, i) => {
    for (const word of new Set(text.split(/\s+/).filter(Boolean))) {
      const items = words.get(word);
      if (items) items.push(i);
      else words.set(word, [i]);
    }
  });
  return words;
}

const loading = new Map<Language, Promise<Loaded>>();

/** The index in a language, fetched the first time it's asked for (call it early, e.g. on focus, to have it ready) */
export function loadSearchIndex(lang: Language): Promise<Loaded> {
  const cached = loading.get(lang);
  if (cached) return cached;
  const promise = fetch(`/api/search-index/${lang}`)
    .then((res) => {
      if (!res.ok) throw new Error(`search index: ${res.status}`);
      return res.json() as Promise<SearchIndex>;
    })
    .then((index) => {
      const pages = (list: SearchPage[]) => list.map((p) => ({ ...p, text: normalize(p.terms) }));
      const players = index.players.map(([id, name, club]) => ({ id, name, club, text: normalize(name) }));
      const [clubs, tournaments, eliteserien] = [pages(index.clubs), pages(index.tournaments), pages(index.eliteserien)];
      return {
        players,
        pages: { clubs, tournaments, eliteserien },
        words: { players: wordsOf(players), clubs: wordsOf(clubs), tournaments: wordsOf(tournaments), eliteserien: wordsOf(eliteserien) },
      };
    })
    .catch((error) => {
      loading.delete(lang); // try again next time
      throw error;
    });
  loading.set(lang, promise);
  return promise;
}

/** Typos allowed in a word of the query: none up to 3 letters, 1 up to 7, 2 from 8 */
const typosAllowed = (word: string) => (word.length <= 3 ? 0 : word.length <= 7 ? 1 : 2);

// Rows of the distance table, reused between comparisons (no allocation while typing)
let rows = [new Int32Array(0), new Int32Array(0), new Int32Array(0)];

/**
 * How far a word of the query is from the start of a word of the text: the fewest edits (a letter
 * added, dropped, changed, or two side by side swapped) to turn the word into the text word's first
 * letters, one fewer to one more than the word has; 0 when the text word contains it, Infinity when
 * more than the typos allowed. Stops as soon as every way is over.
 */
function closeness(word: string, textWord: string): number {
  if (textWord.includes(word)) return 0;
  const max = typosAllowed(word);
  if (!max) return Infinity;
  const n = word.length;
  const m = Math.min(textWord.length, n + 1);
  if (m < n - max) return Infinity;
  if (rows[0].length < m + 1) rows = [new Int32Array(m + 1), new Int32Array(m + 1), new Int32Array(m + 1)];
  let [before, previous, row] = rows;
  for (let j = 0; j <= m; j++) previous[j] = j;
  for (let i = 1; i <= n; i++) {
    row[0] = i;
    let best = i;
    for (let j = 1; j <= m; j++) {
      let d = Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + (word[i - 1] === textWord[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && word[i - 1] === textWord[j - 2] && word[i - 2] === textWord[j - 1]) d = Math.min(d, before[j - 2] + 1);
      row[j] = d;
      if (d < best) best = d;
    }
    if (best > max) return Infinity;
    [before, previous, row] = [previous, row, before];
  }
  // The last row: the distance to each start of the text word
  let best = Infinity;
  for (let j = Math.max(1, n - 1); j <= m; j++) best = Math.min(best, previous[j]);
  return best <= max ? best : Infinity;
}

const matcher = (query: string) => {
  const words = splitWords(query);
  return {
    words,
    /** Every word of the query in the text */
    matches: (text: string) => words.length > 0 && words.every((w) => text.includes(w)),
    /** Whether close matches are worth looking for: a word long enough for a typo */
    fuzzy: words.some((w) => typosAllowed(w) > 0),
  };
};

/**
 * The exact matches, then (when fewer than `limit`) the close ones: items with every word of the query
 * close to one of their words, in any order, fewest typos first, each tier in the list's order. Each of
 * the list's words is compared once (`words`), not each item's.
 */
function withCloseMatches<T>(list: T[], words: Map<string, number[]>, m: ReturnType<typeof matcher>, exact: T[], limit: number): T[] {
  if (exact.length >= limit || !m.fuzzy) return exact;
  // Per item, the typos so far over the query's words (missing: some word not close to any of its words)
  let typos: Map<number, number> | null = null;
  for (const word of m.words) {
    const next = new Map<number, number>();
    for (const [textWord, items] of words) {
      const c = closeness(word, textWord);
      if (c === Infinity) continue;
      for (const i of items) {
        if (typos && !typos.has(i)) continue;
        const total = (typos?.get(i) ?? 0) + c;
        if (!next.has(i) || total < next.get(i)!) next.set(i, total);
      }
    }
    typos = next;
    if (!typos.size) return exact;
  }
  const found = new Set(exact);
  const close = [...(typos ?? [])]
    .filter(([i]) => !found.has(list[i]))
    .sort(([a, x], [b, y]) => x - y || a - b)
    .map(([i]) => list[i]);
  return [...exact, ...close];
}

/** Players whose name contains every word of the query (name starting with it first, then ranked, then most matches), then close matches */
export function searchPlayers(index: Loaded, query: string, limit = 10): { id: number; name: string; club: string | null }[] {
  const m = matcher(query);
  const found = index.players.filter((p) => m.matches(p.text));
  // The index is ranked first, then by most matches, so keeping its order within each half sorts the rest
  const ordered = [...found.filter((p) => p.text.startsWith(m.words[0])), ...found.filter((p) => !p.text.startsWith(m.words[0]))];
  return withCloseMatches(index.players, index.words.players, m, ordered, limit).slice(0, limit).map(({ id, name, club }) => ({ id, name, club }));
}

/** The search bar's results: up to 6 players, clubs and tournaments, and every matching Eliteserien page (each with close matches when there are too few) */
export function searchSite(index: Loaded, query: string) {
  const m = matcher(query);
  const pages = (key: PageGroup, limit = Infinity) => {
    const list = index.pages[key];
    // Every Eliteserien page (no limit) that matches, else the close ones
    return withCloseMatches(list, index.words[key], m, list.filter((p) => m.matches(p.text)), limit === Infinity ? 1 : limit)
      .slice(0, limit)
      .map(({ name, detail, url, logo }) => ({ name, detail, url, logo }));
  };
  return {
    players: searchPlayers(index, query, 6).map((p) => ({ name: p.name, club: p.club, url: playerHref(p.id) })),
    clubs: pages("clubs", 6),
    tournaments: pages("tournaments", 6),
    eliteserien: pages("eliteserien"),
  };
}
