// A link that leaves elodrop (badmintonportalen, Cup2000, a club's website, GitHub, a map): the
// External icon after its text says so. It opens in the same tab, as the site's other links do.
// Internal links use ./Link instead.
import type { ReactNode } from "react";
import { External } from "@/components/SVG";
import { TEXT_LINK } from "./styles";

export default function ExternalLink({ href, className = TEXT_LINK, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <a href={href} className={className} rel="noopener">
      {children}
      <External className="ml-1 text-[0.8em]" />
    </a>
  );
}
