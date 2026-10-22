// A section that opens on a click (<details>): its summary with a chevron that turns down while it
// is open, instead of the browser's own triangle
import type { ReactNode } from "react";
import { ChevronRight } from "@/components/SVG";

export default function Disclosure({ summary, className = "", children }: { summary: ReactNode; className?: string; children: ReactNode }) {
  return (
    <details className={`group ${className}`}>
      <summary className="inline-flex items-center gap-1 cursor-pointer text-gray-700 hover:text-black list-none [&::-webkit-details-marker]:hidden">
        <ChevronRight className="transition-transform duration-200 group-open:rotate-90" />
        {summary}
      </summary>
      {children}
    </details>
  );
}
