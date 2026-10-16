// The Sanity Studio for the site's content (the clubs), at /studio. Until a Sanity project is set
// up (NEXT_PUBLIC_SANITY_PROJECT_ID), a note on how to set it up.
import type { Metadata, Viewport } from "next";
import Studio from "./Studio";

export const metadata: Metadata = { title: "Studio", referrer: "same-origin", robots: "noindex" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function StudioPage() {
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    return (
      <main className="p-8 max-w-2xl">
        <h1 className="text-3xl mb-4">Studio not set up yet</h1>
        <p className="mb-2">Create a free project at sanity.io/manage, then set NEXT_PUBLIC_SANITY_PROJECT_ID (and NEXT_PUBLIC_SANITY_DATASET) in .env.local and on Vercel.</p>
        <p>Import the clubs with <code>pnpm --filter web import-clubs</code> (needs a SANITY_WRITE_TOKEN).</p>
      </main>
    );
  }
  return <Studio />;
}
