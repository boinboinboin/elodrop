// Moving between weeks and years (the upsets and team matches pages): Earlier/Later links beside a
// week's heading, and a row of year links with the current one filled. Both open the other week or
// year where the visitor is, not at the page's top (as LinkTabs).
import { ArrowLeft, ArrowRight } from "@/components/SVG";
import Link from "@/components/ui/Link";
import { toggleClass } from "@/components/ui/styles";
import { getI18n } from "@/messages/server";

/** Links to the earlier and later week (each left out when there's none) */
export async function WeekArrows({ earlier, later }: { earlier: string | null; later: string | null }) {
  const { t } = await getI18n();
  return (
    <nav className="flex gap-2" aria-label={t("common.periods.weeks")}>
      {earlier && <Link href={earlier} scroll={false} className={toggleClass(false)}><ArrowLeft /> {t("common.periods.earlier")}</Link>}
      {later && <Link href={later} scroll={false} className={toggleClass(false)}>{t("common.periods.later")} <ArrowRight /></Link>}
    </nav>
  );
}

/** A link per year, the current one filled */
export async function YearLinks({ years, current, href, className = "mb-6" }: { years: string[]; current: string; href: (year: string) => string; className?: string }) {
  const { t } = await getI18n();
  return (
    <nav className={`flex flex-wrap gap-2 ${className}`} aria-label={t("common.periods.year")}>
      {years.map((y) => (
        <Link
          key={y}
          href={href(y)}
          scroll={false}
          className={`px-3 py-1 border border-black transition-colors duration-200 ${y === current ? "bg-black text-white" : "hover:bg-black hover:text-white"}`}
          aria-current={y === current ? "page" : undefined}
        >
          {y}
        </Link>
      ))}
    </nav>
  );
}
