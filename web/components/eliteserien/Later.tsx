// The ties after the next day (pipeline/eliteserien-forecast.mjs, from badmintonportalen's schedule), by day (in two
// columns on wide screens) and time: the teams, and the chances of a home win, a draw and an away win with each team's
// best lineup now, as the team match pages' bar (SplitBar) between the teams, the numbers on hover.
import Team from "@/components/clubs/Team";
import { SplitBar } from "@/components/head-to-head/ChanceBar";
import { getI18n } from "@/messages/server";
import type { ClubEntry, EliteserienForecast } from "@/types";
import { ROW } from "@/components/ui/styles";

export default async function Later({ later, clubs }: { later: EliteserienForecast["later"]; clubs: Record<string, ClubEntry> }) {
  const { t, chance, date } = await getI18n();
  const draw = t("eliteserien.next.draw").toLowerCase();
  const odds = (tie: (typeof later)[number]) =>
    [`${tie.home} ${chance(tie.odds.win)}`, ...(tie.odds.draw > 0 ? [`${draw} ${chance(tie.odds.draw)}`] : []), `${tie.away} ${chance(tie.odds.loss)}`].join(" · ");
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
      {[...Map.groupBy(later, (tie) => tie.time.slice(0, 10))].map(([day, ties]) => (
        <div key={day}>
          <h3 className="text-lg mb-2">{ties[0].round ? t("eliteserien.results.day", { round: ties[0].round, date: date(day) }) : date(day)}</h3>
          {/* By time: the time over its ties (none for a tie without one), so the rows leave it out */}
          <div className="bg-white px-3 sm:px-4 pb-1">
            {[...Map.groupBy(ties, (tie) => (tie.time.length > 10 ? tie.time.slice(11, 16) : ""))].map(([time, group]) => (
              <div key={time} className="pt-3 border-b border-gray-200 last:border-b-0">
                {time && <h4 className="text-sm text-gray-600 tabular-nums">{time}</h4>}
                <ul>
                  {group.map((tie) => (
                    <li key={tie.matchId} className={`${ROW} py-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-1.5 min-[360px]:gap-x-2 sm:gap-x-4 text-sm sm:text-base`}>
                      {/* Home and away on each side of the bar, their logos next to it */}
                      <span className="min-w-0 justify-self-end text-right">
                        <Team name={tie.home} clubs={clubs} size={5} className="flex-row-reverse" />
                      </span>
                      {/* The chances as a bar, in words on hover and for screen readers (its label) */}
                      <div className="w-10 min-[360px]:w-12 min-[400px]:w-20 min-[480px]:w-32 sm:w-48 md:w-72 lg:w-40 xl:w-64" title={odds(tie)}>
                        <SplitBar chance={tie.odds.win} draw={tie.odds.draw} label={odds(tie)} />
                      </div>
                      <span className="min-w-0">
                        <Team name={tie.away} clubs={clubs} size={5} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
