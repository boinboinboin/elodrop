// A story behind one match, told on the match wherever it's listed (the players' pages, head to head, the upsets) and
// on the stories page (/stories): opened from "There's a story here" under the match. The match is given by its key,
// copied from under it on a player page ("T6084 22113 vs 20814"; utils/matchKey.ts). The text is in both of the
// site's languages, each falling back to the other when empty, with links in it where wanted, and a source (where
// the story comes from: a podcast, an article) under it.
// Visitors send theirs in from the stories page (signed in): each arrives here as a draft (supabase/functions/
// stories-to-sanity), with `submission` and who told it; publishing it shows it, deleting the draft declines it.
// Publishing refreshes the story's players' pages and the stories page at once (the Sanity webhook,
// app/api/revalidate).
import { defineArrayMember, defineField, defineType } from "sanity";
import { parseMatchKey } from "../../utils/matchKey";
import { tidyText } from "./spacing";

/** A link's address: a page on the site ("/players/123") or a full address ("https://…") */
const hrefField = () =>
  defineField({
    name: "href",
    title: "Address",
    type: "url",
    description: 'A page on the site ("/players/22113") or another site ("https://…")',
    validation: (rule) => rule.required().uri({ allowRelative: true, scheme: ["http", "https"] }),
  });

/** The story's text: paragraphs, bold, italic and links */
const storyText = (name: string, title: string, description?: string) =>
  defineField({
    name,
    title,
    type: "array",
    description,
    of: [
      defineArrayMember({
        type: "block",
        styles: [{ title: "Paragraph", value: "normal" }],
        lists: [],
        marks: {
          decorators: [
            { title: "Bold", value: "strong" },
            { title: "Italic", value: "em" },
          ],
          annotations: [{ name: "link", type: "object", title: "Link", fields: [hrefField()] }],
        },
      }),
    ],
  });

export const matchStory = defineType({
  name: "matchStory",
  title: "Match story",
  type: "document",
  fields: [
    defineField({
      name: "match",
      type: "string",
      description: 'The match key, copied from under the match on a player page (on a computer), e.g. "T6084 22113 vs 20814"',
      validation: (rule) => [
        rule.required(),
        rule.custom((value: string | undefined) => (!value || parseMatchKey(value) ? true : 'Not a match key: "T6084 22113 vs 20814" (doubles: "T6084 1+2 vs 3+4")')),
      ],
    }),
    defineField({ name: "matchSummary", title: "The match", type: "string", readOnly: true, description: "As the visitor who sent it in picked it, to check the key against", hidden: ({ value }) => !value }),
    defineField({ name: "title", title: "Title (Norwegian)", type: "string", description: "Optional, above the story", validation: tidyText }),
    defineField({ name: "titleEn", title: "Title (English)", type: "string", description: "Empty: the Norwegian title", validation: tidyText }),
    storyText("story", "Story (Norwegian)"),
    storyText("storyEn", "Story (English)", "Empty: the Norwegian story"),
    defineField({
      name: "source",
      type: "object",
      description: "Where the story comes from (a podcast, an article), shown under it. Optional",
      options: { collapsible: false },
      fields: [
        defineField({ name: "name", type: "string", description: 'What to call it ("Badmintonpodden, episode 12")', validation: tidyText }),
        defineField({ name: "url", title: "Address", type: "url", validation: (rule) => rule.uri({ scheme: ["http", "https"] }) }),
      ],
    }),
    defineField({ name: "teller", title: "Told by", type: "string", description: 'Shown as "Told by …" (a visitor\'s username, when they sent it in). Empty: nobody named', validation: tidyText }),
    defineField({ name: "submission", title: "Sent in as", type: "number", readOnly: true, description: "The visitor's submission (Supabase: story_submissions), which follows whether it's published", hidden: ({ value }) => value === undefined }),
  ],
  validation: (rule) => rule.custom((doc) => (doc?.story && (doc.story as unknown[]).length) || (doc?.storyEn && (doc.storyEn as unknown[]).length) ? true : "Write the story"),
  orderings: [{ title: "Newest", name: "newest", by: [{ field: "_createdAt", direction: "desc" }] }],
  preview: {
    select: { title: "title", titleEn: "titleEn", match: "match", summary: "matchSummary", teller: "teller" },
    prepare: ({ title, titleEn, match, summary, teller }) => ({ title: title || titleEn || summary || "Untitled", subtitle: [match, teller && `told by ${teller}`].filter(Boolean).join(" · "), media: () => "📖" }),
  },
});
