// A link that leaves Elodrop (badmintonportalen, Cup2000, a club's website, GitHub, a map): the
// External icon after its text says so. It opens in the same tab, as the site's other links do.
// Internal links use ./Link instead.
import type { ReactNode } from "react";
import { External } from "@/components/SVG";
import { TEXT_LINK } from "./styles";

// `rel`: "noopener ugc" for an address a visitor gave (a story's source)
export default function ExternalLink({ href, className = TEXT_LINK, rel = "noopener", children }: { href: string; className?: string; rel?: string; children: ReactNode }) {
  return (
    <a href={href} className={className} rel={rel}>
      {children}
      <External className="ml-1 text-[0.8em]" />
    </a>
  );
}
