// Which pages written in the Studio are published (About, Help & support: data/sanity.ts getPublishedPages), for the
// links to them in the menu and the footer (components/layout/PublishedPages.tsx), which load it in the browser: in the
// pages themselves it would tie every page to Sanity's pages, and every page would be built again when one is
// published. Built from cached data, so the response is prerendered and refreshed when a page is published (the Sanity
// webhook, app/api/revalidate). → { about: boolean, support: boolean }
import { getPublishedPages } from "@/data/sanity";

export async function GET() {
  return Response.json(await getPublishedPages());
}
