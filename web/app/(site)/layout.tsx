import Link from "next/link";
import { Suspense } from "react";
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
      <header className="bg-white border-b border-gray-200">
        <div className="base-container px-4 py-4 flex flex-wrap items-center gap-x-8 gap-y-3">
          <Link href="/" className="text-xl font-semibold tracking-tight">elodrop</Link>
          <nav aria-label="Main" className="flex flex-wrap gap-x-5 gap-y-1 text-gray-700">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="hover:text-black">{n.label}</Link>
            ))}
          </nav>
          <div className="flex-1 min-w-64">
            <SearchBar />
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
    </>
  );
}
