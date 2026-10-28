// What search engines, answer engines and link previews read about a page: its title, description,
// canonical address and Open Graph / X card. Pages build theirs with pageMetadata, as Next.js merges
// the metadata of a page and its layouts only shallowly (a page's openGraph replaces the layout's
// whole, its images too). The preview image: the page's own (`image`: a player's, club's or
// tournament's preview.png route), or the site's (app/opengraph-image.tsx).
import type { Metadata } from "next";
import type { I18n } from "@/messages/i18n";
import { SITE_URL } from "./hrefs";

/** A link preview's size (Open Graph / X card) */
export const PREVIEW_SIZE = { width: 1200, height: 630 };

/**
 * A page's metadata, in the page's language (`i18n`, from getI18n()). `title` goes through the
 * layout's template ("… · elodrop") unless `absolute`; `path` is the page's address without a
 * language ("/players/123"): the canonical address is the page's own language's, and both languages'
 * are listed (hreflang, Norwegian the default), so search engines show each reader theirs. `image`
 * is the preview's address (also without a language) and what it shows (the site's preview without one).
 */
export function pageMetadata(
  { t, href, openGraphLocale }: I18n,
  {
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
  },
): Metadata {
  const images = [{ ...image, url: href(image.url), ...PREVIEW_SIZE, type: "image/png" }];
  const fullTitle = absolute ? title : t("layout.titleTemplate").replace("%s", title);
  const english = path === "/" ? "/en" : `/en${path}`;
  return {
    title: absolute ? { absolute: title } : title,
    description,
    alternates: { canonical: href(path), languages: { nb: path, en: english, "x-default": path } },
    openGraph: { type: "website", siteName: t("layout.siteName"), locale: openGraphLocale, title: fullTitle, description, url: href(path), images },
    twitter: { card: "summary_large_image", title: fullTitle, description, images },
    ...(index ? {} : { robots: { index: false } }),
  };
}

/** An absolute address on the site, for structured data ("/en/players/123" → "https://elodrop.no/en/players/123"); give it the page's language's address (i18n.href) */
export const absoluteUrl = (path: string) => `${SITE_URL}${path === "/" ? "" : encodeURI(path)}`;
