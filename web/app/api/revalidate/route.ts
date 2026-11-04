// Marks cached data stale, so the pages using it refresh as they are visited (each one an ISR write).
// POST with "Authorization: Bearer <secret>" (or ?secret=).
//
// - The pipeline, after it uploads new data: ?tag=elo-data (everything), or ?tag=elo-data:<area>
//   (e.g. elo-data:tournaments) for only the pages using that area's data (data/load.ts).
// - The Sanity webhook, after a document is published, changed or deleted: its body says which
//   document, so only the pages using it refresh (the tags in data/sanityTags.ts, used by data/sanity.ts):
//     a tournament                     → its own pages
//     a hall, or only a club's home halls (the Studio's Publish adds the hall there) → the pages with halls
//     anything else about a club (name, slug, logo) → nothing now: the club list is on nearly every page, so
//       it waits for the next full nightly run, which refreshes every page anyway and the club list with it
//       (.github/workflows/pipeline.yml, ?tag=sanity:clubs), instead of writing every page again
//   Its projection, so a club can tell whether only its home halls changed (without it, every club
//   change waits for the night; the rest still works from the whole document):
//     { _id, _type, cup2000Id, "clubChanged": delta::changedAny((title, slug, fullName, region, website, nbfClubId, logo)) }
//   Drafts are skipped (the webhook should leave them out anyway: the Studio saves one every few seconds).
//   Without a body, ?tag=sanity refreshes all of Sanity's content.
import { revalidateTag } from "next/cache";
import { SANITY_TAG, TOURNAMENTS_TAG, tournamentTag, VENUES_TAG } from "@/data/sanityTags";

const isTag = (tag: string) => tag === "elo-data" || tag === SANITY_TAG || /^(elo-data|sanity):[a-z0-9:-]+$/.test(tag);

interface SanityChange {
  _id?: unknown;
  _type?: unknown;
  cup2000Id?: unknown;
  clubChanged?: unknown;
}

/** The tags a Sanity document's change refreshes now (none: a draft, or a club change left for the nightly run); null when the body isn't one (the pipeline's calls have none) */
function sanityTags(body: SanityChange | null): string[] | null {
  if (!body || typeof body._type !== "string") return null;
  if (typeof body._id === "string" && body._id.startsWith("drafts.")) return [];
  switch (body._type) {
    case "tournament":
      return [typeof body.cup2000Id === "number" ? tournamentTag(body.cup2000Id) : TOURNAMENTS_TAG];
    case "venue":
      return [VENUES_TAG];
    case "club":
      // Only false when the projection says so: a whole document (no projection) waits for the night too
      return body.clubChanged === false ? [VENUES_TAG] : [];
    default:
      return [SANITY_TAG];
  }
}

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  const url = new URL(request.url);
  if (!secret || (auth !== `Bearer ${secret}` && url.searchParams.get("secret") !== secret)) {
    return Response.json({ revalidated: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as SanityChange | null;
  const fromSanity = sanityTags(body);
  if (fromSanity?.length === 0) {
    const skipped = typeof body?._id === "string" && body._id.startsWith("drafts.") ? "draft" : "club change: refreshed by the next full nightly run";
    return Response.json({ revalidated: false, skipped });
  }
  const tag = url.searchParams.get("tag") ?? "elo-data";
  if (!fromSanity && !isTag(tag)) return Response.json({ revalidated: false, error: `Unknown tag ${tag}` }, { status: 400 });
  const tags = fromSanity ?? [tag];
  for (const t of tags) revalidateTag(t, "max");
  return Response.json({ revalidated: true, tags, at: new Date().toISOString() });
}
