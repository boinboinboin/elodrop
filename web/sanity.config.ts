// The Sanity Studio, embedded at /studio (app/studio). Content: this season's tournaments, the clubs,
// the halls, the badges and the written pages, About and Help & support (sanity/schemas; the lists:
// sanity/structure.ts; publishing an approved tournament: sanity/actions.ts).
//
// Preview (the Presentation tool, free on every plan): a written page beside its editor, showing the draft. The Studio
// turns on draft mode on the site (app/api/draft-mode/enable, checked with SANITY_READ_TOKEN), and the page follows the
// draft as it's edited (components/content/PreviewRefresh.tsx). Each page's document links to its page, and opening a
// page in the preview opens its document.
import { defineConfig } from "sanity";
import { defineDocuments, defineLocations, presentationTool } from "sanity/presentation";
import { structureTool } from "sanity/structure";
import { actions } from "./sanity/actions";
import { schemaTypes } from "./sanity/schemas/club";
import { PAGE_LANGUAGES, PAGES } from "./sanity/schemas/page";
import { structure } from "./sanity/structure";

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "";
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";

/** A written page's address on the site: page-about-en → /en/about */
const pageHref = (key: string, lang: string) => `${lang === "en" ? "/en" : ""}/${key}`;

export default defineConfig({
  name: "default",
  title: "elodrop",
  basePath: "/studio",
  projectId,
  dataset,
  plugins: [
    structureTool({ structure }),
    presentationTool({
      title: "Preview",
      // The site is where the Studio is (the same origin), so only the paths
      previewUrl: { preview: "/about", previewMode: { enable: "/api/draft-mode/enable", disable: "/api/draft-mode/disable" } },
      resolve: {
        // The page in the preview → its document
        mainDocuments: defineDocuments(PAGES.flatMap(({ key }) => PAGE_LANGUAGES.map(({ lang }) => ({ route: pageHref(key, lang), filter: `_id == "page-${key}-${lang}"` })))),
        // A document → its page (the "Used on" link in the editor)
        locations: {
          page: defineLocations({
            select: { title: "title", id: "_id" },
            resolve: (doc) => {
              const match = /^(?:drafts\.)?page-([a-z]+)-(nb|en)$/.exec(String(doc?.id ?? ""));
              if (!match) return null;
              const href = pageHref(match[1], match[2]);
              return { locations: [{ title: doc?.title || href, href }] };
            },
          }),
        },
      },
    }),
  ],
  schema: { types: schemaTypes },
  // The written pages are fixed documents, opened from the "Pages" list (sanity/structure.ts), so not in "+ Create"
  document: { actions, newDocumentOptions: (templates) => templates.filter((template) => template.templateId !== "page") },
});
