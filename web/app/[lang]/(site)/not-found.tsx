// Not found, called like a line judge: "Out!", with a shuttle that has landed outside the court's
// corner (it drops in; not with reduced motion). In a real court's colours: Yonex's green mat, or in
// that theme the All England's grey mat on the arena's dark floor (--color-court and
// --color-court-floor in globals.css), with white lines.
import { ArrowRight } from "@/components/SVG";
import Shuttle from "@/components/easter-eggs/Shuttle";
import Link from "@/components/ui/Link";
import Section from "@/components/ui/Section";
import { TEXT_LINK } from "@/components/ui/styles";
import { getI18n } from "@/messages/server";
import { ACCENT } from "@/utils/logo";

// The court's lines, white on every mat
const LINES = "#fff";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <Section>
      {/* The court's back corner from above, to scale (1 m = 26.09 units; BWF: 6.10 m wide): the
          doubles side line, the singles side line 0.46 m in, the centre line halfway across (3.05 m
          in), the back line and the doubles long service line 0.76 m in. The lines are drawn wider
          than their 40 mm and the shuttle larger than life, to be seen. The shuttle comes in from
          the other half, straight as seen from above, and lands out behind the back line. */}
      <svg viewBox="0 0 160 110" className="w-48 mb-6" aria-hidden="true">
        {/* The floor, showing at the mat's edge (right and bottom) where it isn't the mat's colour */}
        <rect width="160" height="110" rx="3" className="fill-court-floor" />
        <rect width="148" height="100" rx="3" className="fill-court" />
        <path d="M100 0V70M88 0V70M20.43 0V70M0 70H100M0 50.17H100" fill="none" stroke={LINES} strokeWidth={2.5} />
        <path d="M53.8 0L75.6 71.6" fill="none" stroke={LINES} strokeOpacity={0.6} strokeWidth={1.2} strokeDasharray="3 4" />
        {/* Cork first along its flight, the cork's tip where it lands */}
        <g transform="translate(80 86) rotate(-17) translate(-10 -16.67)">
          <g className="animate-egg-land motion-reduce:animate-none [transform-box:fill-box] origin-center">
            <Shuttle width={20} height={20} color={LINES} cork={ACCENT} />
          </g>
        </g>
      </svg>
      <h1 className="h1">{t("layout.notFound.title")}</h1>
      <p className="text-2xl mt-2 max-w-3xl">{t("layout.notFound.call")}</p>
      <p className="text-gray-700 mt-4 max-w-3xl">{t("layout.notFound.text")}</p>
      <p className="mt-4">
        <Link href="/rankings" className={TEXT_LINK}>{t("layout.notFound.back")} <ArrowRight /></Link>
      </p>
    </Section>
  );
}
