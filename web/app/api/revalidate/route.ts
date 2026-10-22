// Called by the pipeline after it uploads new data (POST with "Authorization: Bearer <secret>"),
// and by the Sanity webhook after content changes (?tag=sanity): marks the cached data stale, so
// pages refresh as they are visited. ?tag=elo-data:<area> (e.g. elo-data:tournaments) refreshes only
// the pages using that area's data (data/load.ts).
import { revalidateTag } from "next/cache";

const TAGS = new Set(["elo-data", "sanity"]);
const isTag = (tag: string) => TAGS.has(tag) || /^elo-data:[a-z0-9-]+$/.test(tag);

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  const url = new URL(request.url);
  if (!secret || (auth !== `Bearer ${secret}` && url.searchParams.get("secret") !== secret)) {
    return Response.json({ revalidated: false, error: "Unauthorized" }, { status: 401 });
  }
  const tag = url.searchParams.get("tag") ?? "elo-data";
  if (!isTag(tag)) return Response.json({ revalidated: false, error: `Unknown tag ${tag}` }, { status: 400 });
  revalidateTag(tag, "max");
  return Response.json({ revalidated: true, tag, at: new Date().toISOString() });
}
