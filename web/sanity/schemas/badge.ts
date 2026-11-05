// A badge a player can earn, shown on their page: its title, description and art. Who earns it is
// worked out by the pipeline from the results (pipeline/achievements.mjs), by the rule its `key`
// names; a badge without a key is given by hand to the players whose ids are listed (the creator's
// badge). The text is in both of the site's languages, each falling back to the other when empty.
// In the text, {year} is the year earned (a national championship's; a player's years, when several)
// and {tournament} the tournament; {level} a milestone's level (500 matches) and {value} the player's
// own number (562 matches). `about` says how it's earned in general, for the achievements page
// (/achievements), where there is none of those. `listed` (on by default) takes it off that page alone:
// players still have it on their pages (unpublish it to hide it everywhere).
// A milestone (MILESTONES) is given by its levels, set here alone: each level's number is the
// threshold (500: 500 matches or more), and a player gets the highest they have reached, with its own
// title, description and art where it has them (else the badge's). Without levels nobody gets it.
import { defineArrayMember, defineField, defineType } from "sanity";
import { tidyText } from "./spacing";

/** The pipeline's rules (RULES in pipeline/achievements.mjs): a new rule needs its key here */
export const BADGE_RULES = [
  { title: "Triple: won singles, doubles and mixed at one tournament", value: "triple" },
  { title: "National champion: won an event at the senior NM", value: "nationalChampion" },
  { title: "Upset of the week: won the week's biggest upset", value: "upsetOfTheWeek" },
  { title: "Team match hero: won an upset in a team match won as an upset (Eliteserien, 1. and 2. div)", value: "teamMatchHero" },
  { title: "Win streak: matches won in a row in one discipline", value: "winStreak" },
  { title: "Iron player: rated matches played", value: "ironPlayer" },
  { title: "Three-set thriller: matches won in three sets", value: "threeSetThriller" },
];

/** The rules that give a number per player (PLAYER_RULES in pipeline/achievements.mjs), whose levels are set here */
export const MILESTONES: Record<string, string> = {
  winStreak: "wins in a row (the longest streak)",
  ironPlayer: "rated matches played",
  threeSetThriller: "matches won in three sets",
};
const isMilestone = (key: unknown) => typeof key === "string" && key in MILESTONES;

const PLACEHOLDERS = "{year}: the year earned (national champion); {tournament}: the tournament; {level}: the level reached, {value}: the player's own number (milestones)";

export const badge = defineType({
  name: "badge",
  title: "Badge",
  type: "document",
  fields: [
    defineField({
      name: "listed",
      title: "Show on the achievements page",
      type: "boolean",
      initialValue: true,
      description: "Off: left out of the achievements page (/achievements); players who have it still show it on their pages. To hide it everywhere, unpublish it.",
    }),
    defineField({
      name: "key",
      title: "Earned by",
      type: "string",
      options: { list: BADGE_RULES },
      description: "The rule that gives it, from the results. Leave empty for a badge given by hand to the players below.",
    }),
    defineField({ name: "title", title: "Title (Norwegian)", type: "string", description: PLACEHOLDERS, validation: tidyText }),
    defineField({ name: "titleEn", title: "Title (English)", type: "string", description: "Empty: the Norwegian title", validation: tidyText }),
    defineField({ name: "description", title: "Description (Norwegian)", type: "text", rows: 3, description: PLACEHOLDERS }),
    defineField({ name: "descriptionEn", title: "Description (English)", type: "text", rows: 3, description: "Empty: the Norwegian description" }),
    defineField({ name: "about", title: "How it's earned (Norwegian)", type: "text", rows: 3, description: "On the badges page, about the badge in general (no {year} there). Empty: the description" }),
    defineField({ name: "aboutEn", title: "How it's earned (English)", type: "text", rows: 3, description: "Empty: the Norwegian text" }),
    defineField({ name: "art", type: "image", options: { hotspot: true }, description: "Square, at least 256 × 256 pixels; SVG or PNG" }),
    defineField({
      name: "levels",
      title: "Levels",
      type: "array",
      description: "The levels: each one's number is the threshold (500: 500 or more), and a player gets the highest they have reached. A level's title, description and art replace the badge's (empty: the badge's). Without levels nobody gets it.",
      hidden: ({ document }) => !isMilestone(document?.key),
      of: [
        defineArrayMember({
          type: "object",
          name: "badgeLevel",
          fields: [
            defineField({
              name: "level",
              type: "number",
              description: "The threshold: wins in a row, matches played, or matches won in three sets",
              validation: (rule) => [rule.required(), rule.integer().positive()],
            }),
            defineField({ name: "title", title: "Title (Norwegian)", type: "string", validation: tidyText }),
            defineField({ name: "titleEn", title: "Title (English)", type: "string", validation: tidyText }),
            defineField({ name: "description", title: "Description (Norwegian)", type: "text", rows: 2 }),
            defineField({ name: "descriptionEn", title: "Description (English)", type: "text", rows: 2 }),
            defineField({ name: "art", type: "image", options: { hotspot: true } }),
          ],
          preview: { select: { level: "level", title: "title", titleEn: "titleEn", media: "art" }, prepare: ({ level, title, titleEn, media }) => ({ title: `Level ${level ?? "?"}`, subtitle: title || titleEn, media }) },
        }),
      ],
      validation: (rule) => [
        rule.custom((levels: { level?: number }[] | undefined) => {
          const seen = (levels ?? []).map((l) => l.level).filter((l) => l !== undefined);
          return new Set(seen).size === seen.length ? true : "Each level once";
        }),
        rule.custom((levels: unknown[] | undefined, { document }) => (isMilestone(document?.key) && !levels?.length ? "Without levels nobody gets this badge" : true)).warning(),
      ],
    }),
    defineField({
      name: "players",
      title: "Given to",
      type: "array",
      of: [defineArrayMember({ type: "number" })],
      description: "Player ids (the number in a player page's address, /players/12345), for a badge given by hand",
      validation: (rule) => rule.unique(),
    }),
  ],
  validation: (rule) => rule.custom((doc) => (doc?.title || doc?.titleEn ? true : "Give it a title")),
  orderings: [{ title: "Title", name: "title", by: [{ field: "title", direction: "asc" }] }],
  preview: {
    select: { title: "title", titleEn: "titleEn", key: "key", listed: "listed", media: "art" },
    prepare: ({ title, titleEn, key, listed, media }) => ({ title: title || titleEn, subtitle: `${key ? `Rule: ${key}` : "Given by hand"}${listed === false ? " · not on the achievements page" : ""}`, media }),
  },
});
