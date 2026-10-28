// How does elodrop work? The ratings and what's built on them, in plain words, with a switch ("I'm a
// big nerd", components/how-it-works/NerdMode.tsx) that opens the formulas, parameters and tests under
// each part. The details follow pipeline/README.md, the full specification; keep them in step with it.
// Static: rendered once per data update (the ratings' spread is the only part that reads the data).
import type { Metadata } from "next";
import { Suspense } from "react";
import { NerdSwitch } from "@/components/how-it-works/NerdMode";
import { Formula, Nerdy, Part } from "@/components/how-it-works/Part";
import RatingDistribution from "@/components/how-it-works/RatingDistribution";
import WinChance from "@/components/how-it-works/WinChance";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";
import Section from "@/components/ui/Section";
import StatCard from "@/components/ui/StatCard";
import { ROW, TEXT_LINK } from "@/components/ui/styles";
import { getDistributions } from "@/data/distribution";
import type { en } from "@/messages/en";
import type { MessageKey } from "@/messages/i18n";
import { getI18n } from "@/messages/server";
import { PALETTE } from "@/utils/chart";
import { repoHref } from "@/utils/hrefs";
import { pageMetadata } from "@/utils/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const i18n = await getI18n();
  return pageMetadata(i18n, { title: i18n.t("howItWorks.metadata.title"), description: i18n.t("howItWorks.metadata.description"), path: "/how-it-works" });
}

const PARTS = ["idea", "start", "counts", "doubles", "rankings", "spread", "site", "tested", "data"] as const;
type PartKey = (typeof PARTS)[number];
/** Each part's number, and its colour: the first five chart colours in turn */
const number = (key: PartKey) => PARTS.indexOf(key) + 1;
const color = (key: PartKey) => PALETTE[PARTS.indexOf(key) % 5];

// The class levels (pipeline/README.md, "Class level weight"): K weight with the junior weight on
// top, and the start ratings
const TIERS = [
  { weight: 100, singles: 1150, doubles: 1150 },
  { weight: 91, singles: 1075, doubles: 1000 },
  { weight: 91, singles: 1075, doubles: 1000 },
  { weight: 91, singles: 1000, doubles: 850 },
  { weight: 74, singles: 1000, doubles: 850 },
  { weight: 87, singles: 925, doubles: 700 },
  { weight: 58, singles: 925, doubles: 700 },
  { weight: 65, singles: 850, doubles: 550 },
  { weight: 38, singles: 775, doubles: 550 },
  { weight: 25, singles: 775, doubles: 550 },
  { weight: 25, singles: 700, doubles: 550 },
  { weight: 17, singles: 700, doubles: 550 },
];

// The comparison with the official ranking (pipeline/README.md, "Comparison with the official ranking")
const COMPARISON = { elo: 76.7, official: 64.3 };

// The plain-words parts as questions and answers, for search and answer engines (FAQPage): each
// question (seo.faq) is answered with its part's paragraphs, without their markup
type FaqPart = keyof typeof en.seo.faq;
const FAQ: Record<FaqPart, MessageKey[]> = {
  idea: ["howItWorks.idea.p1", "howItWorks.idea.p2", "howItWorks.idea.p3"],
  start: ["howItWorks.start.p1", "howItWorks.start.p2"],
  counts: ["howItWorks.counts.intro", "howItWorks.counts.level", "howItWorks.counts.junior", "howItWorks.counts.margin", "howItWorks.counts.region", "howItWorks.counts.rating"],
  doubles: ["howItWorks.doubles.p1", "howItWorks.doubles.p2", "howItWorks.doubles.p3"],
  rankings: ["howItWorks.rankings.p1", "howItWorks.rankings.p2", "howItWorks.rankings.p3"],
  tested: ["howItWorks.tested.p1", "howItWorks.tested.p2"],
  data: ["howItWorks.data.p1", "howItWorks.data.p2"],
};
const strong = (text: React.ReactNode) => <strong>{text}</strong>;
async function P({ k }: { k: MessageKey }) {
  const { rich } = await getI18n();
  return <p>{rich(k, { strong })}</p>;
}
const Sub = ({ children }: { children: React.ReactNode }) => <sub>{children}</sub>;

export default async function HowItWorksPage() {
  const { t, rich, num } = await getI18n();
  const plain = (key: MessageKey) => t(key).replace(/<[^>]+>/g, "");
  return (
    <>
      <JsonLd
        data={{
          "@type": "FAQPage",
          mainEntity: (Object.entries(FAQ) as [FaqPart, MessageKey[]][]).map(([part, keys]) => ({
            "@type": "Question",
            name: t(`seo.faq.${part}`),
            acceptedAnswer: { "@type": "Answer", text: keys.map(plain).join(" ") },
          })),
        }}
      />
      <Section>
        <Breadcrumbs trail={[{ label: t("howItWorks.title") }]} />
        <h1 className="h1 mt-4">{t("howItWorks.title")}</h1>
        <p className="text-2xl max-w-3xl mt-2">{t("howItWorks.intro")}</p>
      </Section>

      <Section>
        <div className="xl:grid xl:grid-cols-[15rem_minmax(0,1fr)] xl:gap-16">
          {/* The switch stays in view: on top of the page on phones and tablets, beside the parts from xl */}
          <aside className="sticky top-0 z-20 -mx-4 px-4 py-3 mb-8 bg-stone-100 border-b border-gray-300 xl:top-8 xl:self-start xl:mx-0 xl:px-0 xl:py-0 xl:mb-0 xl:border-0">
            <NerdSwitch />
            <nav aria-label={t("howItWorks.contents")} className="hidden xl:block mt-10">
              <h2 className="text-sm text-gray-600 mb-3">{t("howItWorks.contents")}</h2>
              <ol className="grid gap-2">
                {PARTS.map((key, i) => (
                  <li key={key}>
                    <a href={`#${key}`} className="flex items-baseline gap-3 text-gray-700 hover:text-black">
                      <span className="font-mono text-xs" style={{ color: color(key) }}>{String(i + 1).padStart(2, "0")}</span>
                      {t(`howItWorks.${key}.title`)}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <div className="grid gap-16 md:gap-20 min-w-0">
            <Part id="idea" number={number("idea")} color={color("idea")} title={t("howItWorks.idea.title")}>
              <P k="howItWorks.idea.p1" />
              <P k="howItWorks.idea.p2" />
              <P k="howItWorks.idea.p3" />
              <Nerdy color={color("idea")}>
                <p>{t("howItWorks.idea.nerd1")}</p>
                <Formula>
                  E<Sub>A</Sub> = 1 / (1 + 10<sup>(R<Sub>B</Sub> − R<Sub>A</Sub>) / 300</sup>)
                </Formula>
                <Formula>
                  R′<Sub>A</Sub> = max(400, R<Sub>A</Sub> + K<Sub>A</Sub> · (S<Sub>A</Sub> − E<Sub>A</Sub>))
                </Formula>
                <p>{t("howItWorks.idea.nerd2")}</p>
              </Nerdy>
              <div className="text-base mt-2">
                <WinChance />
              </div>
            </Part>

            <Part id="start" number={number("start")} color={color("start")} title={t("howItWorks.start.title")}>
              <P k="howItWorks.start.p1" />
              <P k="howItWorks.start.p2" />
              <Nerdy color={color("start")}>
                {/* Compact enough for a phone: the two start ratings under one heading, the classes wrapping */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-gray-600 border-b border-gray-200">
                      <tr>
                        <th scope="col" rowSpan={2} className="py-2 pr-2 sm:pr-3 text-left font-normal align-bottom">{t("howItWorks.start.table.classes")}</th>
                        <th scope="col" rowSpan={2} className="py-2 px-2 sm:px-3 text-right font-normal align-bottom">{t("howItWorks.start.table.weight")}</th>
                        <th scope="colgroup" colSpan={2} className="pt-2 pl-2 sm:pl-3 text-right font-normal">{t("howItWorks.start.table.start")}</th>
                      </tr>
                      <tr>
                        <th scope="col" className="pb-2 px-2 sm:px-3 text-right font-normal">{t("howItWorks.start.table.singles")}</th>
                        <th scope="col" className="pb-2 pl-2 sm:pl-3 text-right font-normal">{t("howItWorks.start.table.doubles")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {TIERS.map((tier, i) => (
                        <tr key={i} className={ROW}>
                          <td className="py-2 pr-2 sm:pr-3">{t(`howItWorks.start.tiers.t${i}` as MessageKey)}</td>
                          <td className="py-2 px-2 sm:px-3 text-right tabular-nums">{tier.weight}%</td>
                          <td className="py-2 px-2 sm:px-3 text-right tabular-nums">{num(tier.singles)}</td>
                          <td className="py-2 pl-2 sm:pl-3 text-right tabular-nums">{num(tier.doubles)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p>{t("howItWorks.start.nerd1")}</p>
                <p>{t("howItWorks.start.nerd2")}</p>
              </Nerdy>
            </Part>

            <Part id="counts" number={number("counts")} color={color("counts")} title={t("howItWorks.counts.title")}>
              <p>{t("howItWorks.counts.intro")}</p>
              <ul className="grid gap-3">
                {(["level", "junior", "margin", "region", "rating"] as const).map((key) => (
                  <li key={key} className="flex gap-3">
                    <span aria-hidden="true" className="mt-[0.6em] w-2 h-2 shrink-0" style={{ background: color("counts") }} />
                    <span>{rich(`howItWorks.counts.${key}`, { strong })}</span>
                  </li>
                ))}
              </ul>
              <Nerdy color={color("counts")}>
                <p>{t("howItWorks.counts.nerd1")}</p>
                <Formula>
                  K<Sub>A</Sub> = κ · w<Sub>c</Sub> · w<Sub>j</Sub> · w<Sub>m</Sub> · w<Sub>r</Sub> · m(R<Sub>A</Sub>) · c<Sub>t</Sub>
                </Formula>
                <dl className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
                  {(
                    [
                      ["κ", "kappa"],
                      ["w_c", "wc"],
                      ["w_j", "wj"],
                      ["w_m", "wm"],
                      ["w_r", "wr"],
                      ["m(r)", "m"],
                      ["c_t", "ct"],
                    ] as const
                  ).map(([symbol, key]) => (
                    <div key={key} className="contents">
                      <dt className="font-mono">{symbol}</dt>
                      <dd className="text-gray-700">{t(`howItWorks.counts.symbols.${key}`)}</dd>
                    </div>
                  ))}
                </dl>
                <Formula>
                  w<Sub>m</Sub> = min(3, (max(d, 0.02) / 0.2)<sup>0.75</sup>)
                </Formula>
                <p>{t("howItWorks.counts.nerd2")}</p>
                <Formula>
                  m(r) = 1 + 2 / (1 + 2<sup>(r − 1150) / 90</sup>)
                </Formula>
                <p>{t("howItWorks.counts.nerd3")}</p>
              </Nerdy>
            </Part>

            <Part id="doubles" number={number("doubles")} color={color("doubles")} title={t("howItWorks.doubles.title")}>
              <P k="howItWorks.doubles.p1" />
              <P k="howItWorks.doubles.p2" />
              <P k="howItWorks.doubles.p3" />
              <Nerdy color={color("doubles")}>
                <p>{t("howItWorks.doubles.nerd1")}</p>
                <Formula>
                  E<Sub>AB</Sub> = 1 / (1 + 10<sup>((R<Sub>C</Sub> + R<Sub>D</Sub>)/2 − (R<Sub>A</Sub> + R<Sub>B</Sub>)/2) / 240</sup>)
                </Formula>
                <Formula>
                  R′<Sub>A</Sub> = R<Sub>A</Sub> + K<Sub>A</Sub> · RD<Sub>A</Sub>² / (RD<Sub>A</Sub>² + RD<Sub>B</Sub>²) · (S − E<Sub>AB</Sub>)
                </Formula>
                <p>{t("howItWorks.doubles.nerd2")}</p>
                <Formula>
                  R<Sub>doubles</Sub> = 1150 + 1.12 · (R<Sub>singles</Sub> − 1150)
                </Formula>
              </Nerdy>
            </Part>

            <Part id="rankings" number={number("rankings")} color={color("rankings")} title={t("howItWorks.rankings.title")}>
              <P k="howItWorks.rankings.p1" />
              <P k="howItWorks.rankings.p2" />
              <P k="howItWorks.rankings.p3" />
              <Nerdy color={color("rankings")}>
                <p>{t("howItWorks.rankings.nerd1")}</p>
                <p>{t("howItWorks.rankings.nerd2")}</p>
              </Nerdy>
            </Part>

            <Part id="spread" number={number("spread")} color={color("spread")} title={t("howItWorks.spread.title")}>
              <P k="howItWorks.spread.p1" />
              <P k="howItWorks.spread.p2" />
              <Nerdy color={color("spread")}>
                <p>{t("howItWorks.spread.nerd1")}</p>
                <Formula>
                  f(r) = n · 50 / (σ√(2π)) · e<sup>−(r − μ)² / 2σ²</sup>
                </Formula>
                <p>{t("howItWorks.spread.nerd2")}</p>
              </Nerdy>
              <div className="text-base mt-2">
                {/* The only part that reads the data: the rest of the page is static text */}
                <Suspense fallback={<div className="bg-white h-[34rem]" />}>
                  <Spread color={color("spread")} />
                </Suspense>
              </div>
            </Part>

            <Part id="site" number={number("site")} color={color("site")} title={t("howItWorks.site.title")}>
              <p>{t("howItWorks.site.intro")}</p>
              <ul className="grid gap-3">
                {(["clubs", "upsets", "tournaments", "eliteserien", "headToHead"] as const).map((key) => (
                  <li key={key} className="flex gap-3">
                    <span aria-hidden="true" className="mt-[0.6em] w-2 h-2 shrink-0" style={{ background: color("site") }} />
                    <span>{rich(`howItWorks.site.${key}`, { strong })}</span>
                  </li>
                ))}
              </ul>
              <Nerdy color={color("site")}>
                <p>{t("howItWorks.site.nerd1")}</p>
                <p>{t("howItWorks.site.nerd2")}</p>
                <p>{t("howItWorks.site.nerd3")}</p>
              </Nerdy>
            </Part>

            <Part id="tested" number={number("tested")} color={color("tested")} title={t("howItWorks.tested.title")}>
              <P k="howItWorks.tested.p1" />
              <P k="howItWorks.tested.p2" />
              <dl className="grid grid-cols-2 gap-2 md:gap-4">
                <StatCard label={t("howItWorks.tested.elo")}>{COMPARISON.elo}%</StatCard>
                <StatCard label={t("howItWorks.tested.official")}>{COMPARISON.official}%</StatCard>
              </dl>
              <Nerdy color={color("tested")}>
                <p>{t("howItWorks.tested.nerd1")}</p>
                <p>{t("howItWorks.tested.nerd2")}</p>
                <p>
                  {rich("howItWorks.tested.nerd3", {
                    spec: (text) => <a href={repoHref("pipeline/README.md")} className={TEXT_LINK}>{text}</a>,
                    benchmark: (text) => <a href={repoHref("pipeline/BENCHMARK.md")} className={TEXT_LINK}>{text}</a>,
                  })}
                </p>
              </Nerdy>
            </Part>

            <Part id="data" number={number("data")} color={color("data")} title={t("howItWorks.data.title")}>
              <p>
                {rich("howItWorks.data.p1", {
                  portalen: (text) => <a href="https://badmintonportalen.no" className={TEXT_LINK} rel="noopener">{text}</a>,
                  cup2000: (text) => <a href="https://www.cup2000.dk" className={TEXT_LINK} rel="noopener">{text}</a>,
                })}
              </p>
              <P k="howItWorks.data.p2" />
              <Nerdy color={color("data")}>
                <p>{t("howItWorks.data.nerd1")}</p>
                <p>{t("howItWorks.data.nerd2")}</p>
              </Nerdy>
            </Part>
          </div>
        </div>
      </Section>
    </>
  );
}

async function Spread({ color }: { color: string }) {
  return <RatingDistribution data={await getDistributions()} color={color} />;
}
