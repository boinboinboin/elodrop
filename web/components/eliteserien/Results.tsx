// The season's results by day, newest first (pipeline/eliteserien-forecast.mjs): each tie a link to its page, the
// teams (the winner bold), the score, and the chance the winner had the night before (a draw's chance for a draw), an
// upset marked when it was under 30%.
import Team from "@/components/clubs/Team";
import { ArrowRight } from "@/components/SVG";
import Badge from "@/components/ui/Badge";
import Link from "@/components/ui/Link";
import { getI18n } from "@/messages/server";
import type { ClubEntry, EliteserienForecast } from "@/types";
import { teamMatchHref } from "@/utils/hrefs";
import { stageKey } from "./NextUp";

export default async function Results({ forecast, clubs }: { forecast: EliteserienForecast; clubs: Record<string, ClubEntry> }) {
  const { t, chance, date } = await getI18n();
  // A play-off tie's stage, from the picture
  const stages = new Map(forecast.playoffs.flatMap((b) => b.ties.map((tie) => [tie.matchId, t(`eliteserien.stages.${stageKey(tie.stage, b.name)}`)])));
  return (
    <div className="grid grid-cols-1 gap-8">
      {forecast.results.map((day) => (
        <div key={day.day}>
          <h3 className="text-lg mb-2">{day.round ? t("eliteserien.results.day", { round: day.round, date: date(day.day) }) : date(day.day)}</h3>
          <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {day.ties.map((tie) => {
              const before = tie.before;
              const note = before && (tie.winner === 0 ? t("eliteserien.results.drawBefore", { chance: chance(before.draw) }) : t("eliteserien.results.chanceBefore", { team: tie.winner === 1 ? tie.home : tie.away, chance: chance(tie.winner === 1 ? before.win : before.loss) }));
              return (
                <li key={tie.matchId}>
                  <Link href={teamMatchHref(tie.matchId)} className="group bg-white p-3 sm:px-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 h-full transition-colors duration-200 hover:bg-gray-50">
                    <span className="min-w-0">
                      <Team name={tie.home} clubs={clubs} size={5} linked={false} className={tie.winner === 1 ? "font-semibold" : ""} />
                      <span className="text-gray-500 mx-1">–</span>
                      <Team name={tie.away} clubs={clubs} size={5} linked={false} className={tie.winner === 2 ? "font-semibold" : ""} />
                      <span className="block text-sm text-gray-600">
                        {[stages.get(tie.matchId), note, tie.goldenSet ? t("eliteserien.results.goldenSet") : null].filter(Boolean).join(" · ")}
                      </span>
                      {tie.upset && <span className="block mt-1"><Badge>{t("eliteserien.results.upset")}</Badge></span>}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xl font-semibold tabular-nums group-hover:text-blue-600">
                      {tie.score[0]}–{tie.score[1]} <ArrowRight />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
