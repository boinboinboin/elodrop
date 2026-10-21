// The official NBF ranking lists (badmintonportalen.no/NBF/Ranglister/), for fetch-ranking.mjs and
// the official seeding in upcoming.mjs.
//
// Each age group has six lists: men's singles, men's doubles, women's singles, women's doubles and
// mixed doubles for women and for men, numbered from the age group's first list in that order.
// The lists are published about twice a week (Wednesdays and Fridays) as versions, the same dates
// for every list of a season.
import { call, text } from "./portalen.mjs";

// Age group: its id and its first list (men's singles)
export const AGE_GROUPS = {
  SEN: { group: "2001", first: 1 },
  U13: { group: "2004", first: 7 },
  U15: { group: "2005", first: 13 },
  U17: { group: "2006", first: 19 },
  U19: { group: "2007", first: 25 },
  // O35 to O80: 2008 to 2017, lists 31 to 90
  ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`O${35 + 5 * i}`, { group: String(2008 + i), first: 31 + 6 * i }])),
};
// A list's place after the age group's first: HS, HD, DS, DD, MD for women, MD for men
export const LISTS = { men: 0, mensDoubles: 1, women: 2, womensDoubles: 3, mixedWomen: 4, mixedMen: 5 };

const args = (season, group, list, page, version) => ({
  rankinglistagegroupid: group, rankinglistid: String(list), seasonid: season, rankinglistversiondate: version,
  agegroupid: "", classid: "", gender: "", clubid: "", searchall: null, regionid: "",
  pointsfrom: "", pointsto: "", rankingfrom: "", rankingto: "", birthdatefromstring: "",
  birthdatetostring: "", agefrom: "", ageto: "", playerid: "", param: "",
  pageindex: String(page), sortfield: "0", getversions: false, getplayer: false,
});

// <tr><td class='rank'>1</td><td class='playerid'>109614</td><td class='name'><a href='/NBF/Spiller/VisSpiller/#36427,...'>Brynjar Hus</a>, NTNUI</td><td class='clas'>E</td><td class='points points'>1224</td></tr>
const ROW =
  /<td class='rank'>(\d+)<\/td><td class='playerid'>(\d+)<\/td><td class='name'><a href='[^']*#(\d+),[^']*'[^>]*>(.*?)<\/a>,?(.*?)<\/td><td class='clas'>(.*?)<\/td><td class='points[^']*'>(\d+)/g;

// The service's version dates (MM/DD/YYYY) as yyyy-mm-dd, and back
export const iso = (v) => v.replace(/^(\d\d)\/(\d\d)\/(\d{4})$/, "$3-$1-$2");
export const serviceDate = (day) => day.replace(/^(\d{4})-(\d\d)-(\d\d)$/, "$2/$3/$1");

// A season's list versions, as yyyy-mm-dd, newest first
export async function versions(season) {
  const { Versions: list } = await call("GetRankingListPlayers", { ...args(season, "2001", 1, 0, ""), getversions: true });
  return list.map((v) => v.Value).filter(Boolean).map(iso).sort((a, b) => b.localeCompare(a));
}

// One list, every page: rank, player number, internal id (the same id as in our match data), name,
// club, class and points; `version` yyyy-mm-dd, or null for the current list. Also the period it
// covers.
export async function rankingList(season, group, list, version = null) {
  const rows = [];
  let period = "";
  for (let page = 0; ; page++) {
    // The current list is asked for without its age group (as the site does)
    const { Html: html } = await call("GetRankingListPlayers", args(season, version ? group : "", list, page, version ? serviceDate(version) : ""));
    if (page === 0) period = text(html.match(/Periode:(.*?)<br/)?.[1] ?? "");
    rows.push(
      ...[...html.matchAll(ROW)].map(([, rank, number, id, name, club, cls, points]) => ({
        rank: +rank, number: +number, id: +id, name: text(name), club: text(club), class: cls, points: +points,
      }))
    );
    if (!html.includes(`SelectRankingListPage(${page + 1})`)) break;
  }
  return { period, rows };
}
