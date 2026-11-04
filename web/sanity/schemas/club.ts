// A club: what the site shows for it besides the ratings. `title` is the short name the results use
// ("Kristiansand"), which links the club to its ratings; `nbfClubId` links its strength history.
// `homeVenues`: the halls its tournaments are usually played in, the first being the one an event's
// structured data gives (not team matches': a team match is played where its weekend's teams gather,
// whichever is the home team, so only its own hall counts).
import { defineArrayMember, defineField, defineType } from "sanity";
import { tidySlug, tidyText } from "./spacing";
import { tournament } from "./tournament";
import { venue } from "./venue";

export const club = defineType({
  name: "club",
  title: "Club",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Short name", type: "string", description: "As in the results, e.g. Kristiansand", validation: (rule) => [rule.required(), tidyText(rule)] }),
    defineField({ name: "slug", type: "slug", options: { source: "title" }, validation: (rule) => [rule.required(), tidySlug(rule)] }),
    defineField({ name: "fullName", title: "Full name", type: "string", validation: tidyText }),
    defineField({ name: "region", title: "Region (krets)", type: "string", validation: tidyText }),
    defineField({ name: "website", type: "url" }),
    defineField({ name: "nbfClubId", title: "NBF club id", type: "number", description: "badmintonportalen's club id" }),
    // hotspot: the crop tool, to trim a logo's margins (scripts/trim-logos.mts sets the crop to the
    // logo's visible part; the site applies it)
    defineField({ name: "logo", type: "image", options: { hotspot: true } }),
    defineField({
      name: "homeVenues",
      title: "Home halls",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "venue" }] })],
      description: "Where its tournaments are usually played. The first is the default: drag it to the top.",
      validation: (rule) => rule.unique(),
    }),
  ],
  orderings: [{ title: "Name", name: "title", by: [{ field: "title", direction: "asc" }] }],
  preview: { select: { title: "title", subtitle: "fullName", media: "logo" } },
});

export const schemaTypes = [tournament, club, venue];
