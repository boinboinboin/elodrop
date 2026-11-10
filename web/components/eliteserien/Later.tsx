// The ties after the next day (pipeline/eliteserien-forecast.mjs, from badmintonportalen's schedule), by day: the time,
// the teams, and the chances of a home win, a draw and an away win with each team's best lineup now.
import Team from "@/components/clubs/Team";
import { getI18n } from "@/messages/server";
import type { ClubEntry, EliteserienForecast } from "@/types";
import { ROW } from "@/components/ui/styles";

export default async function Later({ later, clubs }: { later: EliteserienForecast["later"]; clubs: Record<string, ClubEntry> }) {
  const { t, chance, date } = await getI18n();
  return (
    <div className="grid gap-6">
      {[...Map.groupBy(later, (tie) => tie.time.slice(0, 10))].map(([day, ties]) => (
        <div key={day}>
          <h3 className="text-lg mb-2">{ties[0].round ? t("eliteserien.results.day", { round: ties[0].round, date: date(day) }) : date(day)}</h3>
          <ul className="bg-white px-3 sm:px-4">
            {ties.map((tie) => (
              <li key={tie.matchId} className={`${ROW} py-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 sm:gap-x-4`}>
                <span className="text-sm text-gray-600 tabular-nums w-11">{tie.time.length > 10 ? tie.time.slice(11, 16) : ""}</span>
                <span className="min-w-0">
                  <Team name={tie.home} clubs={clubs} size={5} />
                  <span className="text-gray-500 mx-1">–</span>
                  <Team name={tie.away} clubs={clubs} size={5} />
                </span>
                <span className="text-sm tabular-nums text-right whitespace-nowrap">
                  {chance(tie.odds.win)}
                  {tie.odds.draw > 0 && <span className="text-gray-500"> · {t("eliteserien.next.draw").toLowerCase()} {chance(tie.odds.draw)} · </span>}
                  {tie.odds.draw > 0 ? chance(tie.odds.loss) : <span> · {chance(tie.odds.loss)}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
