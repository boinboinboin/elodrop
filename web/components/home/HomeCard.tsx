// A card on the front page about one of the site's pages: its name (a link), what it's for, a live
// glimpse of it (loaded on its own, so the cards show as their data arrives) and a link to it. Each
// card's top edge has its own colour from the theme's chart palette.
import Link from "next/link";
import { type ReactNode, Suspense } from "react";
import { ArrowRight } from "@/components/SVG";
import { t } from "@/messages/i18n";

interface Props {
  href: string;
  title: string;
  description: string;
  /** The link at the bottom ("All rankings") */
  link: string;
  /** The top edge's colour, a CSS colour (utils/chart.ts PALETTE) */
  color: string;
  children: ReactNode;
}

export default function HomeCard({ href, title, description, link, color, children }: Props) {
  return (
    <article className="bg-white border-t-4 p-5 md:p-6 flex flex-col h-full" style={{ borderTopColor: color }}>
      <h3 className="text-2xl">
        <Link href={href} className="hover:text-blue-600">{title}</Link>
      </h3>
      <p className="text-gray-700 mt-1 mb-5">{description}</p>
      <div className="flex-1">
        <Suspense fallback={<p className="text-gray-600">{t("home.loading")}</p>}>{children}</Suspense>
      </div>
      <Link href={href} className="mt-6 self-start inline-flex items-center gap-2 font-semibold hover:text-blue-600">
        {link} <ArrowRight />
      </Link>
    </article>
  );
}

/** The small heading over a card's glimpse ("Number one in each discipline") */
export const Teaser = ({ children }: { children: ReactNode }) => <p className="text-sm text-gray-600 mb-2">{children}</p>;
