// Expires cached data, so the pages using it are built again as they are visited (each one an ISR write).
// Expired, not just stale ({ expire: 0 }, not "max"): the first visit after an update waits for the fresh
// page instead of getting the old one while it is rebuilt in the background. A refresh costs nothing until
// the pages it reaches are visited, but crawlers visit nearly all of them, so each refresh is kept to the
// pages whose data changed.
// POST with "Authorization: Bearer <secret>" (or ?secret=).
//
// - The pipeline, after it uploads new data: a JSON body { "files": ["players/123.json", …] } (at most
//   1,000), the files it uploaded or deleted, so only the pages reading one of them are built again (the
//   tag per file in data/load.ts). Old team matches, finished tournaments and players whose data didn't
//   change stay cached. ?tag=elo-data refreshes everything (a fallback, or by hand).
// - The pipeline, for what changed in the Studio since the night before (pipeline/sanity-revisions.mjs):
//   ?tag=sanity:clubs, sanity:badges, sanity:venues or sanity:tournaments:<Cup2000 id>.
// - The pipeline, after a run whose refresh failed: ?tag=elo-data (everything).
// - The Sanity webhook, after a document is published, changed or deleted: its body says which
//   document, so only the pages using it refresh (the tags in data/sanityTags.ts, used by data/sanity.ts):
//     a tournament → its own pages (the nightly check refreshes them again only if this call didn't arrive)
//     a badge, a club or a hall → nothing now: the badges are on every player page (about 23,600 with both
//       languages), the clubs on nearly every page and the halls on every team match page (about 12,000), so
//       they wait for the night, when the pipeline refreshes each kind once if any of it changed
//   To show one at once (seldom needed), call this by hand with its tag (sanity:badges, sanity:clubs, sanity:venues):
//     curl -X POST -H "Authorization: Bearer $REVALIDATE_SECRET" "https://www.elodrop.no/api/revalidate?tag=sanity:badges"
//   So the webhook needs only tournaments (filter _type == "tournament"), with the projection { _id, _type, cup2000Id }.
//   Drafts are skipped (the webhook should leave them out anyway: the Studio saves one every few seconds).
//   Without a body, ?tag=sanity refreshes all of Sanity's content.
import { revalidateTag } from "next/cache";
import { DATA_TAG, fileTag, isDataPath } from "@/data/dataTags";
import { SANITY_TAG, TOURNAMENTS_TAG, tournamentTag } from "@/data/sanityTags";

const isTag = (tag: string) => tag === DATA_TAG || tag === SANITY_TAG || /^(elo-data|sanity):[a-z0-9:-]+$/.test(tag);
/** The most files one call refreshes (the pipeline sends more in several calls) */
const MAX_FILES = 1000;

interface Body {
  // A Sanity document's change
  _id?: unknown;
  _type?: unknown;
  cup2000Id?: unknown;
  // The pipeline's uploaded files
  files?: unknown;
}

/** The tags a Sanity document's change refreshes now (none: a draft, or a club, badge or hall change left for the night); null when the body isn't one */
function sanityTags(body: Body | null): string[] | null {
  if (!body || typeof body._type !== "string") return null;
  if (typeof body._id === "string" && body._id.startsWith("drafts.")) return [];
  switch (body._type) {
    case "tournament":
      return [typeof body.cup2000Id === "number" ? tournamentTag(body.cup2000Id) : TOURNAMENTS_TAG];
    case "venue":
    case "badge":
    case "club":
      return [];
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
  const body = (await request.json().catch(() => null)) as Body | null;

  // The pipeline's files: each one's own tag
  if (body && Array.isArray(body.files)) {
    const files = body.files;
    if (files.length > MAX_FILES) return Response.json({ revalidated: false, error: `At most ${MAX_FILES} files per call` }, { status: 400 });
    const bad = files.find((f) => !isDataPath(f));
    if (bad !== undefined) return Response.json({ revalidated: false, error: `Not a data file: ${String(bad).slice(0, 100)}` }, { status: 400 });
    for (const file of files as string[]) revalidateTag(fileTag(file), { expire: 0 });
    return Response.json({ revalidated: true, files: files.length, at: new Date().toISOString() });
  }

  const fromSanity = sanityTags(body);
  if (fromSanity?.length === 0) {
    const skipped = typeof body?._id === "string" && body._id.startsWith("drafts.") ? "draft" : `${body?._type} change: refreshed by the nightly run if it changed`;
    return Response.json({ revalidated: false, skipped });
  }
  const tag = url.searchParams.get("tag") ?? DATA_TAG;
  if (!fromSanity && !isTag(tag)) return Response.json({ revalidated: false, error: `Unknown tag ${tag}` }, { status: 400 });
  const tags = fromSanity ?? [tag];
  for (const t of tags) revalidateTag(t, { expire: 0 });
  return Response.json({ revalidated: true, tags, at: new Date().toISOString() });
}
