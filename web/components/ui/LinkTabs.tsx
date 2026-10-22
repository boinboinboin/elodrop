// A row of links between related pages (disciplines, views, weeks), as outlined buttons, the
// current one filled black (aria-current="page")
import Link from "next/link";
import type { ReactNode } from "react";
import { toggleClass } from "./styles";

export interface LinkTab {
  key: string;
  href: string;
  label: ReactNode;
}

export default function LinkTabs({
  tabs,
  current,
  label,
  size = "md",
  className = "flex flex-wrap gap-2",
  prefetch,
}: {
  tabs: LinkTab[];
  current: string | null;
  /** What the links choose, for screen readers ("Discipline") */
  label: string;
  size?: "md" | "sm";
  /** The row's classes (layout and spacing) */
  className?: string;
  prefetch?: boolean;
}) {
  return (
    <nav className={className} aria-label={label}>
      {tabs.map((tab) => (
        <Link key={tab.key} href={tab.href} prefetch={prefetch} className={toggleClass(tab.key === current, size)} aria-current={tab.key === current ? "page" : undefined}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
