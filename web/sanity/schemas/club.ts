// A club: what the site shows for it besides the ratings. `title` is the short name the results use
// ("Kristiansand"), which links the club to its ratings; `nbfClubId` links its strength history.
import { defineField, defineType } from "sanity";

export const club = defineType({
  name: "club",
  title: "Club",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Short name", type: "string", description: "As in the results, e.g. Kristiansand", validation: (rule) => rule.required() }),
    defineField({ name: "slug", type: "slug", options: { source: "title" }, validation: (rule) => rule.required() }),
    defineField({ name: "fullName", title: "Full name", type: "string" }),
    defineField({ name: "region", title: "Region (krets)", type: "string" }),
    defineField({ name: "website", type: "url" }),
    defineField({ name: "nbfClubId", title: "NBF club id", type: "number", description: "badmintonportalen's club id" }),
    // hotspot: the crop tool, to trim a logo's margins (scripts/trim-logos.mts sets the crop to the
    // logo's visible part; the site applies it)
    defineField({ name: "logo", type: "image", options: { hotspot: true } }),
  ],
  orderings: [{ title: "Name", name: "title", by: [{ field: "title", direction: "asc" }] }],
  preview: { select: { title: "title", subtitle: "fullName", media: "logo" } },
});

export const schemaTypes = [club];
