// Tournaments with a published draw and draw luck (pipeline/upcoming.mjs): upcoming ones, played
// ones by month, and how the predictions turned out over the season.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "@/components/Icons";
import PredictionStats, { luckFit } from "@/components/PredictionStats";
import { getTournamentsIndex } from "@/lib/data";
import { date, dateRange } from "@/lib/format";
import type { TournamentSummary } from "@/lib/types";

export const metadata: Metadata = { title: "Tournament draws" };

export default function TournamentsPage() {
  return (
    <>
      <section className="base-section">
        <div className="base-container px-4">
          <Link href="/" className="text-gray-600 hover:text-black"><ArrowLeft /> Rankings</Link>
          <h1 className="h1 mt-4">Tournament draws</h1>
          <p className="text-2xl max-w-3xl mt-2">Who got a lucky or unlucky draw in upcoming tournaments, from the players&apos; ratings.</p>
          <p className="max-w-3xl mt-4 text-gray-700">
            Draws are from Cup2000 and the players from the entry lists on badmintonportalen, as soon as the draw is published, with their ratings from the week before. Once a tournament is played,
            its page shows how the predictions turned out.
          </p>
        </div>
      </section>
      <Suspense fallback={<div className="base-container px-4 text-gray-600">Loading tournaments…</div>}>
        <Content />
      </Suspense>
    </>
  );
}

function Row({ t }: { t: TournamentSummary }) {
  const ev = t.evaluation;
  return (
    <li className="bg-white p-4 md:p-5 flex flex-wrap items-baseline justify-between gap-3">
      <div>
        <Link href={`/tournaments/${t.cup2000Id}`} className="text-xl hover:text-blue-600">{t.name}</Link>
        {t.cancelled && (
          <span className="ml-2 align-middle text-xs px-1.5 py-0.5 border border-red-700 text-red-700 rounded" title={t.cancelled}>Not played</span>
        )}
        <span className="block text-sm text-gray-600">
          {t.cancelled && `${t.cancelled} · `}
          {t.events} events · {t.entries} entries
          {ev?.winners > 0 && ` · favourite won ${ev.favouritesWon} of ${ev.winners} (${ev.favouritesExpected.toFixed(1)} expected)`}
        </span>
      </div>
      {t.startDate && <span className="text-gray-700 tabular-nums">{dateRange(t.startDate, t.endDate)}</span>}
    </li>
  );
}

async function Content() {
  const index = await getTournamentsIndex();
  const tournaments = index?.tournaments ?? [];
  // "Today" is the day of the data update, which the page is rendered with
  const now = index?.generatedAt.slice(0, 10) ?? "";
  const upcoming = tournaments.filter((t) => (t.endDate ?? now) >= now).sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""));
  const past = tournaments.filter((t) => (t.endDate ?? now) < now);
  // Played tournaments by month of the first day, newest first
  const months = new Map<string, TournamentSummary[]>();
  for (const t of past) {
    const month = (t.startDate ?? now).slice(0, 7);
    months.set(month, [...(months.get(month) ?? []), t]);
  }
  const season = index?.evaluation;
  const fit = season ? luckFit(season) : null;

  return (
    <>
      {season && season.winners > 0 && (
        <section className="base-section">
          <div className="base-container px-4">
            <h2 className="text-3xl mb-4">How the predictions turned out</h2>
            <PredictionStats ev={season} />
            <p className="text-gray-700 max-w-3xl">
              The favourite is the entry with the best chance of winning the event with the actual draw; if the chances are right, about as many favourites win as expected. &ldquo;Luck showed in the
              results&rdquo; compares each entry&apos;s result against a fair draw with its draw luck (in rounds, a regression through zero): near 1, a draw rated a round luckier gave about a round more.
              {fit?.correlation != null && ` Luck explains only a small part of a result (correlation ${fit.correlation.toFixed(2)}): most of it is how the matches go.`}
            </p>
          </div>
        </section>
      )}
      <section className="base-section">
        <div className="base-container px-4">
          <h2 className="text-3xl mb-4">Upcoming</h2>
          {upcoming.length ? (
            <ul className="grid gap-3">{upcoming.map((t) => <Row key={t.cup2000Id} t={t} />)}</ul>
          ) : (
            <p className="text-gray-600">No upcoming tournaments with a published draw.</p>
          )}
          {past.length > 0 && (
            <>
              <h2 className="text-3xl mt-10 mb-2">Played</h2>
              {[...months].map(([month, list]) => (
                <div key={month}>
                  <h3 className="text-xl mt-6 mb-3">{date(`${month}-01`, "monthYear")}</h3>
                  <ul className="grid gap-3">{list.map((t) => <Row key={t.cup2000Id} t={t} />)}</ul>
                </div>
              ))}
            </>
          )}
        </div>
      </section>
    </>
  );
}
