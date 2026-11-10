// A group's power ranking (pipeline/team-matches.mjs): its teams by the players who played for them
// that season, as expected matches won per team match against the group's other teams, beside the
// matches each actually won per team match, with how it's worked out folded under it
import Team from "@/components/clubs/Team";
import Card from "@/components/ui/Card";
import Disclosure from "@/components/ui/Disclosure";
import { ROW } from "@/components/ui/styles";
import { getI18n } from "@/messages/server";
import type { ClubEntry, TeamPowerRanking } from "@/types";
import { EMPTY } from "@/utils/format";

export default async function PowerRanking({ power, clubs }: { power: TeamPowerRanking; clubs: Record<string, ClubEntry> }) {
  const { blocks, date, num, pct, t } = await getI18n();
  const played = power.teams.some((team) => team.actual);
  return (
    <Card title={t("teamMatches.power.title")} subtitle={t("teamMatches.power.intro", { matches: power.matches })}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm sm:text-base">
          <thead className="text-sm text-gray-600 border-b border-gray-200">
            <tr>
              <th scope="col" className="py-2 pr-2 sm:pr-4 font-normal text-right w-8">#</th>
              <th scope="col" className="py-2 pr-2 sm:pr-4 font-normal">{t("teamMatches.power.team")}</th>
              <th scope="col" className="py-2 pr-2 sm:pr-4 font-normal text-right" title={t("teamMatches.power.expectedTitle")}>{t("teamMatches.power.expected")}</th>
              {played && <th scope="col" className="py-2 pr-2 sm:pr-4 font-normal text-right" title={t("teamMatches.power.actualTitle")}>{t("teamMatches.power.actual")}</th>}
              <th scope="col" className="py-2 pr-2 sm:pr-4 font-normal text-right" title={t("teamMatches.power.winTitle")}>{t("teamMatches.power.win")}</th>
              <th scope="col" className="py-2 font-normal text-right hidden sm:table-cell" title={t("teamMatches.power.playersTitle")}>{t("teamMatches.power.players")}</th>
            </tr>
          </thead>
          <tbody>
            {power.teams.map((team) => (
              <tr key={team.team} data-team={team.team} className={ROW}>
                <td className="py-2 pr-2 sm:pr-4 text-right tabular-nums text-gray-600">{team.rank}</td>
                <td className="py-2 pr-4"><Team name={team.team} club={team.club} clubs={clubs} size={5} /></td>
                <td className="py-2 pr-2 sm:pr-4 text-right tabular-nums">{num(team.expected, 2)}</td>
                {played && (
                  <td className="py-2 pr-2 sm:pr-4 text-right tabular-nums text-gray-700" title={team.actual ? t("teamMatches.power.actualCell", { ties: team.actual.ties }) : undefined}>
                    {team.actual ? num(team.actual.matches, 2) : EMPTY}
                  </td>
                )}
                <td className="py-2 pr-2 sm:pr-4 text-right tabular-nums">{pct(team.win)}</td>
                <td className="py-2 text-right tabular-nums text-gray-600 hidden sm:table-cell">{team.players}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Disclosure summary={t("teamMatches.power.howTitle")} className="mt-4 text-sm">
        <div className="mt-3 space-y-3 text-gray-700 max-w-prose [&_strong]:font-semibold [&_strong]:text-gray-900">{blocks("teamMatches.power.how", {}, { date: date(power.ratingsDay) })}</div>
      </Disclosure>
    </Card>
  );
}
