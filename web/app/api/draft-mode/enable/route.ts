// Turns on draft mode for the Studio's preview (the Presentation tool, sanity.config.ts): the written pages (About,
// Help & support; data/sanity.ts getPage) then show their unpublished drafts, for this browser only. The Studio opens
// this with a secret it has just saved in the dataset; @sanity/preview-url-secret checks it with a read token
// (SANITY_READ_TOKEN, a Viewer token from sanity.io/manage), so nobody else can turn it on. Then on to the page.
// Every other page and visitor is untouched: draft mode only skips the cache for this browser, and only getPage reads
// drafts.
import { createClient } from "@sanity/client";
import { validatePreviewUrl } from "@sanity/preview-url-secret";
import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

export async function GET(request: Request) {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const token = process.env.SANITY_READ_TOKEN;
  if (!projectId || !token) return new Response("Preview isn't set up: set SANITY_READ_TOKEN (a Viewer token)", { status: 500 });
  const client = createClient({ projectId, dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production", apiVersion: "2025-02-19", useCdn: false, token });
  const { isValid, redirectTo = "/" } = await validatePreviewUrl(client, request.url);
  if (!isValid) return new Response("Invalid preview link", { status: 401 });
  (await draftMode()).enable();
  redirect(redirectTo);
}
