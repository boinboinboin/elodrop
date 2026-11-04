// Matching an organiser's name to a club, and halls' names to each other. No imports but types, so
// plain Node can run it too (scripts/import-tournaments.mts, in the nightly pipeline).

/** Names compared ignoring case, spaces and punctuation ("Klæbu Idrettshall" = "klæbu idrettshall.") */
export const venueKey = (name: string) => name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

/**
 * The club an organiser's name is ("Haugerud IF-Badminton", "Moss Badmintonklubb", "Sandefjord"):
 * by full name or short name, else the longest club short name its first words are ("Vestre Aker Skiklubb-Badminton")
 */
export function clubByOrganiser<C extends { title: string; fullName: string | null }>(organiser: string | null | undefined, clubs: Record<string, C> | C[]): C | null {
  if (!organiser) return null;
  const wanted = venueKey(organiser);
  const all = Array.isArray(clubs) ? clubs : Object.values(clubs);
  const exact = all.find((c) => venueKey(c.title) === wanted || (c.fullName && venueKey(c.fullName) === wanted));
  if (exact) return exact;
  // The longest short name the organiser's name starts with, word for word ("Vestre Aker Skiklubb-Badminton": Vestre Aker)
  const words = organiser.split(/[\s-]+/);
  for (let n = words.length - 1; n >= 1; n--) {
    const start = venueKey(words.slice(0, n).join(" "));
    const club = all.find((c) => venueKey(c.title) === start);
    if (club) return club;
  }
  return null;
}
