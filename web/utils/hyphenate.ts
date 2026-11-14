// Where the page titles (the `h1` utility, app/globals.css) may break a long word, chosen by hand: the browser's own
// hyphenation (`hyphens: auto`) broke Norwegian compounds in odd places. Each word is written with a "|" where it may
// break; at the end of a line it breaks there with a hyphen, and nowhere else. A word is matched whole, ignoring case
// ("badminton|rangering" also hyphenates "Badmintonrangering"), in titles from the translation files and from the data
// (players, tournaments, clubs, divisions, teams) alike.
//
// Add a word when it doesn't fit on one line on a phone (from 340px wide, about 17 letters at the titles' size). A word
// that isn't here and doesn't fit is broken at the edge of the screen, without a hyphen; a word with a hyphen of its
// own ("Hesjedal-Johannessen") already breaks after it.
const WORDS = [
  "Turnerings|trekninger",
  "badminton|rangering",
  "Vestlands|mesterskapet",
  "Tromsø|studentenes",
];

const SOFT_HYPHEN = "­";
/** Each word in lower case, with the lengths of its parts */
const BREAKS = new Map(WORDS.map((word) => [word.replaceAll("|", "").toLocaleLowerCase("nb"), word.split("|").map((part) => part.length)]));

/** The text with soft hyphens where its words may break (for headings only: not for page titles in metadata) */
export function hyphenate(text: string): string {
  return text.replace(/\p{L}+/gu, (word) => {
    const parts = BREAKS.get(word.toLocaleLowerCase("nb"));
    if (!parts) return word;
    let at = 0;
    return parts.map((length) => word.slice(at, (at += length))).join(SOFT_HYPHEN);
  });
}
