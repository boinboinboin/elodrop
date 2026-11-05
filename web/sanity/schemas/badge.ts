// A badge a player can earn, shown on their page: its title, description and art. Who earns it is
// worked out by the pipeline from the results (pipeline/achievements.mjs), by the rule its `key`
// names; a badge without a key is given by hand to the players whose ids are listed (the creator's
// badge). The text is in both of the site's languages, each falling back to the other when empty.
// In the text, {year} is the year earned (a national championship's; a player's years, when several)
// and {tournament} the tournament. `about` says how it's earned in general, for the badges page
// (/achievements), where there is no year or tournament.
import { defineArrayMember, defineField, defineType } from "sanity";
import { tidyText } from "./spacing";

/** The pipeline's rules (RULES in pipeline/achievements.mjs): a new rule needs its key here */
export const BADGE_RULES = [
  { title: "Triple: won singles, doubles and mixed at one tournament", value: "triple" },
  { title: "National champion: won an event at the senior NM", value: "nationalChampion" },
  { title: "Upset of the week: won the week's biggest upset", value: "upsetOfTheWeek" },
];

const PLACEHOLDERS = "{year}: the year earned (national champion); {tournament}: the tournament";

export const badge = defineType({
  name: "badge",
  title: "Badge",
  type: "document",
  fields: [
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
  preview: { select: { title: "title", titleEn: "titleEn", key: "key", media: "art" }, prepare: ({ title, titleEn, key, media }) => ({ title: title || titleEn, subtitle: key ? `Rule: ${key}` : "Given by hand", media }) },
});
