import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Suspense } from "react";
import Logo from "@/components/layout/Logo";
import MenuButton from "@/components/layout/MenuButton";
import NavigationProgress from "@/components/layout/NavigationProgress";
import SearchBar from "@/components/layout/SearchBar";
import UpdatedAt from "@/components/layout/UpdatedAt";
import Link from "@/components/ui/Link";
import { getI18n } from "@/messages/server";
import { getReleases } from "@/utils/changelog";

const FOOTER_LINK = "underline hover:text-black";
const VERSION = getReleases()[0]?.version;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { t, rich } = await getI18n();
  const NAV = [
    { href: "/rankings", label: t("layout.nav.rankings") },
    { href: "/clubs", label: t("layout.nav.clubs") },
    { href: "/eliteserien", label: t("layout.nav.eliteserien") },
    { href: "/tournaments", label: t("layout.nav.tournaments") },
    { href: "/upsets", label: t("layout.nav.upsets") },
    { href: "/head-to-head", label: t("layout.nav.headToHead") },
  ];
  // About the site, in the menu at every width (and the footer), the current version beside What's new
  const ABOUT = [
    { href: "/how-it-works", label: t("layout.nav.howItWorks") },
    { href: "/whats-new", label: t("layout.nav.whatsNew"), detail: VERSION && t("layout.footer.version", { version: VERSION }) },
  ];
  return (
    <>
      {/* A bar along the top while a page loads (it reads the URL, so it waits for the client) */}
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      {/* Phones: the logo and the menu button, the search on its own line; tablets and small laptops:
          the search between; from xl the links too (the menu then holds the pages about the site and the colour theme). */}
      <header className="relative bg-white border-b border-gray-200">
        <div className="base-container px-4 py-3 md:py-4 flex flex-wrap md:flex-nowrap items-center gap-x-6 gap-y-3">
          <Logo />
          <nav aria-label={t("layout.nav.label")} className="hidden xl:flex gap-x-5 text-gray-700 whitespace-nowrap">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="hover:text-black">{n.label}</Link>
            ))}
          </nav>
          <div className="order-last w-full md:order-none md:w-auto md:flex-1 md:min-w-0">
            <SearchBar />
          </div>
          <div className="ml-auto md:ml-0 flex">
            <MenuButton links={NAV} about={ABOUT} />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-gray-200 bg-white">
        <div className="base-container px-4 py-6 text-sm text-gray-600 flex flex-wrap justify-between gap-4">
          <nav aria-label={t("layout.nav.about")} className="w-full flex flex-wrap items-center gap-x-5 gap-y-2 text-base text-gray-700">
            {ABOUT.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-black">
                {l.label}
                {l.detail && <span className="ml-2 font-mono text-xs text-gray-500">{l.detail}</span>}
              </Link>
            ))}
          </nav>
          <p>
            {rich("layout.footer.sources", {
              portalen: <a href="https://badmintonportalen.no" className={FOOTER_LINK} rel="noopener">badmintonportalen.no</a>,
              cup2000: <a href="https://www.cup2000.dk" className={FOOTER_LINK} rel="noopener">Cup2000</a>,
            })}
          </p>
          <Suspense fallback={null}>
            <UpdatedAt />
          </Suspense>
        </div>
      </footer>
      {/* Vercel Web Analytics (page views) and Speed Insights (real visitors' load times, Core Web
          Vitals), on the site's pages only (not the Studio) */}
      <Analytics />
      <SpeedInsights />
    </>
  );
}
