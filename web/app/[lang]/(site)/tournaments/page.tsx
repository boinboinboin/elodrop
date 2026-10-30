// Tournaments with a published draw and draw luck (pipeline/upcoming.mjs): upcoming ones, played
// ones by month, and how the predictions turned out over the season.
import type { Metadata } from "next";
import { Suspense } from "react";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PredictionStats, { luckFit } from "@/components/tournaments/PredictionStats";
import Link from "@/components/ui/Link";
import Loading from "@/components/ui/Loading";
import Section from "@/components/ui/Section";
import { getTournamentsIndex } from "@/data/tournaments";
import { getI18n } from "@/messages/server";
import type { TournamentSummary } from "@/types";
import { tournamentHref } from "@/utils/hrefs";
import { pageMetadata } from "@/utils/metadata";
import { cancelledReason } from "@/utils/tournament";

export async function generateMetadata(): Promise<Metadata> {
  const i18n = await getI18n();
  return pageMetadata(i18n, { title: i18n.t("tournaments.metadata.title"), description: i18n.t("seo.descriptions.tournaments"), path: "/tournaments" });
}

export default async function TournamentsPage() {
  const { t } = await getI18n();
  return (
    <>
      <Section>
        <Breadcrumbs trail={[{ label: t("layout.nav.tournaments") }]} />
        <h1 className="h1 mt-4">{t("tournaments.list.title")}</h1>
        <p className="text-2xl max-w-3xl mt-2">{t("tournaments.list.intro")}</p>
        <p className="max-w-3xl mt-4 text-gray-700">{t("tournaments.list.about")}</p>
      </Section>
      <Suspense fallback={<Loading label={t("tournaments.list.loading")} />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Row({ tournament: tour }: { tournament: TournamentSummary }) {
  const i18n = await getI18n();
  const { t, plural, num, dateRange } = i18n;
  const ev = tour.evaluation;
  const reason = tour.cancelled ? cancelledReason(i18n, tour.cancelled) : null;
  const facts = [
    reason,
    plural("tournaments.list.events", tour.events),
    plural("tournaments.list.entries", tour.entries),
    ev?.winners > 0 && t("tournaments.list.favouriteWon", { won: ev.favouritesWon, winners: ev.winners, expected: num(ev.favouritesExpected, 1) }),
  ];
  return (
    <li className="bg-white p-4 md:p-5 flex flex-wrap items-baseline justify-between gap-3">
      <div>
        <Link href={tournamentHref(tour.cup2000Id)} className="text-xl hover:text-blue-600">{tour.name}</Link>
        {tour.cancelled && (
          <span className="ml-2 align-[0.18em] font-mono text-xs px-1.5 py-0.5 border border-red-700 text-red-700 rounded" title={reason ?? undefined}>{t("tournaments.list.notPlayed")}</span>
        )}
        <span className="block text-sm text-gray-600">{facts.filter(Boolean).join(" · ")}</span>
      </div>
      {tour.startDate && <span className="text-gray-700 tabular-nums">{dateRange(tour.startDate, tour.endDate)}</span>}
    </li>
  );
}

async function Content() {
  const { t, num, date } = await getI18n();
  const index = await getTournamentsIndex();
  const tournaments = index?.tournaments ?? [];
  // "Today" is the day of the data update, which the page is rendered with
  const now = index?.generatedAt.slice(0, 10) ?? "";
  const upcoming = tournaments.filter((tour) => (tour.endDate ?? now) >= now).sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""));
  const past = tournaments.filter((tour) => (tour.endDate ?? now) < now);
  // Played tournaments by month of the first day, newest first
  const months = new Map<string, TournamentSummary[]>();
  for (const tour of past) {
    const month = (tour.startDate ?? now).slice(0, 7);
    months.set(month, [...(months.get(month) ?? []), tour]);
  }
  const season = index?.evaluation;
  const fit = season ? luckFit(season) : null;

  return (
    <>
      {season && season.winners > 0 && (
        <Section title={t("tournaments.predictions.title")}>
          <PredictionStats ev={season} />
          <p className="text-gray-700 max-w-3xl">
            {t("tournaments.list.predictionsExplained")}
            {fit?.correlation != null && ` ${t("tournaments.list.correlation", { correlation: num(fit.correlation, 2) })}`}
          </p>
        </Section>
      )}
      <Section title={t("tournaments.list.upcoming")}>
        {upcoming.length ? (
          <ul className="grid gap-3">{upcoming.map((tour) => <Row key={tour.cup2000Id} tournament={tour} />)}</ul>
        ) : (
          <p className="text-gray-600">{t("tournaments.list.noUpcoming")}</p>
        )}
        {past.length > 0 && (
          <>
            <h2 className="text-3xl mt-10 mb-2">{t("tournaments.list.played")}</h2>
            {[...months].map(([month, list]) => (
              <div key={month}>
                <h3 className="text-xl mt-6 mb-3">{date(`${month}-01`, "monthYear")}</h3>
                <ul className="grid gap-3">{list.map((tour) => <Row key={tour.cup2000Id} tournament={tour} />)}</ul>
              </div>
            ))}
          </>
        )}
      </Section>
    </>
  );
}
