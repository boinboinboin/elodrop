// The pieces of an event's structured data (schema.org SportsEvent: tournaments and team matches)
// that come from the clubs and halls in Sanity: where it's played (a Place with its address) and who
// organises it (a SportsOrganization). Nothing is made up: a hall without a venue in Sanity is a
// Place with only its name, and an event with no hall at all has no location.
import type { ClubEntry, Venue } from "@/types";
import { clubHref } from "./hrefs";
import { absoluteUrl } from "./metadata";

/** Names compared ignoring case, spaces and punctuation ("Klæbu Idrettshall" = "klæbu idrettshall."); also scripts/import-venues.mts */
export const venueKey = (name: string) => name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

/** The venue with this name or another spelling of it */
export function findVenue(name: string | null | undefined, venues: Venue[]): Venue | null {
  if (!name) return null;
  const wanted = venueKey(name);
  return venues.find((v) => [v.name, ...(v.aliases ?? [])].some((n) => venueKey(n) === wanted)) ?? null;
}

/**
 * A Place: a venue with its address, or a hall known only by its name (`name`, from the results),
 * in Norway; undefined when there's neither. (A club's region is its krets, not a place, so it isn't
 * the address's region.)
 */
export function placeOf(venue: Venue | null, name?: string | null) {
  const placeName = venue?.name ?? name;
  if (!placeName) return undefined;
  return {
    "@type": "Place",
    name: placeName,
    address: {
      "@type": "PostalAddress",
      ...(venue?.streetAddress ? { streetAddress: venue.streetAddress } : {}),
      ...(venue?.postalCode ? { postalCode: venue.postalCode } : {}),
      ...(venue?.town ? { addressLocality: venue.town } : {}),
      addressCountry: "NO",
    },
  };
}

/**
 * The club an organiser's name is ("Haugerud IF-Badminton", "Moss Badmintonklubb", "Sandefjord"):
 * by full name or short name, else the longest club short name its first words are ("Vestre Aker Skiklubb-Badminton")
 */
export function clubByOrganiser(organiser: string | null | undefined, clubs: Record<string, ClubEntry>): ClubEntry | null {
  if (!organiser) return null;
  const wanted = venueKey(organiser);
  const all = Object.values(clubs);
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

/** A SportsOrganization: a club, with its page's address in the page's language (`href`), or just a name */
export function organizationOf(club: ClubEntry | null, name: string | null | undefined, href: (path: string) => string) {
  if (club) return { "@type": "SportsOrganization", name: club.fullName ?? club.title, url: absoluteUrl(href(clubHref(club.slug))) };
  return name ? { "@type": "SportsOrganization", name } : undefined;
}
