"use client";

// In the Studio's preview (the Presentation tool, sanity.config.ts): when a draft changes, the page is fetched again
// (router.refresh: in draft mode it reads the drafts, data/sanity.ts getPage), so the preview follows the editing.
// @sanity/visual-editing is the Studio's link to the page in its frame; with no click-to-edit markers in the text,
// it adds nothing to the page itself. Only inside a frame (the Studio's): for visitors it does nothing.
import { enableVisualEditing } from "@sanity/visual-editing";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PreviewRefresh() {
  const router = useRouter();
  useEffect(() => {
    if (window.self === window.top) return;
    return enableVisualEditing({
      refresh: () => {
        router.refresh();
        // The Studio shows it's refreshing until this settles
        return new Promise((resolve) => setTimeout(resolve, 1000));
      },
    });
  }, [router]);
  return null;
}
