// The front page cards' glimpses of the pages about the site (components/home/HomeCard.tsx): how it
// works as what one match is worth either way, and what's new as the newest versions.
import Link from "next/link";
import { ROW } from "@/components/ui/styles";
import { KindBadge, Markdown, releaseId } from "@/components/whats-new/Release";
import { t } from "@/messages/i18n";
import { getReleases, isFeature, splitLead } from "@/utils/changelog";
import { date, num, pct } from "@/utils/format";
import { KAPPA, expectedScore, ratingMultiplier } from "@/utils/rating";
import { Teaser } from "./HomeCard";

// The example: a favourite against an underdog in a SEN A singles match with a typical margin, as
// in the "Try it" box on /how-it-works
const FAVOURITE = 1700;
const UNDERDOG = 1450;

/** How it works: what the favourite and the underdog gain if each of them wins */
export function HowItWorksGlimpse() {
  const chance = expectedScore(FAVOURITE, UNDERDOG);
  const rows = [
    { key: "favourite", chance, gain: KAPPA * ratingMultiplier(FAVOURITE) * (1 - chance), rating: FAVOURITE },
    { key: "underdog", chance: 1 - chance, gain: KAPPA * ratingMultiplier(UNDERDOG) * chance, rating: UNDERDOG },
  ] as const;
  return (
    <>
      <Teaser>{t("home.howItWorks.teaser", { favourite: num(FAVOURITE), underdog: num(UNDERDOG) })}</Teaser>
      <ul>
        {rows.map((r) => (
          <li key={r.key} className={`${ROW} py-2 flex items-baseline justify-between gap-3`}>
            <span className="min-w-0">
              <span className="font-semibold">{t(`home.howItWorks.${r.key}`, { rating: num(r.rating) })}</span>
              <span className="block text-sm text-gray-600">{t("home.howItWorks.chance", { chance: pct(r.chance) })}</span>
            </span>
            <span className="text-xl font-semibold tabular-nums text-green-700">+{num(Math.round(r.gain))}</span>
          </li>
        ))}
      </ul>
      <p className="text-sm text-gray-600 mt-3">{t("home.howItWorks.point")}</p>
    </>
  );
}

/** What's new: the three newest versions, each with its first change */
export function WhatsNewGlimpse() {
  const releases = getReleases().slice(0, 3);
  return (
    <>
      <Teaser>{t("home.whatsNew.teaser")}</Teaser>
      <ul>
        {releases.map((r) => {
          const first = r.items[0] ? splitLead(r.items[0].text) : null;
          return (
            <li key={r.version} className={`${ROW} py-2`}>
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <Link href={`/whats-new#${releaseId(r)}`} className="font-mono hover:text-black">v{r.version}</Link>
                <KindBadge feature={isFeature(r)} />
                <time dateTime={r.date} className="ml-auto">{date(r.date)}</time>
              </span>
              {first && <span className="block mt-1 line-clamp-2"><Markdown text={first.lead ?? first.rest} /></span>}
            </li>
          );
        })}
      </ul>
    </>
  );
}
