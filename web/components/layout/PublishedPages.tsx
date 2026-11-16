"use client";

// The links to the pages written in the Studio (About, Help & support) only once they're published: which ones are is
// loaded in the browser (app/api/pages), once per visit, so the site's pages don't depend on it (every page would be
// built again when one is published). Hidden until it's known: a link never shows to a page that isn't there yet.
import { type ReactNode, useEffect, useState } from "react";
import type { WrittenPageKey } from "@/data/sanityTags";

export type { WrittenPageKey };
type Published = Partial<Record<WrittenPageKey, boolean>>;

let request: Promise<Published> | null = null;
/** One request per visit, shared by the menu and the footer */
const loadPublished = () =>
  (request ??= fetch("/api/pages")
    .then((res) => (res.ok ? (res.json() as Promise<Published>) : {}))
    .catch(() => {
      request = null;
      return {};
    }));

/** Which written pages are published (none until loaded) */
export function usePublishedPages(): Published {
  const [published, setPublished] = useState<Published>({});
  useEffect(() => {
    let live = true;
    loadPublished().then((value) => live && setPublished(value));
    return () => {
      live = false;
    };
  }, []);
  return published;
}

/** Its children (a link to a written page) only once that page is published */
export function PublishedOnly({ page, children }: { page: WrittenPageKey; children: ReactNode }) {
  return usePublishedPages()[page] ? children : null;
}
