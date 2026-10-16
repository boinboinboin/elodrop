// Called by the pipeline after it uploads new data (POST with "Authorization: Bearer <secret>"),
// and by the Sanity webhook after content changes (?tag=sanity): marks the cached data stale, so
// pages refresh as they are visited.
import { revalidateTag } from "next/cache";

const TAGS = new Set(["elo-data", "sanity"]);

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  const url = new URL(request.url);
  if (!secret || (auth !== `Bearer ${secret}` && url.searchParams.get("secret") !== secret)) {
    return Response.json({ revalidated: false, error: "Unauthorized" }, { status: 401 });
  }
  const tag = url.searchParams.get("tag") ?? "elo-data";
  if (!TAGS.has(tag)) return Response.json({ revalidated: false, error: `Unknown tag ${tag}` }, { status: 400 });
  revalidateTag(tag, "max");
  return Response.json({ revalidated: true, tag, at: new Date().toISOString() });
}
