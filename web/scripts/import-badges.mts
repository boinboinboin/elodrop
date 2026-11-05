// Add the first badges to Sanity (sanity/schemas/badge.ts): the three the pipeline gives
// (pipeline/achievements.mjs) and the creator's, given by hand. Each gets its title and description
// in both languages and simple placeholder art, to change in the Studio. A badge already there is
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
}

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
];

const existing = new Set(await client.fetch<string[]>(`*[_type == "badge"]._id`));
let added = 0;
for (const { art, ...badge } of BADGES) {
  if (existing.has(badge._id)) {
    // Fields added since it was created, only where still empty
    await client.patch(badge._id).setIfMissing({ about: badge.about, aboutEn: badge.aboutEn }).commit();
    continue;
  }
  const asset = await client.assets.upload("image", Buffer.from(art), { filename: `${badge._id}.svg`, contentType: "image/svg+xml" });
  await client.createIfNotExists({ ...badge, _type: "badge", art: { _type: "image", asset: { _type: "reference", _ref: asset._id } } });
  added++;
}
console.log(`Added ${added} badges (${BADGES.length - added} were there already). Give the creator's badge to your player id in the Studio (Badges → Creator → Given to).`);
