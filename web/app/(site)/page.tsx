// The front page: what elodrop is, and a card for each of the site's pages with a live glimpse of it
// (components/home). The rankings, the front page until this one, are at /rankings.
// Fully static: rendered once per data update.
import Link from "next/link";
import { Suspense } from "react";
import { ClubsGlimpse, EliteserienGlimpse, HeadToHeadGlimpse, RankingsGlimpse, TournamentsGlimpse, UpsetsGlimpse } from "@/components/home/Glimpses";
import HomeCard from "@/components/home/HomeCard";
import { ArrowRight } from "@/components/SVG";
import Section from "@/components/ui/Section";
import { BUTTON } from "@/components/ui/styles";
import { getMeta } from "@/data/meta";
import { t } from "@/messages/i18n";
import { PALETTE } from "@/utils/chart";
import { num } from "@/utils/format";

const CARDS = [
  { key: "rankings", href: "/rankings", Glimpse: RankingsGlimpse },
  { key: "clubs", href: "/clubs", Glimpse: ClubsGlimpse },
  { key: "eliteserien", href: "/eliteserien", Glimpse: EliteserienGlimpse },
  { key: "upsets", href: "/upsets", Glimpse: UpsetsGlimpse },
  { key: "tournaments", href: "/tournaments", Glimpse: TournamentsGlimpse },
  { key: "headToHead", href: "/head-to-head", Glimpse: HeadToHeadGlimpse },
] as const;

export default function Home() {
  return (
    <>
      <Section>
        <h1 className="h1">{t("home.title")}</h1>
        <p className="text-2xl max-w-3xl mt-2">{t("home.intro")}</p>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link href="/rankings" className={`${BUTTON} inline-flex items-center gap-2 px-5 py-3 text-lg`}>
            {t("home.toRankings")} <ArrowRight />
          </Link>
          <Suspense fallback={null}>
            <PlayersRated />
          </Suspense>
        </div>
      </Section>
      <Section title={t("home.pages")} titleClassName="sr-only">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {CARDS.map(({ key, href, Glimpse }, i) => (
            <HomeCard key={key} href={href} title={t(`home.${key}.title`)} description={t(`home.${key}.description`)} link={t(`home.${key}.link`)} color={PALETTE[i]}>
              <Glimpse />
            </HomeCard>
          ))}
        </div>
      </Section>
    </>
  );
}

async function PlayersRated() {
  const meta = await getMeta();
  return meta ? <span className="text-gray-700">{t("home.playersRated", { count: num(meta.players) })}</span> : null;
}
