// The Studio's lists: the tournaments first (the ones needing a look, the ones not approved yet, and
// all of them), then the clubs and the halls, then the players' badges.
import type { StructureResolver } from "sanity/structure";
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
    ]);
