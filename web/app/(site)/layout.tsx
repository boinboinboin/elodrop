import { Analytics } from "@vercel/analytics/next";
import Link from "next/link";
import { Suspense } from "react";
import Logo from "@/components/Logo";
import MenuButton from "@/components/MenuButton";
import NavigationProgress from "@/components/NavigationProgress";
import SearchBar from "@/components/SearchBar";
import UpdatedAt from "@/components/UpdatedAt";

const NAV = [
  { href: "/", label: "Rankings" },
  { href: "/clubs", label: "Clubs" },
  { href: "/eliteserien", label: "Eliteserien" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/upsets", label: "Upsets" },
  { href: "/head-to-head", label: "Head to head" },
];

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* A bar along the top while a page loads (it reads the URL, so it waits for the client) */}
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      {/* Phones: the logo and the menu button, the search on its own line; tablets and small laptops:
          the search between; from xl the links too (the menu then holds just the colour theme). */}
      <header className="relative bg-white border-b border-gray-200">
        <div className="base-container px-4 py-3 md:py-4 flex flex-wrap md:flex-nowrap items-center gap-x-6 gap-y-3">
          <Logo />
          <nav aria-label="Main" className="hidden xl:flex gap-x-5 text-gray-700 whitespace-nowrap">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="hover:text-black">{n.label}</Link>
            ))}
          </nav>
          <div className="order-last w-full md:order-none md:w-auto md:flex-1 md:min-w-0">
            <SearchBar />
          </div>
          <div className="ml-auto md:ml-0 flex">
            <MenuButton links={NAV} />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-gray-200 bg-white">
        <div className="base-container px-4 py-6 text-sm text-gray-600 flex flex-wrap justify-between gap-4">
          <p>
            Results from <a href="https://badmintonportalen.no" className="underline hover:text-black" rel="noopener">badmintonportalen.no</a> and{" "}
            <a href="https://www.cup2000.dk" className="underline hover:text-black" rel="noopener">Cup2000</a>.
          </p>
          <Suspense fallback={null}>
            <UpdatedAt />
          </Suspense>
        </div>
      </footer>
      {/* Vercel Web Analytics: page views, on the site's pages only (not the Studio) */}
      <Analytics />
    </>
  );
}
