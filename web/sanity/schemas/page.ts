// A page written in the Studio (/about and /support; web/components/content renders it): a title, a lead, and the
// content, rich text with blocks put in between its paragraphs (FAQ, image, person, button, note, the site's numbers,
// email). Each page has a document per language with a set id (PAGES, in the Studio's "Pages" list:
// sanity/structure.ts): page-about-nb, page-about-en, page-support-nb and page-support-en. An English page without
// its document shows the Norwegian one. Publishing one refreshes that page at once (the Sanity webhook,
// app/api/revalidate).
// Each icon from its own path: since v5 the package's root exports none of them (the names there are only
// deprecated types, so a root import passes the type check but not the build)
import { BarChartIcon } from "@sanity/icons/BarChart";
import { EnvelopeIcon } from "@sanity/icons/Envelope";
import { HelpCircleIcon } from "@sanity/icons/HelpCircle";
import { ImageIcon } from "@sanity/icons/Image";
import { InfoOutlineIcon } from "@sanity/icons/InfoOutline";
import { LaunchIcon } from "@sanity/icons/Launch";
import { UserIcon } from "@sanity/icons/User";
import { defineArrayMember, defineField, defineType, type StringRule } from "sanity";
import { tidyText } from "./spacing";

/** The pages written in the Studio: the site's address and the Studio's name for each */
export const PAGES = [
  { key: "about", title: "About" },
  { key: "support", title: "Help & support" },
] as const;
export const PAGE_LANGUAGES = [
  { lang: "nb", title: "Norsk" },
  { lang: "en", title: "English" },
] as const;

/** A link: a page on the site ("/rankings", in the page's language on the English site) or a full address */
const hrefField = ({ name = "href", title = "Link", required = true } = {}) =>
  defineField({
    name,
    title,
    type: "string",
    description: "A page on the site, starting with / (e.g. /rankings), or a full address (https://…)",
    validation: (rule: StringRule) => {
      const valid = rule.custom((value) => (!value || /^\/(?!\/)/.test(value) || /^(https?:\/\/|mailto:)/.test(value) ? true : "Start with / for a page on the site, or https:// for another site"));
      return required ? [rule.required(), valid] : valid;
    },
  });

/** Text: paragraphs (and with `headings` H2 and H3), lists, bold, italic and links */
const textBlock = ({ headings = true } = {}) =>
  defineArrayMember({
    type: "block",
    styles: headings
      ? [
          { title: "Paragraph", value: "normal" },
          { title: "Heading", value: "h2" },
          { title: "Subheading", value: "h3" },
        ]
      : [{ title: "Paragraph", value: "normal" }],
    lists: [
      { title: "Bullets", value: "bullet" },
      { title: "Numbered", value: "number" },
    ],
    marks: {
      decorators: [
        { title: "Bold", value: "strong" },
        { title: "Italic", value: "em" },
      ],
      annotations: [{ name: "link", type: "object", title: "Link", fields: [hrefField()] }],
    },
  });

/** A rich text field of paragraphs, lists and links, without headings (a block's own text) */
const richText = (name: string, title: string) => defineField({ name, title, type: "array", of: [textBlock({ headings: false })] });

const imageField = (name: string, title: string, { alt = true } = {}) =>
  defineField({
    name,
    title,
    type: "image",
    options: { hotspot: true },
    fields: alt ? [defineField({ name: "alt", title: "Description (for screen readers and search engines)", type: "string", validation: (rule) => [rule.required(), tidyText(rule)] })] : [],
  });

const faq = defineArrayMember({
  name: "faq",
  title: "FAQ",
  type: "object",
  icon: HelpCircleIcon,
  fields: [
    defineField({ name: "heading", title: "Heading (optional)", type: "string", validation: tidyText }),
    defineField({
      name: "items",
      title: "Questions",
      type: "array",
      of: [
        defineArrayMember({
          name: "faqItem",
          type: "object",
          fields: [defineField({ name: "question", type: "string", validation: (rule) => [rule.required(), tidyText(rule)] }), richText("answer", "Answer")],
          preview: { select: { title: "question" } },
        }),
      ],
      validation: (rule) => rule.min(1),
    }),
  ],
  preview: { select: { title: "heading", items: "items" }, prepare: ({ title, items }) => ({ title: title || "FAQ", subtitle: `${items?.length ?? 0} questions` }) },
});

const figure = defineArrayMember({
  name: "figure",
  title: "Image",
  type: "object",
  icon: ImageIcon,
  fields: [imageField("image", "Image"), defineField({ name: "caption", type: "string", validation: tidyText })],
  preview: { select: { title: "caption", alt: "image.alt", media: "image" }, prepare: ({ title, alt, media }) => ({ title: title || alt || "Image", subtitle: "Image", media }) },
});

const person = defineArrayMember({
  name: "person",
  title: "Person",
  type: "object",
  icon: UserIcon,
  fields: [
    defineField({ name: "name", type: "string", validation: (rule) => [rule.required(), tidyText(rule)] }),
    defineField({ name: "role", type: "string", description: "E.g. Made Elodrop", validation: tidyText }),
    imageField("photo", "Photo", { alt: false }),
    richText("text", "About them"),
    hrefField({ name: "link", title: "Link (optional)", required: false }),
    defineField({ name: "linkLabel", title: "Link text", type: "string", validation: tidyText }),
  ],
  preview: { select: { title: "name", subtitle: "role", media: "photo" } },
});

const linkButton = defineArrayMember({
  name: "linkButton",
  title: "Button",
  type: "object",
  icon: LaunchIcon,
  fields: [
    defineField({ name: "label", type: "string", validation: (rule) => [rule.required(), tidyText(rule)] }),
    hrefField(),
    defineField({ name: "style", title: "Look", type: "string", options: { list: [{ title: "Filled", value: "primary" }, { title: "Outlined", value: "secondary" }], layout: "radio" }, initialValue: "primary" }),
  ],
  preview: { select: { title: "label", subtitle: "href" } },
});

const note = defineArrayMember({
  name: "note",
  title: "Note box",
  type: "object",
  icon: InfoOutlineIcon,
  fields: [
    defineField({ name: "tone", type: "string", options: { list: [{ title: "Information", value: "info" }, { title: "Warning", value: "warning" }], layout: "radio" }, initialValue: "info" }),
    richText("text", "Text"),
  ],
  preview: { select: { tone: "tone" }, prepare: ({ tone }) => ({ title: tone === "warning" ? "Warning" : "Note", subtitle: "Note box" }) },
});

/** The site's numbers a stats block can show (counted in web/components/content/ContentPage.tsx) */
export const SITE_STATS = [
  { title: "Players with a rating", value: "players" },
  { title: "Team matches", value: "teamMatches" },
  { title: "Seasons", value: "seasons" },
] as const;
export type SiteStat = (typeof SITE_STATS)[number]["value"];
const stats = defineArrayMember({
  name: "stats",
  title: "The site's numbers",
  type: "object",
  icon: BarChartIcon,
  fields: [
    defineField({
      name: "items",
      title: "Numbers",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
      options: { list: [...SITE_STATS] },
      description: "Counted from the ratings, so they stay up to date",
      validation: (rule) => rule.min(1).unique(),
    }),
  ],
  preview: { select: { items: "items" }, prepare: ({ items }) => ({ title: "The site's numbers", subtitle: (items ?? []).join(", ") }) },
});

// "contact", not "email": that's the name of Sanity's own email field type, which a block can't take
const contact = defineArrayMember({
  name: "contact",
  title: "Email",
  type: "object",
  icon: EnvelopeIcon,
  fields: [
    defineField({ name: "address", type: "string", validation: (rule) => [rule.required().email()] }),
    defineField({ name: "label", type: "string", description: "E.g. Contact us", validation: tidyText }),
    defineField({ name: "note", type: "string", description: "E.g. We answer within a week", validation: tidyText }),
  ],
  preview: { select: { title: "address", subtitle: "label" } },
});

export const page = defineType({
  name: "page",
  title: "Page",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string", validation: (rule) => [rule.required(), tidyText(rule)] }),
    defineField({ name: "lead", type: "text", rows: 3, description: "The large text under the title", validation: tidyText }),
    defineField({ name: "description", title: "Description for search engines", type: "text", rows: 2, description: "Optional: the lead is used without it", validation: tidyText }),
    defineField({
      name: "content",
      type: "array",
      description: "Write the text here. To add a block (FAQ, image, person, button, note box, the site's numbers, email), put the cursor where it should go and choose it from the + button in the toolbar. Drag a block to move it.",
      of: [textBlock(), faq, figure, person, linkButton, note, stats, contact],
      // The + menu in the toolbar, grouped
      options: {
        insertMenu: {
          filter: false,
          groups: [
            { name: "text", title: "Text", of: ["note", "faq"] },
            { name: "media", title: "Images and people", of: ["figure", "person"] },
            { name: "actions", title: "Links and contact", of: ["linkButton", "contact"] },
            { name: "data", title: "From the site", of: ["stats"] },
          ],
        },
      },
    }),
  ],
  preview: { select: { title: "title", id: "_id" }, prepare: ({ title, id }) => ({ title: title || "Untitled", subtitle: String(id ?? "").replace(/^drafts\./, "") }) },
});
