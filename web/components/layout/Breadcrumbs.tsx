// Where a page sits on the site, above its title: Home / Clubs / Bergen. Every step but the last
// (the page itself) links to its page; the trail wraps on narrow screens. Search engines get it as
// structured data too (BreadcrumbList), for the trail under a search result.
import JsonLd from "@/components/seo/JsonLd";
import Link from "@/components/ui/Link";
import { getI18n } from "@/messages/server";
import { absoluteUrl } from "@/utils/metadata";

export interface Crumb {
  label: string;
  href?: string;
}

/** The trail after Home, ending with the current page (without a link) */
export default async function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  const { t, href } = await getI18n();
  const crumbs: Crumb[] = [{ label: t("layout.breadcrumbs.home"), href: "/" }, ...trail];
  return (
    <nav aria-label={t("layout.breadcrumbs.label")}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-gray-600">
        {crumbs.map((c, i) => (
          // The separator after each step (not before the next), so a wrapped line starts with a name
          <li key={i} className="flex items-center gap-x-2 min-w-0">
            {i === crumbs.length - 1 ? (
              <span aria-current="page" className="text-gray-900">{c.label}</span>
            ) : (
              <>
                <Link href={c.href ?? "/"} className="hover:text-black">{c.label}</Link>
                <span aria-hidden="true" className="text-gray-400">/</span>
              </>
            )}
          </li>
        ))}
      </ol>
      <JsonLd
        data={{
          "@type": "BreadcrumbList",
          itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, ...(c.href ? { item: absoluteUrl(href(c.href)) } : {}) })),
        }}
      />
    </nav>
  );
}
