// What's new: the changelog (CHANGELOG.md, utils/changelog.ts) made readable. The versions since the
// launch on a timeline by day, newest first; the versions before it folded away in one list.
// Fully static: the changelog is read when the site is built, and every change to it is a deploy.
import type { Metadata } from "next";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import Disclosure from "@/components/ui/Disclosure";
import Section from "@/components/ui/Section";
import Release, { KindBadge, Markdown, releaseId } from "@/components/whats-new/Release";
import { getI18n } from "@/messages/server";
import { type Release as ReleaseData, getReleases, isFeature } from "@/utils/changelog";
import { PALETTE } from "@/utils/chart";
import { pageMetadata } from "@/utils/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const i18n = await getI18n();
  return pageMetadata(i18n, { title: i18n.t("whatsNew.metadata.title"), description: i18n.t("seo.descriptions.whatsNew"), path: "/whats-new" });
}

/** Releases grouped by day, in the order given */
function byDay(releases: ReleaseData[]) {
  const days: { date: string; releases: ReleaseData[] }[] = [];
  for (const r of releases) {
    if (days.at(-1)?.date === r.date) days.at(-1)!.releases.push(r);
    else days.push({ date: r.date, releases: [r] });
  }
  return days;
}

export default async function WhatsNewPage() {
  const { t, plural, date, dateRange } = await getI18n();
  const releases = getReleases();
  const launched = releases.filter((r) => r.major > 0);
  const before = releases.filter((r) => r.major === 0);
  const latest = releases[0];
  // New features take the chart colours in turn (the launch the logo's accent), so neighbours differ
  const features = launched.filter(isFeature);
  const colorOf = (r: ReleaseData) => (r.name === "launch" ? "var(--color-accent)" : PALETTE[features.indexOf(r) % 5]);

  return (
    <>
      <Section>
        <Breadcrumbs trail={[{ label: t("whatsNew.title") }]} />
        <h1 className="h1 mt-4">{t("whatsNew.title")}</h1>
        <p className="text-2xl max-w-3xl mt-2">{t("whatsNew.intro")}</p>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          {latest && (
            <a href={`#${releaseId(latest)}`} className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 font-mono text-sm hover:opacity-80 transition-opacity">
              <span aria-hidden="true" className="w-2 h-2 rounded-full bg-accent" />
              {t("whatsNew.latest", { version: `v${latest.version}` })}
            </a>
          )}
          {/* What the badges mean, one per line on phones */}
          <ul className="text-sm text-gray-700 grid sm:flex sm:flex-wrap gap-x-5 gap-y-1.5">
            <li className="flex items-center gap-1.5"><KindBadge feature /> {t("whatsNew.legendFeature")}</li>
            <li className="flex items-center gap-1.5"><KindBadge feature={false} /> {t("whatsNew.legendImprovement")}</li>
          </ul>
        </div>
      </Section>

      <Section>
        <ol className="grid gap-10 md:gap-12">
          {byDay(launched).map((day) => (
            <li key={day.date} className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-[10rem_minmax(0,1fr)] gap-x-8 gap-y-3">
              {/* The day stays in view while its versions scroll past: above them on phones (on the
                  page's background), beside them from md */}
              <div className="sticky top-0 z-10 py-2 bg-stone-100 flex items-baseline justify-between gap-3 md:top-6 md:self-start md:py-0 md:bg-transparent md:block">
                <time dateTime={day.date} className="block text-xl">{date(day.date)}</time>
                <span className="text-sm text-gray-600">{plural("whatsNew.releases", day.releases.length)}</span>
              </div>
              <div className="grid gap-4 md:border-l md:border-gray-300 md:pl-8">
                {day.releases.map((r) => (
                  <Release key={r.version} release={r} color={colorOf(r)} />
                ))}
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {before.length > 0 && (
        <Section>
          <div className="bg-white p-5 md:p-6">
            <Disclosure summary={<span className="text-xl">{t("whatsNew.beforeLaunch")}</span>}>
              <p className="text-gray-700 mt-2 mb-4">
                {t("whatsNew.beforeLaunchIntro", { count: before.length, dates: dateRange(before.at(-1)!.date, before[0].date, true) })}
              </p>
              <ol className="text-sm">
                {before.map((r) => (
                  <li key={r.version} id={releaseId(r)} className="grid grid-cols-[4.5rem_minmax(0,1fr)] sm:grid-cols-[4.5rem_6rem_minmax(0,1fr)] gap-x-3 py-2 border-b border-gray-100 last:border-0 scroll-mt-20">
                    <span className="font-mono text-gray-600">v{r.version}</span>
                    <time dateTime={r.date} className="hidden sm:block text-gray-600">{date(r.date, "dayMonth")}</time>
                    <ul>
                      {r.items.map((item, i) => (
                        <li key={i}><Markdown text={item.text} /></li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </Disclosure>
          </div>
        </Section>
      )}
    </>
  );
}
