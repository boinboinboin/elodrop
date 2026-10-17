// Switch between the two head-to-head pages: two players, or two doubles pairs.
import Link from "next/link";

const PAGES = [
  { href: "/head-to-head", label: "Players", key: "players" },
  { href: "/head-to-head/doubles", label: "Pairs", key: "pairs" },
] as const;

export default function HeadToHeadSwitch({ current }: { current: (typeof PAGES)[number]["key"] }) {
  return (
    <nav aria-label="Compare" className="flex gap-2 mt-6">
      {PAGES.map((page) => (
        <Link
          key={page.key}
          href={page.href}
          aria-current={page.key === current ? "page" : undefined}
          className="px-4 py-2 border border-black transition-colors duration-200 hover:bg-black hover:text-white aria-[current=page]:bg-black aria-[current=page]:text-white"
        >
          {page.label}
        </Link>
      ))}
    </nav>
  );
}
