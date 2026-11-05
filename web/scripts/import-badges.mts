// Add the badges to Sanity (sanity/schemas/badge.ts): the ones the pipeline gives
// (pipeline/achievements.mjs) and the creator's, given by hand. Each gets its title and description
// in both languages and simple placeholder art, to change in the Studio; a milestone also gets an
// entry per level with its own art (the level on a bronze, then a gold ring), its text the badge's. A badge already there is
// left as it is, apart from fields added since that are still empty (`about`), so it can be run
// again without undoing the Studio's edits.
// Usage: pnpm --filter web import-badges   (reads NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_WRITE_TOKEN from .env.local)
import { createClient } from "@sanity/client";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const token = process.env.SANITY_WRITE_TOKEN;
if (!projectId || !token) throw new Error("Set NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_WRITE_TOKEN");
const client = createClient({ projectId, dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production", token, apiVersion: "2025-02-19", useCdn: false });

/** A round medal with a short text on it, as placeholder art */
const medal = (text: string, fill: string, ring: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><circle cx="128" cy="128" r="120" fill="${ring}"/><circle cx="128" cy="128" r="100" fill="${fill}"/><text x="128" y="128" text-anchor="middle" dominant-baseline="central" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="${text.length > 2 ? 64 : 96}" fill="#fff">${text}</text></svg>`;

interface Seed {
  _id: string;
  /** The pipeline's rule; none for a badge given by hand */
  key?: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  about: string;
  aboutEn: string;
  art: string;
  /** A milestone's levels, each with its own art */
  levels?: { level: number; art: string }[];
}

const BRONZE = "#b87333";
const GOLD = "#e0b030";
/** A milestone's levels: its number on a bronze ring, the top level on a gold one */
const levelArt = (fill: string, levels: [number, string][]) => levels.map(([level, text], i) => ({ level, art: medal(text, fill, i === levels.length - 1 ? GOLD : BRONZE) }));

const BADGES: Seed[] = [
  {
    _id: "badge-triple",
    key: "triple",
    title: "Oooh baby a triple!",
    titleEn: "Oooh baby a triple!",
    description: "Vant single, double og mixed double i samme turnering.",
    descriptionEn: "Won singles, doubles and mixed doubles at the same tournament.",
    about: "Vinn single, double og mixed double i samme turnering, i hvilke klasser som helst.",
    aboutEn: "Win singles, doubles and mixed doubles at the same tournament, in any classes.",
    art: medal("3×", "#7c3aed", "#c4b5fd"),
  },
  {
    _id: "badge-national-champion",
    key: "nationalChampion",
    title: "Norgesmester {year}",
    titleEn: "National Champion {year}",
    description: "Vant NM senior i {year}.",
    descriptionEn: "Won the senior national championships (NM) in {year}.",
    about: "Vinn en øvelse i NM senior. Ett merke, med årene du vant.",
    aboutEn: "Win an event at the senior national championships (NM). One badge, with the years you won.",
    art: medal("NM", "#b91c1c", "#fbbf24"),
  },
  {
    _id: "badge-upset-of-the-week",
    key: "upsetOfTheWeek",
    title: "Breaking the barrier",
    titleEn: "Breaking the barrier",
    description: "Vant ukas største overraskelse: kampen vunnet med lavest vinnersjanse den uka.",
    descriptionEn: "Won the week's biggest upset: the match won with the lowest chance of winning that week.",
    about: "Vinn ukas største overraskelse: kampen vunnet med lavest vinnersjanse den uka, mellom etablerte spillere.",
    aboutEn: "Win the week's biggest upset: the match won with the lowest chance of winning that week, between settled players.",
    art: medal("!", "#0369a1", "#7dd3fc"),
  },
  {
    _id: "badge-creator",
    title: "Skaperen",
    titleEn: "Creator",
    description: "Laget elodrop.",
    descriptionEn: "Made elodrop.",
    about: "Gitt til den som laget elodrop.",
    aboutEn: "Given to the maker of elodrop.",
    art: medal("★", "#111827", "#9ca3af"),
  },
  {
    _id: "badge-team-match-hero",
    key: "teamMatchHero",
    title: "Lagkamphelt",
    titleEn: "Team match hero",
    description: "Vant kampen sin som underdog for et lag som vant lagkampen som underdog.",
    descriptionEn: "Won their match as the underdog for a team that won the team match as the underdog.",
    about: "Vinn kampen din som underdog når laget ditt vinner en lagkamp det hadde under 30 % sjanse til å vinne, i Eliteserien, 1. eller 2. divisjon.",
    aboutEn: "Win your match as the underdog when your team wins a team match it had under a 30% chance of winning, in Eliteserien, 1. or 2. divisjon.",
    art: medal("VS", "#047857", "#6ee7b7"),
  },
  {
    _id: "badge-win-streak",
    key: "winStreak",
    title: "Glohet: {level} seire på rad",
    titleEn: "On fire: {level} in a row",
    description: "Vant {level} kamper på rad i én øvelse.",
    descriptionEn: "Won {level} matches in a row in one discipline.",
    about: "Vinn 20 kamper på rad i én øvelse, eller 30 for neste nivå. Den lengste rekka noen gang teller.",
    aboutEn: "Win 20 matches in a row in one discipline, or 30 for the next level. Your longest streak ever counts.",
    art: medal("20", "#c2410c", BRONZE),
    levels: levelArt("#c2410c", [[20, "20"], [30, "30"]]),
  },
  {
    _id: "badge-iron-player",
    key: "ironPlayer",
    title: "Jernspiller: {level} kamper",
    titleEn: "Iron player: {level} matches",
    description: "Spilte {level} ratede kamper.",
    descriptionEn: "Played {level} rated matches.",
    about: "Spill 500 ratede kamper, eller 1 000 for neste nivå, alle øvelser sammen.",
    aboutEn: "Play 500 rated matches, or 1,000 for the next level, all disciplines together.",
    art: medal("500", "#374151", BRONZE),
    levels: levelArt("#374151", [[500, "500"], [1000, "1K"]]),
  },
  {
    _id: "badge-three-set-thriller",
    key: "threeSetThriller",
    title: "Tresettsthriller",
    titleEn: "Three-set thriller",
    description: "Vant {level} kamper i tre sett.",
    descriptionEn: "Won {level} matches in three sets.",
    about: "Vinn 50 kamper i tre sett, eller 100 for neste nivå.",
    aboutEn: "Win 50 matches in three sets, or 100 for the next level.",
    art: medal("50", "#9d174d", BRONZE),
    levels: levelArt("#9d174d", [[50, "50"], [100, "100"]]),
  },
];

const upload = async (svg: string, filename: string) => {
  const asset = await client.assets.upload("image", Buffer.from(svg), { filename, contentType: "image/svg+xml" });
  return { _type: "image", asset: { _type: "reference", _ref: asset._id } };
};

const existing = new Set(await client.fetch<string[]>(`*[_type == "badge"]._id`));
let added = 0;
for (const { art, levels, ...badge } of BADGES) {
  if (existing.has(badge._id)) {
    // Fields added since it was created, only where still empty
    await client.patch(badge._id).setIfMissing({ about: badge.about, aboutEn: badge.aboutEn }).commit();
    continue;
  }
  const levelEntries = [];
  for (const l of levels ?? []) levelEntries.push({ _key: `level-${l.level}`, _type: "badgeLevel", level: l.level, art: await upload(l.art, `${badge._id}-${l.level}.svg`) });
  await client.createIfNotExists({ ...badge, _type: "badge", art: await upload(art, `${badge._id}.svg`), ...(levelEntries.length ? { levels: levelEntries } : {}) });
  added++;
}
console.log(`Added ${added} badges (${BADGES.length - added} were there already). Give the creator's badge to your player id in the Studio (Badges → Creator → Given to).`);
