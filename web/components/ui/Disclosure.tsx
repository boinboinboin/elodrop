// A section that opens on a click (<details>): its summary with a chevron that turns down while it
// is open, instead of the browser's own triangle
import type { ReactNode } from "react";
import { ChevronRight } from "@/components/SVG";

export default function Disclosure({ summary, className = "", children }: { summary: ReactNode; className?: string; children: ReactNode }) {
  return (
    <details className={`group ${className}`}>
      <summary className="inline-flex items-center gap-1 cursor-pointer text-gray-700 hover:text-black list-none [&::-webkit-details-marker]:hidden">
        <ChevronRight className="transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] group-open:rotate-90" />
        {/* The line on the summary's hover, the chevron's too (not a group: <details> is the group, open content and all) */}
        <span className="link [summary:hover>&]:bg-size-[100%_1px]">{summary}</span>
      </summary>
      {children}
    </details>
  );
}
