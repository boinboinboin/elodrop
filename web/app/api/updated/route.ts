// When the data was last updated, for the footer of every page (components/layout/UpdatedAt.tsx), which loads it in
// the browser: in the pages themselves it would tie every page to meta.json, which changes with every run, and every
// page would be built again after each run. Built from cached data, so the response is prerendered and refreshed
// with meta.json's tag (data/load.ts). → { updated: ISO time | null }
import { getMeta } from "@/data/meta";

export async function GET() {
  const meta = await getMeta();
  return Response.json({ updated: meta ? (meta.updatedAt ?? meta.generatedAt) : null });
}
