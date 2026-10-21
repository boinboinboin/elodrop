// The header's logo: the mark (lib/logo.ts) without its square, black on the page with the cork in
// the theme's accent colour, leading into the name. On a page load the line draws itself from the
// left and the cork drops in at the dip (animations in globals.css; none with reduced motion). The
// header stays mounted while navigating within the site, so it plays once per visit, not on every
// page.
import Link from "next/link";
import { MARK } from "@/lib/logo";

export default function Logo() {
  return (
    <Link href="/" className="flex items-center gap-1 text-xl font-semibold tracking-tight" aria-label="elodrop, home">
      {/* The mark from x 0 (not overshooting the edge as in the icon) and the part of the height it uses */}
      <svg viewBox="0 6.5 28.5 20" className="h-7 w-auto overflow-visible" aria-hidden="true">
        <path className="animate-logo-line motion-reduce:animate-none [stroke-dasharray:1]" pathLength={1} d={MARK.line.replace(/^M-1 /, "M0 ").replace(/H33$/, "H28.5")} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinejoin="round" />
        <path className="animate-logo-cork motion-reduce:animate-none fill-accent" d={MARK.cork} />
      </svg>
      <span>elodrop</span>
    </Link>
  );
}
