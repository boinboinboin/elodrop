// The site search, run in the browser: the search bar and the player pickers load the index
// (/api/search-index) once per visit and search it as you type. Every word of the query must be
// in the text, case and accents ignored and æ/ø/å read as ae/o/a.
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
  pages: Record<"clubs" | "tournaments" | "eliteserien", (SearchPage & { text: string })[]>;
}

let loading: Promise<Loaded> | null = null;

/** The index, fetched the first time it's asked for (call it early, e.g. on focus, to have it ready) */
export function loadSearchIndex(): Promise<Loaded> {
  loading ??= fetch("/api/search-index")
    .then((res) => {
      if (!res.ok) throw new Error(`search index: ${res.status}`);
      return res.json() as Promise<SearchIndex>;
    })
    .then((index) => {
      const pages = (list: SearchPage[]) => list.map((p) => ({ ...p, text: normalize(p.terms) }));
      return {
        players: index.players.map(([id, name, club]) => ({ id, name, club, text: normalize(name) })),
        pages: { clubs: pages(index.clubs), tournaments: pages(index.tournaments), eliteserien: pages(index.eliteserien) },
      };
    })
    .catch((error) => {
      loading = null; // try again next time
      throw error;
    });
  return loading;
}

const matcher = (query: string) => {
  const words = splitWords(query);
  return { words, matches: (text: string) => words.length > 0 && words.every((w) => text.includes(w)) };
};

/** Players whose name contains every word of the query: name starting with it first, then ranked, then most matches */
export function searchPlayers(index: Loaded, query: string, limit = 10): { id: number; name: string; club: string | null }[] {
  const { words, matches } = matcher(query);
  const found = index.players.filter((p) => matches(p.text));
  // The index is ranked first, then by most matches, so keeping its order within each half sorts the rest
  const ordered = [...found.filter((p) => p.text.startsWith(words[0])), ...found.filter((p) => !p.text.startsWith(words[0]))];
  return ordered.slice(0, limit).map(({ id, name, club }) => ({ id, name, club }));
}

/** The search bar's results: up to 6 players, clubs and tournaments, and every matching Eliteserien page */
export function searchSite(index: Loaded, query: string) {
  const { matches } = matcher(query);
  const pages = (key: keyof Loaded["pages"], limit = Infinity) =>
    index.pages[key].filter((p) => matches(p.text)).slice(0, limit).map(({ name, detail, url, logo }) => ({ name, detail, url, logo }));
  return {
    players: searchPlayers(index, query, 6).map((p) => ({ name: p.name, club: p.club, url: playerHref(p.id) })),
    clubs: pages("clubs", 6),
    tournaments: pages("tournaments", 6),
    eliteserien: pages("eliteserien"),
  };
}
