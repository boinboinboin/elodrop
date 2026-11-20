import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Suspense } from "react";
import { AccountProvider } from "@/components/account/AccountProvider";
import KeyEggs from "@/components/easter-eggs/KeyEggs";
import InstallApp from "@/components/layout/InstallApp";
import Logo from "@/components/layout/Logo";
import MenuButton from "@/components/layout/MenuButton";
import NavGroup, { type NavEntry } from "@/components/layout/NavGroup";
import NavigationProgress from "@/components/layout/NavigationProgress";
import { PublishedOnly, type WrittenPageKey } from "@/components/layout/PublishedPages";
import SearchBar from "@/components/layout/SearchBar";
import SiteHeader from "@/components/layout/SiteHeader";
import { CaretDown } from "@/components/SVG";
import UpdatedAt from "@/components/layout/UpdatedAt";
import Badge from "@/components/ui/Badge";
import ExternalLink from "@/components/ui/ExternalLink";
import Link from "@/components/ui/Link";
import { getI18n } from "@/messages/server";
import { ACCOUNTS } from "@/utils/account";
import { copyrightYears, getReleases } from "@/utils/changelog";

const FOOTER_LINK = "link-underlined hover:text-black";
const VERSION = getReleases()[0]?.version;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { t, rich } = await getI18n();
  // The site's pages: in groups (a dropdown each in the header, headings in the menu) and on their own
  const NAV: NavEntry[] = [
    {
      label: t("layout.nav.players"),
      links: [
        { href: "/rankings", label: t("layout.nav.rankings") },
        { href: "/head-to-head", label: t("layout.nav.headToHead") },
        { href: "/upsets", label: t("layout.nav.upsets") },
      ],
    },
    {
      label: t("layout.nav.teams"),
      links: [
        { href: "/clubs", label: t("layout.nav.clubs") },
        { href: "/eliteserien", label: t("layout.nav.eliteserien") },
        { href: "/team-matches", label: t("layout.nav.teamMatches") },
      ],
    },
    { href: "/tournaments", label: t("layout.nav.tournaments") },
    // The fantasy game, where the site has accounts (utils/account.ts)
    ...(ACCOUNTS ? [{ href: "/elostonk", label: t("layout.nav.elostonk"), badge: t("layout.nav.beta") }] : []),
  ];
  // About the site, in the menu at every width (and the footer), the current version beside What's new. The pages
  // written in the Studio (`page`) are linked only once published (components/layout/PublishedPages.tsx)
  const ABOUT: { href: string; label: string; detail?: string; page?: WrittenPageKey }[] = [
    { href: "/about", label: t("layout.nav.aboutPage"), page: "about" },
    { href: "/how-it-works", label: t("layout.nav.howItWorks") },
    { href: "/achievements", label: t("layout.nav.achievements") },
    { href: "/whats-new", label: t("layout.nav.whatsNew"), detail: VERSION && t("layout.footer.version", { version: VERSION }) },
    { href: "/support", label: t("layout.nav.support"), page: "support" },
    { href: "/privacy", label: t("layout.nav.privacy"), page: "privacy" },
    // Where the site has accounts (utils/account.ts)
    ...(ACCOUNTS ? [{ href: "/ideas", label: t("layout.nav.ideas") }] : []),
  ];
  return (
    // The signed-in user, for the client parts that show it (components/account): read in the browser, so every page
    // stays the same for everyone
    <AccountProvider>
      {/* A bar along the top while a page loads (it reads the URL, so it waits for the client) */}
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      {/* Sticky (components/layout/SiteHeader.tsx). Phones: the logo, then the search and menu buttons, the search
          opening on its own line; tablets and small laptops: the search between; from xl the links too (the menu then
          holds the pages about the site and the colour theme). */}
      <SiteHeader
        logo={<Logo />}
        nav={
          <nav aria-label={t("layout.nav.label")} className="hidden xl:flex items-center gap-x-6 text-gray-700 whitespace-nowrap">
            {NAV.map((n) =>
              "links" in n ? (
                // It reads the URL (its current page), so its name alone stands in until that's known
                <Suspense
                  key={n.label}
                  fallback={
                    <span className="inline-flex items-center gap-1.5">
                      {n.label} <CaretDown className="w-3 h-3" />
                    </span>
                  }
                >
                  <NavGroup label={n.label} links={n.links} />
                </Suspense>
              ) : (
                // The line under the name only, not its tag ("Beta")
                <Link key={n.href} href={n.href} className="link-host hover:text-black">
                  <span className="link-group">{n.label}</span>
                  {n.badge && <Badge className="ml-1.5 align-middle">{n.badge}</Badge>}
                </Link>
              ),
            )}
          </nav>
        }
        search={<SearchBar />}
        menu={
          // It reads the URL (the current page in the menu): on a page whose address is only known when it's asked
          // for (a division not prerendered), the button's outline stands in until then
          <Suspense fallback={<span aria-hidden="true" className="w-[42px] h-[42px] border border-black" />}>
            <MenuButton links={NAV} about={ABOUT} />
          </Suspense>
        }
      />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-gray-200 bg-white">
        <div className="base-container px-4 py-6 text-sm text-gray-600 flex flex-wrap justify-between gap-4">
          <nav aria-label={t("layout.nav.about")} className="w-full flex flex-wrap items-center gap-x-5 gap-y-2 text-base text-gray-700">
            {ABOUT.map((l) => {
              const link = (
                <Link key={l.href} href={l.href} className="link hover:text-black">
                  {l.label}
                  {l.detail && <span className="ml-2 font-mono text-xs text-gray-500">{l.detail}</span>}
                </Link>
              );
              return l.page ? <PublishedOnly key={l.href} page={l.page}>{link}</PublishedOnly> : link;
            })}
          </nav>
          <p>
            {rich("layout.footer.sources", {
              portalen: <ExternalLink href="https://badmintonportalen.no" className={FOOTER_LINK}>badmintonportalen.no</ExternalLink>,
              cup2000: <ExternalLink href="https://www.cup2000.dk" className={FOOTER_LINK}>Cup2000</ExternalLink>,
            })}
          </p>
          <UpdatedAt />
          {/* Only where the site can be installed as an app and isn't open as one (filled in by the browser) */}
          <InstallApp className="w-full" />
          {/* The copyright, and what on the site is someone else's or not the site's own yet */}
          <p className="w-full">
            {t("layout.footer.rights", { years: copyrightYears(), site: t("layout.siteName") })} {t("layout.footer.others")}
          </p>
        </div>
      </footer>
      {/* Vercel Web Analytics (page views) and Speed Insights (real visitors' load times, Core Web
          Vitals), on the site's pages only (not the Studio) */}
      {/* What typing on a page can set off (in the browser only) */}
      <KeyEggs />
      <Analytics />
      <SpeedInsights />
    </AccountProvider>
  );
}
