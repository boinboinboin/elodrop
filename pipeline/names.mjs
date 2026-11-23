// Players' names as they're written: badmintonportalen's register and results have some all in lower case
// ("lasse hansen", typed so when the player was registered), in capitals ("EIRIK EGGEN") or with the case turned
// round ("oLE tOBIAS"). A word in lower case gets a capital first letter ("krishanThakur": "KrishanThakur"); one in
// capitals (the whole name, or a word of four letters or more) or turned round is written with a capital and the
// rest in lower case, each part of a double name too ("jan-are", "TOR-KRISTIAN": "Jan-Are", "Tor-Kristian").
// Left as they are: words in mixed case ("McGovern"), short capitals in a name that isn't all capitals (initials
// or a suffix: "JR", "JS", "HIL"), the small words inside a name ("van der", "de", "ul", "bin"; "jr" and "sr" at
// its end too) and a nickname in brackets ("Freya (Tobi) Smallshire"). The register's notes after a name are left
// out: "ikke i bruk" (not in use) and anything in brackets at the end ("(chbs - Sv)", a Swedish club; "(ikke bruk denne)").
const PARTICLES = new Set(["de", "da", "das", "do", "dos", "di", "du", "del", "della", "van", "von", "der", "den", "ter", "ten", "la", "le", "ul", "ud", "uz", "din", "bin", "binti", "al", "el", "af", "jr", "jr.", "sr", "sr."]);
const letters = (s) => s.replace(/[^\p{L}]/gu, "");
const isLower = (l) => l === l.toLowerCase() && l !== l.toUpperCase();
const isUpper = (l) => l === l.toUpperCase() && l !== l.toLowerCase();
const capital = (part, rest) => {
  const at = part.search(/\p{L}/u);
  return part.slice(0, at) + part[at].toUpperCase() + rest(part.slice(at + 1));
};

export function tidyName(name) {
  if (typeof name !== "string") return name;
  const words = name.replace(/\s*\([^()]*\)\s*$/, "").replace(/,?\s*ikke i bruk\s*$/i, "").trim().split(/\s+/);
  const allCaps = isUpper(letters(words.join(""))) && letters(words.join("")).length >= 4;
  let bracket = false;
  return words
    .map((word, i) => {
      if (word.startsWith("(")) bracket = true;
      const inBracket = bracket;
      if (word.includes(")")) bracket = false;
      if (inBracket) return word;
      const caps = allCaps || (isUpper(letters(word)) && letters(word).length >= 4);
      const last = i === words.length - 1;
      return word
        .split("-")
        .map((part) => {
          const l = letters(part);
          if (!l) return part;
          // A small word inside the name (not its first; "jr", "sr" may end it)
          if (isLower(l) && i > 0 && PARTICLES.has(part) && (!last || /^[js]r/.test(part))) return part;
          if (caps && isUpper(l)) return capital(part, (s) => s.toLowerCase());
          // Turned round: a small first letter, the rest in capitals ("oLE", "hOX")
          if (l.length > 1 && isLower(l[0]) && isUpper(l.slice(1))) return capital(part, (s) => s.toLowerCase());
          if (isLower(l[0])) return capital(part, (s) => s);
          return part;
        })
        .join("-");
    })
    .join(" ");
}

/** A match with its players' names tidied; the same object if none needed it */
export function withTidyNames(m) {
  const sides = [m.side1, m.side2];
  if (!sides.some((side) => side?.some((p) => typeof p.name === "string" && tidyName(p.name) !== p.name))) return m;
  const tidy = (side) => side.map((p) => (typeof p.name === "string" ? { ...p, name: tidyName(p.name) } : p));
  return { ...m, side1: tidy(m.side1), side2: tidy(m.side2) };
}
