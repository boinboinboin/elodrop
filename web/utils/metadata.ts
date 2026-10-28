// What search engines, answer engines and link previews read about a page: its title, description,
// canonical address and Open Graph / X card. Pages build theirs with pageMetadata, as Next.js merges
// the metadata of a page and its layouts only shallowly (a page's openGraph replaces the layout's
// whole, its images too). The preview image: the page's own (`image`: a player's, club's or
// tournament's preview.png route), or the site's (app/opengraph-image.tsx).
import type { Metadata } from "next";
import { SITE_URL } from "./hrefs";
import { t } from "@/messages/i18n";

/** A link preview's size (Open Graph / X card) */
export const PREVIEW_SIZE = { width: 1200, height: 630 };

/**
 * A page's metadata. `title` goes through the layout's template ("… · elodrop") unless `absolute`;
 * `path` is the canonical address ("/players/123"), so search engines index one address per page;
 * `image` the preview's address and what it shows (the site's preview without one).
 */
export function pageMetadata({
  title,
  description,
  path,
  image = { url: "/opengraph-image", alt: t("seo.imageAlt.site") },
  absolute = false,
  index = true,
}: {
  title: string;
  description: string;
  path: string;
  image?: { url: string; alt: string };
  absolute?: boolean;
  index?: boolean;
}): Metadata {
  const images = [{ ...image, ...PREVIEW_SIZE, type: "image/png" }];
  const fullTitle = absolute ? title : t("layout.titleTemplate").replace("%s", title);
  return {
    title: absolute ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: t("layout.siteName"), locale: "en_GB", title: fullTitle, description, url: path, images },
    twitter: { card: "summary_large_image", title: fullTitle, description, images },
    ...(index ? {} : { robots: { index: false } }),
  };
}

/** An absolute address on the site, for structured data ("/players/123" → "https://elodrop.no/players/123") */
export const absoluteUrl = (path: string) => `${SITE_URL}${path === "/" ? "" : encodeURI(path)}`;
