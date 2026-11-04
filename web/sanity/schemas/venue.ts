// A hall team matches and tournaments are played in, for the events' structured data (schema.org
// Place: utils/structuredData.ts). `name` and `aliases` are matched against badmintonportalen's free
// text for a team match's hall ("Klæbu idrettshall"), ignoring case, spaces and punctuation; a club's
// first home hall (club.homeVenues) is its tournaments' hall. Created from the team matches' halls by
// scripts/import-venues.mts; the address is filled in here.
import { defineArrayMember, defineField, defineType } from "sanity";
import { tidyText } from "./spacing";

export const venue = defineType({
  name: "venue",
  title: "Venue",
  type: "document",
  fields: [
    defineField({ name: "name", type: "string", description: "As badmintonportalen writes it, e.g. Klæbu idrettshall", validation: (rule) => [rule.required(), tidyText(rule)] }),
    defineField({ name: "aliases", title: "Other spellings", type: "array", of: [defineArrayMember({ type: "string", validation: tidyText })], description: "Other names the results use for this hall" }),
    defineField({ name: "streetAddress", title: "Street address", type: "string", validation: tidyText }),
    defineField({ name: "postalCode", title: "Postcode", type: "string", validation: tidyText }),
    defineField({ name: "town", type: "string", validation: tidyText }),
  ],
  orderings: [{ title: "Name", name: "name", by: [{ field: "name", direction: "asc" }] }],
  preview: { select: { title: "name", subtitle: "town" } },
});
