// A group's official standings (badmintonportalen's; pipeline/fetch-league.mjs), beside its power
// ranking on the division page (components/team-matches/Division.tsx): place, team matches played,
// won, drawn and lost, matches and sets won and lost, and table points. A knockout playoff
// (Eliteserien's) has only the places. The dashed line badmintonportalen draws under some places (the
// ones going through to the playoffs, or a split into top and bottom groups) is dashed here too.
import Team from "@/components/clubs/Team";
import Card from "@/components/ui/Card";
import { ROW } from "@/components/ui/styles";
import { getI18n } from "@/messages/server";
import type { ClubEntry, TeamStandingsRow } from "@/types";
import { EMPTY } from "@/utils/format";

const CELL = "py-2 pr-2 sm:pr-4 text-right tabular-nums";
const HEAD = "py-2 pr-2 sm:pr-4 font-normal text-right";
const pair = (p: [number, number] | undefined) => (p ? `${p[0]}–${p[1]}` : EMPTY);

export default async function Standings({ standings, clubs }: { standings: TeamStandingsRow[]; clubs: Record<string, ClubEntry> }) {
  const { t } = await getI18n();
  const table = standings.some((row) => row.played !== undefined);
  // The line under a place, but not under the last (nothing below it to set apart)
  const line = (i: number) => standings[i].line && i < standings.length - 1;
  const columns = ["played", "won", "drawn", "lost"] as const;

  return (
    <Card title={t("teamMatches.standings.title")} subtitle={t(table ? "teamMatches.standings.intro" : "teamMatches.standings.introPlayoff")}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm sm:text-base">
          <thead className="text-sm text-gray-600 border-b border-gray-200">
            <tr>
              <th scope="col" className="py-2 pr-2 sm:pr-4 font-normal text-right w-8">#</th>
              <th scope="col" className="py-2 pr-2 sm:pr-4 font-normal">{t("teamMatches.standings.team")}</th>
              {table && (
                <>
                  {columns.map((key) => (
                    <th key={key} scope="col" className={HEAD}>
                      <abbr title={t(`teamMatches.standings.${key}Title`)} className="no-underline">{t(`teamMatches.standings.${key}`)}</abbr>
                    </th>
                  ))}
                  <th scope="col" className={HEAD} title={t("teamMatches.standings.matchesTitle")}>{t("teamMatches.standings.matches")}</th>
                  <th scope="col" className={`${HEAD} hidden sm:table-cell`} title={t("teamMatches.standings.setsTitle")}>{t("teamMatches.standings.sets")}</th>
                  <th scope="col" className="py-2 font-normal text-right">
                    <abbr title={t("teamMatches.standings.pointsTitle")} className="no-underline">{t("teamMatches.standings.points")}</abbr>
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {standings.map((row, i) => (
              <tr key={row.team} className={line(i) ? "border-b border-dashed border-gray-400" : ROW}>
                <td className="py-2 pr-2 sm:pr-4 text-right tabular-nums text-gray-600">{row.place || EMPTY}</td>
                <td className="py-2 pr-4"><Team name={row.team} club={row.club} clubs={clubs} size={5} /></td>
                {table && (
                  <>
                    {columns.map((key) => (
                      <td key={key} className={`${CELL} text-gray-700`}>{row[key] ?? EMPTY}</td>
                    ))}
                    <td className={`${CELL} text-gray-700 whitespace-nowrap`}>{pair(row.matches)}</td>
                    <td className={`${CELL} text-gray-700 whitespace-nowrap hidden sm:table-cell`}>{pair(row.sets)}</td>
                    <td className="py-2 text-right tabular-nums font-semibold">{row.points ?? EMPTY}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
