// The front page: what elodrop is, and a card for each of the site's pages with a live glimpse of it
// (components/home). The rankings, the front page until this one, are at /rankings.
// Fully static: rendered once per data update.
import type { Metadata } from "next";
import { Suspense } from "react";
import { ArrowRight } from "@/components/SVG";
import { HowItWorksGlimpse, WhatsNewGlimpse } from "@/components/home/AboutGlimpses";
import { ClubsGlimpse, EliteserienGlimpse, HeadToHeadGlimpse, RankingsGlimpse, TournamentsGlimpse, UpsetsGlimpse } from "@/components/home/Glimpses";
import HomeCard from "@/components/home/HomeCard";
import JsonLd from "@/components/seo/JsonLd";
import Link from "@/components/ui/Link";
import Section from "@/components/ui/Section";
import { BUTTON, TEXT_LINK } from "@/components/ui/styles";
import { getMeta } from "@/data/meta";
import { getI18n } from "@/messages/server";
import { PALETTE, SIDE_COLORS } from "@/utils/chart";
import { absoluteUrl, pageMetadata } from "@/utils/metadata";

// Each card's colour: the first five chart colours, which are apart in every pair, and head to head
// its two sides' (the first two), so no card shares a colour with one next to it, in two columns or three
const CARDS = [
  { key: "rankings", href: "/rankings", Glimpse: RankingsGlimpse, colors: [PALETTE[0]] },
  { key: "clubs", href: "/clubs", Glimpse: ClubsGlimpse, colors: [PALETTE[1]] },
  { key: "eliteserien", href: "/eliteserien", Glimpse: EliteserienGlimpse, colors: [PALETTE[2]] },
  { key: "upsets", href: "/upsets", Glimpse: UpsetsGlimpse, colors: [PALETTE[3]] },
  { key: "tournaments", href: "/tournaments", Glimpse: TournamentsGlimpse, colors: [PALETTE[4]] },
  { key: "headToHead", href: "/head-to-head", Glimpse: HeadToHeadGlimpse, colors: SIDE_COLORS },
] as const;
// The pages about the site, below: colours apart from the cards above them in two columns
const ABOUT_CARDS = [
  { key: "howItWorks", href: "/how-it-works", Glimpse: HowItWorksGlimpse, colors: [PALETTE[2]] },
  { key: "whatsNew", href: "/whats-new", Glimpse: WhatsNewGlimpse, colors: ["var(--color-accent)"] },
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const i18n = await getI18n();
  return pageMetadata(i18n, { title: i18n.t("seo.homeTitle"), description: i18n.t("layout.description"), path: "/", absolute: true });
}

export default async function Home() {
  const { t, lang, href } = await getI18n();
  return (
    <>
      <JsonLd
        data={{
          "@type": "WebSite",
          name: t("layout.siteName"),
          url: absoluteUrl(href("/")),
          description: t("layout.description"),
          inLanguage: lang,
          publisher: { "@type": "Organization", name: t("layout.siteName"), url: absoluteUrl(href("/")), logo: absoluteUrl("/apple-icon.png") },
        }}
      />
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
          <Link href="/how-it-works" className={TEXT_LINK}>{t("home.howItWorksLink")}</Link>
        </div>
      </Section>
      <Section title={t("home.pages")} titleClassName="sr-only">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {CARDS.map(({ key, href, Glimpse, colors }) => (
            <HomeCard key={key} href={href} title={t(`home.${key}.title`)} description={t(`home.${key}.description`)} link={t(`home.${key}.link`)} colors={colors}>
              <Glimpse />
            </HomeCard>
          ))}
        </div>
      </Section>
      <Section title={t("home.about")}>
        <div className="grid gap-4 md:grid-cols-2">
          {ABOUT_CARDS.map(({ key, href, Glimpse, colors }) => (
            <HomeCard key={key} href={href} title={t(`home.${key}.title`)} description={t(`home.${key}.description`)} link={t(`home.${key}.link`)} colors={colors}>
              <Glimpse />
            </HomeCard>
          ))}
        </div>
      </Section>
    </>
  );
}

async function PlayersRated() {
  const { t, num } = await getI18n();
  const meta = await getMeta();
  return meta ? <span className="text-gray-700">{t("home.playersRated", { count: num(meta.players) })}</span> : null;
}
