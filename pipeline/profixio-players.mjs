// Identifies the players of the Profixio tournaments (fetch-profixio.mjs), which have names and clubs
// only, as badmintonportalen players. First, profixio-identities.txt (written by hand) gives a
// club's abbreviation or typo its badmintonportalen name ("BBK" is Bergen), and a name the Profixio
// name of the same player ("B. Josgård" is Benny Josgård). Then a player is looked up in this order:
//   1. profixio-identities.txt, then identities.txt (by the name's hash), as for Cup2000 draws;
//   2. the same name: everyone known by it on badmintonportalen, from the player register
//      (data/players.json) and the names in its tournament and league results (data/portalen,
//      data/league), that could have played the match: in a junior class (U15 is everyone born in the
//      season's start year - 14 or later, a year's slack allowed) not too old by their birth year
//      (data/birth-years.json), nor born less than 5 years before it. One left: them; more: those of
//      the player's gender (from most of their singles and doubles: juniors sometimes play in the
//      other gender's events), then the one from the same club, if exactly one is;
//   3. a name with all the words of the other, in any order (Profixio's "Bård Vegard Grande" for
//      "Bård Grande", "Julian Wanvik" for "Julian Wanvik Hagen", "Lenning Elias" for "Elias Lenning"),
//      only if exactly one could have played and is from the same club;
//   4. a typo: a name one letter off ("Kennet Sanglay" for "Kenneth Sanglay"), two in a longer one
//      ("Alexander Drzewiecki"), its words starting with the same letters, only if exactly one could have
//      played and is from the same club;
//   5. initials (Færder Smashen and Fana Cup 2010 write "T. Treff (SaBK)"): the full words and a word
//      starting with each initial, if exactly one could have played; with a club given, exactly one from
//      that club or one its abbreviation fits (in 2007-2010 the one player left of some initials is often
//      someone else, who stopped before badmintonportalen's results start);
//   6. a name not identified in a tournament (not found, or ambiguous) that is identified as one
//      player only in the others is that player, if it has no club there or one of the same clubs.
// Anyone else is left unidentified (id null). The report lists them with the ambiguous and the
// loosely matched (3., 4.), the most matches first, for checking; unidentified.txt lists the
// names not identified anywhere, by club, to fill in by hand (into profixio-identities.txt).
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { normalize, knownAs, nameHash } from "./cup2000-results.mjs";
import { samePlayer } from "./same-players.mjs";

const DIR = new URL(".", import.meta.url).pathname;
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const GENDER = { MensSingles: "M", MensDoubles: "M", WomensSingles: "K", WomensDoubles: "K" };

// A club as Profixio writes it, but for case and spaces: not normalized, which would make "ÅBK"
// (Ålesund) "ABK" (Asker)
const clubKey = (club) => (club ?? "").toLowerCase().replace(/\s+/g, " ").trim();

// profixio-identities.txt: players by their name's hash (an id, or "= <hash>": the same player as
// that Profixio name) and clubs ("club <Profixio's> = <badmintonportalen's>")
function handIdentities() {
  const ids = new Map();
  const sameAs = new Map();
  const clubs = new Map();
  const file = `${DIR}profixio-identities.txt`;
  for (const raw of existsSync(file) ? readFileSync(file, "utf8").split("\n") : []) {
    const line = raw.replace(/#.*/, "").trim();
    const club = line.match(/^club\s+(.+?)\s*=\s*(.+)$/);
    if (club) clubs.set(clubKey(club[1]), club[2].trim());
    else if (/^[0-9a-f]{16}\s+=\s*[0-9a-f]{16}$/.test(line)) sameAs.set(line.slice(0, 16), line.slice(-16));
    else if (/^[0-9a-f]{16}\s+\d+$/.test(line)) ids.set(line.slice(0, 16), +line.split(/\s+/)[1]);
  }
  return { ids, sameAs, clubs };
}
// One name's words all in the other's, in any order: "bard vegard grande" and "bard grande",
// "julian wanvik" and "julian wanvik hagen", "lenning elias" and "elias lenning"
const words = (n) => n.split(" ").filter(Boolean);
const within = (a, b) => {
  const [x, y] = [words(a), words(b)];
  const [small, large] = x.length <= y.length ? [x, y] : [y, x];
  // Not initials ("s jorgensen" isn't within "solvar s flaten jorgensen"): those are step 5
  return small.length >= 2 && small.every((w) => w.length > 1 && large.includes(w));
};

// The letters to add, remove or change to make one name the other
const editDistance = (a, b) => {
  let row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
};
// A typo: one letter off ("kennet sanglay" and "kenneth sanglay"), two in a longer name ("alexander
// drzewiecki" and "aleksander drzewiecki"), with as many words, each starting with the same letter (not
// "elin solberg" and "malin solberg")
const typo = (a, b) => {
  const [x, y] = [words(a), words(b)];
  if (a === b || x.length < 2 || x.length !== y.length || x.some((w, i) => w[0] !== y[i][0])) return false;
  return editDistance(a, b) <= (a.length >= 12 ? 2 : 1);
};

// A club's abbreviation ("SaBK", "Krkn", "HoBK") fits a club name ("sandefjord", "kirkenes",
// "horten"): its letters in order, the first one first, after "BK"/"IL"/"IF" at the end
const abbreviates = (abbreviation, club) => {
  const a = normalize(abbreviation ?? "").replace(/\s/g, "").replace(/(bk|il|if)$/, "");
  if (!a || a.length > 6 || a[0] !== club[0]) return false;
  let i = 0;
  for (const ch of club) if (ch === a[i]) i++;
  return i === a.length;
};

// Everyone on badmintonportalen: id -> { name (as badmintonportalen writes it: the register's, else
// the newest result's), names (normalized), gender, clubs (normalized), born }
function knownPlayers(displayNames) {
  const players = new Map();
  // A person with more than one id (same-players.txt) is one candidate, under the id kept
  const player = (id) => {
    id = samePlayer(id);
    if (!players.has(id)) players.set(id, { id, name: null, names: new Set(), gender: null, genders: new Set(), clubs: new Set(), born: null });
    return players.get(id);
  };
  for (const p of readJson(`${DIR}data/players.json`)) {
    const q = player(p.id);
    if (p.id === q.id || !q.name) q.name = p.name;
    q.names.add(normalize(p.name));
    q.gender ??= p.gender ?? null;
    if (p.club) q.clubs.add(normalize(p.club));
  }
  const addSides = (m) => {
    for (const p of [...m.side1, ...m.side2]) {
      if (!p.id) continue;
      const q = player(p.id);
      q.names.add(normalize(p.name));
      q.latestName = p.name;
      if (p.club) {
        q.clubs.add(normalize(p.club));
        if (!displayNames.has(normalize(p.club))) displayNames.set(normalize(p.club), p.club);
      }
      if (GENDER[m.discipline]) q.genders.add(GENDER[m.discipline]);
    }
  };
  for (const f of readdirSync(`${DIR}data/portalen`).filter((f) => f.endsWith(".json"))) for (const m of readJson(`${DIR}data/portalen/${f}`).matches) addSides(m);
  for (const f of readdirSync(`${DIR}data/league`).filter((f) => f.endsWith(".json"))) for (const t of readJson(`${DIR}data/league/${f}`).ties ?? []) for (const g of t.games ?? []) addSides(g);
  const born = existsSync(`${DIR}data/birth-years.json`) ? readJson(`${DIR}data/birth-years.json`) : {};
  for (const q of players.values()) {
    q.born = born[q.id] ?? null;
    q.name ??= q.latestName;
    // Without a registered gender, the one of the events they played, if only one
    if (!q.gender && q.genders.size === 1) q.gender = [...q.genders][0];
  }
  return players;
}

// Profixio's club ("Ålesund Badmintonklubb") as badmintonportalen's short name, normalized
// ("alesund"), from the club list's full names, else the longest known club name it starts with, else
// the one club a name cut short starts ("Kristia"); and
// that name as badmintonportalen writes it ("Ålesund"), or null if it isn't one
function clubResolver(players, displayNames) {
  const aliases = new Map();
  for (const c of readJson(`${DIR}data/clubs.json`)) {
    aliases.set(normalize(c.fullName ?? c.name), normalize(c.name));
    aliases.set(normalize(c.name), normalize(c.name));
    displayNames.set(normalize(c.name), c.name);
  }
  const known = [...new Set([...aliases.values(), ...[...players.values()].flatMap((p) => [...p.clubs])])].filter((c) => c.length >= 3).sort((a, b) => b.length - a.length);
  const cache = new Map();
  const resolve = (club) => {
    const n = normalize(club ?? "");
    if (!n) return null;
    // else the one club a name cut short is the start of ("kristia", "haugesun")
    const cut = () => { const fits = n.length >= 4 ? known.filter((c) => c.startsWith(n)) : []; return fits.length === 1 ? fits[0] : null; };
    if (!cache.has(n)) cache.set(n, aliases.get(n) ?? known.find((c) => n === c || n.startsWith(`${c} `)) ?? cut() ?? n);
    return cache.get(n);
  };
  return { resolve, display: (club) => displayNames.get(resolve(club)) ?? null };
}

// Identifies the players of the tournaments in place (id null if not identified), with their names
// as badmintonportalen writes them ("Kristin Grønning" for "K. Grønning") and their clubs as it does
// where it knows the club. Returns the report.
export function identifyAll(tournaments) {
  // By hand first: clubs by their badmintonportalen names, and names by the same player's other name
  const hand = handIdentities();
  const profixioNames = new Map(); // name hash -> the Profixio name
  for (const t of tournaments) for (const m of t.matches) for (const p of [...m.side1, ...m.side2]) profixioNames.set(nameHash(p.name), p.name);
  const sameName = (name, seen = new Set()) => {
    const other = hand.sameAs.get(nameHash(name));
    return other && profixioNames.has(other) && !seen.has(other) ? sameName(profixioNames.get(other), seen.add(other)) : name;
  };
  for (const t of tournaments) {
    for (const m of t.matches) {
      for (const p of [...m.side1, ...m.side2]) {
        p.name = sameName(p.name);
        p.club = hand.clubs.get(clubKey(p.club)) ?? p.club;
      }
    }
  }
  const displayNames = new Map(); // normalized club -> as badmintonportalen writes it
  const players = knownPlayers(displayNames);
  const { resolve: clubOf, display: clubName } = clubResolver(players, displayNames);
  const byName = new Map();
  const byWord = new Map();
  const index = (map, key, id) => map.set(key, new Set([...(map.get(key) ?? []), id]));
  for (const p of players.values()) {
    for (const n of p.names) {
      index(byName, n, p.id);
      for (const w of words(n)) index(byWord, w, p.id);
    }
  }

  // A Profixio player's gender: the one of most of their singles and same-gender doubles (juniors
  // sometimes play in the other gender's events, so it only chooses between players of one name)
  const genderCounts = new Map();
  for (const t of tournaments) {
    for (const m of t.matches) {
      if (!GENDER[m.discipline]) continue;
      for (const p of [...m.side1, ...m.side2]) {
        const c = genderCounts.get(normalize(p.name)) ?? { M: 0, K: 0 };
        c[GENDER[m.discipline]]++;
        genderCounts.set(normalize(p.name), c);
      }
    }
  }
  const genderOf = (n) => {
    const c = genderCounts.get(n);
    return !c || c.M === c.K ? null : c.M > c.K ? "M" : "K";
  };

  const decisions = new Map();
  const identify = (name, club, discipline, className, season, year) => {
    const n = normalize(name);
    const gender = genderOf(n);
    const age = +(className.match(/^U(\d+)/)?.[1] ?? 0);
    const key = [n, club, age, season].join("|");
    if (decisions.has(key)) return decisions.get(key);
    const could = (id) => {
      const p = players.get(id);
      if (p.born && p.born > year - 5) return false;
      if (p.born && age && p.born < season - age) return false;
      return true;
    };
    const sameGender = (ids) => {
      const same = ids.filter((id) => !gender || !players.get(id).gender || players.get(id).gender === gender);
      return same.length ? same : ids;
    };
    const resolved = clubOf(club);
    const sameClub = (id) => resolved && [...players.get(id).clubs].some((c) => c === resolved || resolved.startsWith(`${c} `) || c.startsWith(`${resolved} `));
    let decision;
    const fixed = hand.ids.get(nameHash(name)) ?? knownAs(name);
    if (fixed) decision = { id: samePlayer(fixed), how: "by hand" };
    else {
      const exact = sameGender([...(byName.get(n) ?? [])].filter(could));
      const exactClub = exact.filter(sameClub);
      if (exact.length === 1) decision = { id: exact[0], how: "name" };
      else if (exact.length > 1 && exactClub.length === 1) decision = { id: exactClub[0], how: "name and club" };
      else if (exact.length > 1) decision = { id: null, how: "ambiguous", candidates: exact };
      else {
        const [first, last] = [words(n)[0], words(n).at(-1)];
        const sharing = [...(byWord.get(first) ?? [])].filter((id) => byWord.get(last)?.has(id));
        const loose = sameGender(sharing.filter((id) => [...players.get(id).names].some((k) => within(n, k))).filter(could)).filter(sameClub);
        // A typo in either word: everyone sharing the first or the last word
        const misspelt = () => {
          const near = [...new Set([...(byWord.get(first) ?? []), ...(byWord.get(last) ?? [])])].filter((id) => [...players.get(id).names].some((k) => typo(n, k)));
          return sameGender(near.filter(could)).filter(sameClub);
        };
        const typos = loose.length ? [] : misspelt();
        if (loose.length === 1) decision = { id: loose[0], how: "all words of the name and club", candidates: loose };
        else if (typos.length === 1) decision = { id: typos[0], how: "a typo and club", candidates: typos };
        else if (words(n).some((w) => w.length === 1)) {
          // Initials ("T. Treff", "K. Hellum", clubs as "SaBK"): everyone whose name has the full words and
          // a word starting with each initial, the first name first; more than one: the one whose club
          // the abbreviation fits
          const full = words(n).filter((w) => w.length > 1);
          const pool = full.length ? full.reduce((ids, w) => ids.filter((id) => byWord.get(w)?.has(id)), [...(byWord.get(full[0]) ?? [])]) : [];
          const initialsFit = (k) => {
            const kw = words(k);
            return kw[0][0] === words(n)[0][0] && words(n).every((w) => (w.length > 1 ? kw.includes(w) : kw.some((x) => x !== kw.at(-1) && x[0] === w)));
          };
          const fits = sameGender(pool.filter((id) => [...players.get(id).names].some(initialsFit)).filter(could));
          // With a club given, only a player of that club: initials say little, and the older tournaments
          // (2007-2010) have many players who stopped before badmintonportalen's results start (2013), so the
          // one player left of those initials is often someone else ("S. Jørgensen" of five clubs)
          const clubbed = fits.filter((id) => sameClub(id) || [...players.get(id).clubs].some((c) => abbreviates(club, c)));
          decision =
            !normalize(club ?? "") ? (fits.length === 1 ? { id: fits[0], how: "initials", candidates: fits } : { id: null, how: fits.length ? "ambiguous" : "not found", candidates: fits })
            : clubbed.length === 1 ? { id: clubbed[0], how: "initials and club", candidates: clubbed }
            : clubbed.length ? { id: null, how: "ambiguous", candidates: clubbed }
            : { id: null, how: "not found", candidates: fits };
        } else decision = { id: null, how: "not found" };
      }
    }
    decisions.set(key, decision);
    return decision;
  };

  // Every appearance's decision. Then a name identified as one player only, in the tournaments where
  // it is identified, is that player where it isn't (not found or ambiguous) if it has no club there
  // or one of the same clubs: some entry lists give no club, and a loose match needs one.
  const decided = new Map(); // player object -> decision
  const sameNameIds = new Map(); // normalized name -> id -> clubs (resolved) it was identified with
  for (const t of tournaments) {
    const year = +t.startDate.slice(0, 4);
    for (const m of t.matches) {
      for (const p of [...m.side1, ...m.side2]) {
        const d = identify(p.name, p.club, m.discipline, m.className, t.season, year);
        decided.set(p, d);
        if (!d.id) continue;
        const ids = sameNameIds.get(normalize(p.name)) ?? new Map();
        ids.set(d.id, (ids.get(d.id) ?? new Set()).add(clubOf(p.club)));
        sameNameIds.set(normalize(p.name), ids);
      }
    }
  }
  for (const [p, d] of decided) {
    const ids = sameNameIds.get(normalize(p.name));
    if (d.id || ids?.size !== 1) continue;
    const [[id, clubs]] = ids;
    if (!clubOf(p.club) || clubs.has(clubOf(p.club))) decided.set(p, { id, how: "same name elsewhere", candidates: d.candidates });
  }

  // Per Profixio name: how they were identified, and in how many matches and tournaments
  const people = new Map();
  let matched = 0;
  for (const t of tournaments) {
    for (const m of t.matches) {
      let all = true;
      for (const p of [...m.side1, ...m.side2]) {
        const d = decided.get(p);
        p.id = d.id;
        if (!d.id) all = false;
        const n = normalize(p.name);
        if (!people.has(n)) people.set(n, { name: p.name, how: new Map(), ids: new Set(), matches: 0, tournaments: new Set(), tournamentNames: new Set(), clubs: new Set(), clubCounts: new Map(), seasons: new Set(), candidates: new Set() });
        const q = people.get(n);
        q.how.set(d.how, (q.how.get(d.how) ?? 0) + 1);
        if (d.id) q.ids.add(d.id);
        for (const c of d.candidates ?? []) q.candidates.add(c);
        q.matches++;
        q.tournaments.add(t.slug);
        if (p.club) q.clubs.add(p.club);
        q.tournamentNames.add(t.name);
        const shown = clubName(p.club) ?? p.club?.replace(/^(.+) \((\1)\)$/, "$1") ?? "";
        q.clubCounts.set(shown, (q.clubCounts.get(shown) ?? 0) + 1);
        q.seasons.add(t.season);
        // "Malaysia (Malaysia)" -> "Malaysia"
        p.club = clubName(p.club) ?? p.club?.replace(/^(.+) \((\1)\)$/, "$1");
        if (d.id) p.name = players.get(d.id).name ?? p.name;
      }
      if (all) matched++;
    }
  }

  const total = tournaments.reduce((s, t) => s + t.matches.length, 0);
  const howCounts = new Map();
  for (const q of people.values()) {
    const how = [...q.how.keys()].sort().join(" / ");
    howCounts.set(how, (howCounts.get(how) ?? 0) + 1);
  }
  const matchesOf = (how) => [...people.values()].filter((q) => q.how.has(how)).reduce((s, q) => s + q.matches, 0);
  const summary = [
    `${tournaments.length} tournaments, ${total} matches; ${matched} (${Math.round((matched / total) * 100)}%) with every player identified`,
    `${people.size} names:`,
    ...[...howCounts].sort((a, b) => b[1] - a[1]).map(([how, n]) => `  ${how}: ${n}`),
    `appearances of names not found: ${matchesOf("not found")}, ambiguous: ${matchesOf("ambiguous")}`,
  ].join("\n");

  const line = (q) =>
    `${String(q.matches).padStart(4)}  ${q.name}  (${[...q.clubs].join(", ") || "no club"}; ${[...q.seasons].sort().map((s) => `${s}/${String(s + 1).slice(2)}`).join(", ")}; ${q.tournaments.size} tournaments)` +
    (q.ids.size ? `  -> ${[...q.ids].join(", ")}` : "") +
    (q.candidates.size && !q.ids.size ? `  candidates ${[...q.candidates].join(", ")}` : "");
  const section = (title, filter) => {
    const list = [...people.values()].filter(filter).sort((a, b) => b.matches - a.matches);
    return [`## ${title} (${list.length})`, "", ...list.map(line), ""];
  };
  const text = [
    "# Players of the Profixio tournaments (fetch-profixio.mjs, profixio-players.mjs)",
    "",
    summary,
    "",
    ...section("Identified by the words of the name and club only: check these", (q) => q.how.has("all words of the name and club")),
    ...section("Identified by a typo in the name and club: check these", (q) => q.how.has("a typo and club")),
    ...section("Identified by initials: check these", (q) => q.how.has("initials") || q.how.has("initials and club")),
    ...section("More than one player of that name", (q) => q.how.has("ambiguous")),
    ...section("Not found", (q) => q.how.has("not found")),
    ...section("Identified as different players in different tournaments", (q) => q.ids.size > 1),
  ].join("\n");
  // The names not identified in any tournament (not ambiguous ones), for filling in by hand (into
  // identities.txt): by the club they played most for, most matches first, each line ending in "="
  // for the player's badmintonportalen id or name
  const notFound = [...people.values()].filter((q) => !q.ids.size && !q.how.has("ambiguous"));
  const clubOfPerson = (q) => [...q.clubCounts].sort((a, b) => b[1] - a[1])[0]?.[0] || "No club given";
  const byClub = Map.groupBy(notFound, clubOfPerson);
  const seasonsOf = (q) => {
    const list = [...q.seasons].sort();
    const label = (y) => `${y}/${String(y + 1).slice(2)}`;
    return list.length > 1 ? `${label(list[0])}–${label(list.at(-1))}` : label(list[0]);
  };
  const width = Math.max(...notFound.map((q) => q.name.length));
  const fillIn = [
    "Players not identified in Profixio's tournaments of 2007-2014 (fetch-profixio.mjs)",
    "",
    'After a player\'s "=", write their badmintonportalen player id, or their name as it is on',
    "badmintonportalen. Leave the ones you don't know empty, and the rest of the line as it is.",
    `${notFound.length} players, by the club they played for most; the most matches first.`,
    "",
    ...[...byClub]
      .sort((a, b) => a[0].localeCompare(b[0], "nb"))
      .flatMap(([club, list]) => [
        `== ${club} ==`,
        ...list
          .sort((a, b) => b.matches - a.matches || a.name.localeCompare(b.name, "nb"))
          .map((q) => {
            const tournaments = [...q.tournamentNames];
            const shown = tournaments.slice(0, 3).join(", ") + (tournaments.length > 3 ? ` +${tournaments.length - 3} more` : "");
            const others = [...q.clubCounts.keys()].filter((c) => c && c !== club);
            return `${q.name.padEnd(width)}  ${String(q.matches).padStart(3)} ${q.matches === 1 ? "match, " : "matches,"} ${seasonsOf(q)}${others.length ? `, also ${others.join(", ")}` : ""} (${shown})  = `;
          }),
        "",
      ]),
  ].join("\n");
  return { summary, text, fillIn };
}
