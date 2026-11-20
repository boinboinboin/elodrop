// The site's numbers (data/siteNumbers.ts) in StatCard tiles: under the front page's lead, and as a written page's
// numbers block (./PortableBody.tsx), which counts them up and fades them in (`value`, `wrap`: the motion library's
// parts, which only the written pages load). A number the data doesn't have yet is left out.
import type { ReactNode } from "react";
import StatCard from "@/components/ui/StatCard";
import type { SiteNumber, SiteNumbers } from "@/data/siteNumbers";
import type { I18n } from "@/messages/i18n";

interface Props {
  items: readonly string[];
  numbers: SiteNumbers;
  i18n: I18n;
  /** The number as shown (default: formatted) */
  value?: (n: number) => ReactNode;
  /** Around each tile, by its place (default: as it is) */
  wrap?: (tile: ReactNode, key: SiteNumber, i: number) => ReactNode;
  /** All in one row from lg up (a full-width row: the front page), else four in two rows of two */
  wide?: boolean;
  className?: string;
}

export default function SiteStats({ items, numbers, i18n, value = i18n.num, wrap = (tile) => tile, wide = false, className = "" }: Props) {
  const shown = items.filter((key): key is SiteNumber => typeof numbers[key as SiteNumber] === "number");
  if (!shown.length) return null;
  // In one row from sm up, but four in two rows of two, phones too (none left alone on a row, and not a tall column
  // on a phone), or in one row where it's wide
  const columns = shown.length === 4 ? `grid-cols-2 ${wide ? "lg:grid-cols-4" : ""}` : shown.length === 3 ? "grid-cols-1 sm:grid-cols-3" : shown.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1";
  return (
    <dl className={`grid ${columns} gap-3 sm:gap-4 ${className}`}>
      {shown.map((key, i) => wrap(<StatCard key={key} label={i18n.t(`pages.stats.${key}`)}>{value(numbers[key]!)}</StatCard>, key, i))}
    </dl>
  );
}
