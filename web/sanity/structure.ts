// The Studio's lists: the tournaments first (the ones needing a look, the ones not approved yet, and
// all of them), then the clubs and the halls, then the players' badges, then the site's written pages (About,
// Help & support: one fixed document per page and language, schemas/page.ts).
import type { StructureResolver } from "sanity/structure";
import { PAGE_LANGUAGES, PAGES } from "./schemas/page";
import { NEEDS_ATTENTION } from "./schemas/tournament";

const byStart = [{ field: "startDate", direction: "desc" as const }];

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Content")
    .items([
      S.listItem()
        .title("Tournaments: needs attention")
        .schemaType("tournament")
        .child(S.documentList().title("Needs attention").schemaType("tournament").filter(`_type == "tournament" && (${NEEDS_ATTENTION})`).defaultOrdering(byStart)),
      S.listItem()
        .title("Tournaments: not approved")
        .schemaType("tournament")
        .child(S.documentList().title("Not approved").schemaType("tournament").filter(`_type == "tournament" && approved != true`).defaultOrdering(byStart)),
      S.listItem()
        .title("Tournaments")
        .schemaType("tournament")
        .child(S.documentList().title("Tournaments").schemaType("tournament").filter(`_type == "tournament"`).defaultOrdering(byStart)),
      S.divider(),
      S.documentTypeListItem("club").title("Clubs"),
      S.documentTypeListItem("venue").title("Venues"),
      S.divider(),
      S.documentTypeListItem("badge").title("Badges"),
      S.divider(),
      S.listItem()
        .title("Pages")
        .child(
          S.list()
            .title("Pages")
            .items(
              PAGES.flatMap(({ key, title }) =>
                PAGE_LANGUAGES.map(({ lang, title: language }) =>
                  S.listItem()
                    .id(`page-${key}-${lang}`)
                    .title(`${title} · ${language}`)
                    .schemaType("page")
                    .child(S.document().schemaType("page").documentId(`page-${key}-${lang}`).title(`${title} · ${language}`)),
                ),
              ),
            ),
        ),
    ]);
