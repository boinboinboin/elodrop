// The season's table so far with the forecast (pipeline/eliteserien-forecast.mjs): ties played, won, drawn and lost,
// matches and table points, then the expected points after the regular season and the chances of the top 4, the title,
// 7th (the qualification) and 8th (relegated), with the change since the day before, and the place predicted before
// the season. Before the first tie only the forecast, the teams in order of expected points. Places 1 to 4 (the play-offs
// for the title) have a blue edge, and the chances' columns the colours of their outcomes (zones.ts), with a legend:
// the title, 7th and 8th are decided in the play-offs, not by the table.
import Team from "@/components/clubs/Team";
import Swatch from "@/components/ui/Swatch";
import { ROW } from "@/components/ui/styles";
import { getI18n } from "@/messages/server";
import type { ClubEntry, EliteserienForecast, EliteserienOutcome, EliteserienSnapshot } from "@/types";
import { EMPTY } from "@/utils/format";
import { outcome } from "./share";
import { ZONES, zoneColor } from "./zones";

const HEAD = "py-3 px-1.5 sm:px-3 font-normal text-right";
const CELL = "py-3 px-1.5 sm:px-3 text-right tabular-nums";

export default async function ForecastTable({
  forecast,
  history,
  preseason,
  clubs,
}: {
  forecast: EliteserienForecast;
  history: EliteserienSnapshot[];
  preseason: { rank: number; team: string }[] | null;
  clubs: Record<string, ClubEntry>;
}) {
  const { t, num, chance, pct, signed, date } = await getI18n();
  const started = forecast.regular.played > 0;
  // The change since the day before (its last snapshot), or since before the season
  const lastDay = history.at(-1)?.day ?? null;
  const previous = lastDay ? (history.findLast((h) => h.key === "preseason" || (h.day !== null && h.day < lastDay)) ?? null) : null;
  const since = previous ? (previous.day === null ? t("eliteserien.trend.preseason").toLowerCase() : date(previous.day, "dayMonth")) : "";
  const change = (team: string, key: "top4" | "champion", now: number) => {
    const before = previous?.teams[team]?.[key];
    if (before === undefined || Math.abs(now - before) < 0.01) return null;
    const value = signed(Math.round((now - before) * 100), 0);
    return (
      <span className="block text-xs text-gray-500" title={t("eliteserien.table.change", { change: value, date: since })}>
        {value}
      </span>
    );
  };
  const preseasonRank = new Map(preseason?.map((p) => [p.team, p.rank]) ?? []);
  // A chance column's heading, with its outcome's colour under it
  const zoneHead = (zone: EliteserienOutcome, label: string, title: string, hidden = "") => (
    <th scope="col" className={`${HEAD} ${hidden}`} title={title}>
      {label}
      <span aria-hidden="true" className="block h-0.5 mt-1 rounded-full" style={{ background: zoneColor(zone) }} />
    </th>
  );

  return (
    <div className="bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm sm:text-base">
          <thead className="text-sm text-gray-600 border-b border-gray-200">
            <tr>
              <th scope="col" className="py-3 pl-2 sm:pl-4 pr-1.5 font-normal text-right w-8">#</th>
              <th scope="col" className="py-3 px-1.5 sm:px-3 font-normal">{t("eliteserien.table.team")}</th>
              {started && (
                <>
                  <th scope="col" className={`${HEAD} hidden sm:table-cell`} title={t("eliteserien.table.playedTitle")}>{t("eliteserien.table.played")}</th>
                  <th scope="col" className={`${HEAD} hidden md:table-cell`} title={t("eliteserien.table.recordTitle")}>{t("eliteserien.table.record")}</th>
                  <th scope="col" className={`${HEAD} hidden lg:table-cell`} title={t("eliteserien.table.matchesTitle")}>{t("eliteserien.table.matches")}</th>
                  <th scope="col" className={HEAD} title={t("eliteserien.table.pointsTitle")}>{t("eliteserien.table.points")}</th>
                </>
              )}
              <th scope="col" className={`${HEAD} border-l border-gray-200`} title={t("eliteserien.table.expectedPointsTitle")}>{t("eliteserien.table.expectedPoints")}</th>
              {zoneHead("top4", t("eliteserien.table.top4"), t("eliteserien.table.top4Title"))}
              {zoneHead("champion", t("eliteserien.table.champion"), t("eliteserien.table.championTitle"))}
              {zoneHead("qualification", t("eliteserien.table.qualification"), t("eliteserien.table.qualificationTitle"), "hidden sm:table-cell")}
              {zoneHead("relegated", t("eliteserien.table.relegated"), t("eliteserien.table.relegatedTitle"), "hidden sm:table-cell")}
              {preseason && <th scope="col" className={`${HEAD} pr-2 sm:pr-4 hidden lg:table-cell`} title={t("eliteserien.table.preseasonTitle")}>{t("eliteserien.table.preseason")}</th>}
            </tr>
          </thead>
          <tbody>
            {forecast.table.map((row) => (
              <tr key={row.team} className={`align-top hover:bg-gray-50 ${ROW}`}>
                {/* Places 1 to 4: the play-offs for the title */}
                <td className="py-3 pl-2 sm:pl-4 pr-1.5 text-right text-gray-600 tabular-nums" style={row.place <= 4 ? { boxShadow: `inset 4px 0 0 ${zoneColor("top4")}` } : undefined}>
                  {row.place}
                </td>
                <td className="py-3 px-1.5 sm:px-3 whitespace-nowrap"><Team name={row.team} clubs={clubs} size={5} /></td>
                {started && (
                  <>
                    <td className={`${CELL} text-gray-700 hidden sm:table-cell`}>{row.played}</td>
                    <td className={`${CELL} text-gray-700 whitespace-nowrap hidden md:table-cell`}>{`${row.won}-${row.drawn}-${row.lost}`}</td>
                    <td className={`${CELL} text-gray-700 whitespace-nowrap hidden lg:table-cell`}>{`${row.matches[0]}–${row.matches[1]}`}</td>
                    <td className={`${CELL} font-semibold`}>{row.points}</td>
                  </>
                )}
                <td className={`${CELL} border-l border-gray-200`}>{num(row.expectedPoints, 1)}</td>
                <td className={CELL}>
                  {outcome(row.top4, chance, pct)}
                  {change(row.team, "top4", row.top4)}
                </td>
                <td className={`${CELL} font-semibold`}>
                  {outcome(row.champion, chance, pct)}
                  {change(row.team, "champion", row.champion)}
                </td>
                <td className={`${CELL} hidden sm:table-cell`}>{outcome(row.qualification, chance, pct)}</td>
                <td className={`${CELL} hidden sm:table-cell`}>{outcome(row.relegated, chance, pct)}</td>
                {preseason && <td className={`${CELL} pr-2 sm:pr-4 text-gray-500 hidden lg:table-cell`}>{preseasonRank.get(row.team) ?? EMPTY}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-gray-200 px-2 sm:px-4 py-3 text-sm text-gray-600">
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {ZONES.map((zone) => (
            <li key={zone} className="inline-flex items-center gap-1.5">
              <Swatch color={zoneColor(zone)} />
              {t(`eliteserien.zones.${zone}`)}
            </li>
          ))}
        </ul>
        <p className="mt-1">{t("eliteserien.zones.edge")}</p>
      </div>
    </div>
  );
}
