// A tournament of this season whose programme is out, for its structured data (schema.org
// SportsEvent): who organises it and the hall it's played in. Added every night by
// scripts/import-tournaments.mts (the pipeline), with the organiser's club recognised from Cup2000's
// name and the club's first home hall; checked and corrected here, then approved. The site uses the
// organiser and hall given here once the tournament is approved, and the guess until then.
// `issuesOf` lists what to look at: also the Studio's lists (sanity/structure.ts) and previews.
import { defineField, defineType } from "sanity";

/** What a tournament's organiser and hall still lack */
export function issuesOf(t: { organiser?: unknown; venue?: unknown; streetAddress?: string; postalCode?: string; town?: string }): string[] {
  if (!t.organiser) return ["Organiser not recognised"];
  if (!t.venue) return ["No hall"];
  return t.streetAddress && t.postalCode && t.town ? [] : ["The hall has no address"];
}

/** The tournaments needing a look (as issuesOf), as a GROQ filter */
export const NEEDS_ATTENTION = `!defined(organiser) || !defined(venue) || !defined(venue->streetAddress) || !defined(venue->postalCode) || !defined(venue->town)`;

export const tournament = defineType({
  name: "tournament",
  title: "Tournament",
  type: "document",
  fields: [
    defineField({ name: "name", type: "string", readOnly: true }),
    defineField({ name: "cup2000Id", title: "Cup2000 id", type: "number", readOnly: true }),
    defineField({ name: "startDate", title: "Starts", type: "date", readOnly: true }),
    defineField({ name: "endDate", title: "Ends", type: "date", readOnly: true }),
    defineField({ name: "organiserName", title: "Organiser in Cup2000", type: "string", readOnly: true, description: "As Cup2000 writes it; empty until Cup2000 lists it" }),
    defineField({
      name: "organiser",
      type: "reference",
      to: [{ type: "club" }],
      description: "The club arranging it, recognised from Cup2000's name",
      validation: (rule) =>
        rule.custom((value, { document }) =>
          value ? true : document?.organiserName ? `Not recognised: "${document.organiserName}". Choose the club.` : "Cup2000 doesn't list the organiser yet. Choose the club if you know it.",
        ).warning(),
    }),
    defineField({
      name: "venue",
      title: "Hall",
      type: "reference",
      to: [{ type: "venue" }],
      description: "Where it's played. Left empty, the next night's run fills in the organiser's first home hall.",
      validation: (rule) =>
        rule
          .custom(async (value: { _ref?: string } | undefined, { getClient }) => {
            if (!value?._ref) return "No hall: choose one, or add it under Venues.";
            const hall = await getClient({ apiVersion: "2025-02-19" }).fetch<{ streetAddress?: string; postalCode?: string; town?: string } | null>(`*[_id == $id][0]{ streetAddress, postalCode, town }`, { id: value._ref });
            return issuesOf({ organiser: true, venue: true, ...hall }).length ? "The hall has no full address (street, postcode and town): add it under Venues." : true;
          })
          .warning(),
    }),
    defineField({
      name: "approved",
      type: "boolean",
      initialValue: false,
      description: "Ticked: search engines get this organiser and hall. Unticked: the guess (the organiser recognised from Cup2000 and its first home hall), and the nightly run may still fill in what's empty.",
    }),
  ],
  orderings: [{ title: "Start date", name: "startDate", by: [{ field: "startDate", direction: "desc" }] }],
  preview: {
    select: { name: "name", startDate: "startDate", approved: "approved", organiser: "organiser.title", venue: "venue.name", streetAddress: "venue.streetAddress", postalCode: "venue.postalCode", town: "venue.town" },
    prepare({ name, startDate, approved, organiser, venue, streetAddress, postalCode, town }) {
      const issues = issuesOf({ organiser, venue, streetAddress, postalCode, town });
      const status = issues.length ? `⚠ ${issues[0]}` : approved ? "✓ Approved" : "Not approved";
      return { title: name, subtitle: [startDate, status, [organiser, venue].filter(Boolean).join(", ")].filter(Boolean).join(" · "), media: () => (issues.length ? "⚠️" : approved ? "✅" : "🏸") };
    },
  },
});
