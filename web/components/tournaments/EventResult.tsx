// A finished event's result, in white tiles like the site's stats: the winner (or winning pair) with the rating each of
// them gained in the tournament's week, how they won the final and their chance before the tournament, and in events with a final (a knockout, more than two entries), the final: the winner's and the
// runner-up's rows with each set's points (lost sets in grey; both rows' points next to the line between them), or a
// walkover. Side by side from tablet width, stacked
// on phones; without a final, the winner's tile keeps its half of the width.
import EntryNames from "@/components/tournaments/EntryNames";
import { plural, t } from "@/messages/i18n";
import type { ClubEntry, Entry, TournamentEvent } from "@/types";
import { pct } from "@/utils/format";
import { isSingles } from "@/utils/pools";

export default function EventResult({ event, winner, clubs }: { event: TournamentEvent; winner: Entry; clubs: Record<string, ClubEntry> }) {
  const singles = isSingles(event.pool);
  const final = event.final && event.entries.length > 2 ? event.final : null;
  const runnerUp = final ? event.entries[final.runnerUp] : null;
  const winnerLabel = t(singles ? "tournaments.result.winner" : "tournaments.result.winners");
  // How the final was won: by sets and points ("Won the final 2–0, by 9 points"), or by walkover
  const won = final?.sets.filter(([a, b]) => a > b).length ?? 0;
  const points = final?.sets.reduce((sum, [a, b]) => sum + a - b, 0) ?? 0;
  const margin = !final
    ? null
    : final.walkover
      ? t("tournaments.result.marginWalkover")
      : points > 0
        ? t("tournaments.result.margin", { sets: `${won}–${final.sets.length - won}`, points: plural("tournaments.result.points", points) })
        : t("tournaments.result.marginSets", { sets: `${won}–${final.sets.length - won}` }); // won with fewer points overall

  return (
    <div className="grid gap-4 mb-6 md:grid-cols-2">
      <div className="bg-white p-4 min-w-0">
        <p className="text-sm text-gray-600 mb-2">{winnerLabel}</p>
        <div className="max-sm:[overflow-wrap:anywhere]">
          <EntryNames e={winner} clubs={clubs} ratingBelow changes={event.winnerRatingChange} />
        </div>
        {margin && <p className="mt-2">{margin}</p>}
        <p className="text-sm text-gray-600 mt-2">{t("tournaments.result.chanceBefore", { chance: pct(winner.actual.win) })}</p>
      </div>
      {final && runnerUp && (
        <div className="bg-white p-4 min-w-0">
          <p className="text-sm text-gray-600">{t("tournaments.result.final")}</p>
          <table className="w-full">
            <caption className="sr-only">{t("tournaments.result.final")}</caption>
            <tbody>
              {[
                { entry: winner, label: winnerLabel, points: final.sets.map(([a]) => a), won: true },
                { entry: runnerUp, label: t(singles ? "tournaments.result.runnerUp" : "tournaments.result.runnersUp"), points: final.sets.map(([, b]) => b), won: false },
              ].map((row) => (
                <tr key={row.label} className={`align-top ${row.won ? "" : "border-t border-gray-200"}`}>
                  <th scope="row" className="py-2 pr-3 text-left font-normal max-sm:[overflow-wrap:anywhere]">
                    <span className="block text-xs text-gray-500 mb-0.5">{row.label}</span>
                    <EntryNames e={row.entry} clubs={clubs} ratingBelow />
                  </th>
                  {final.walkover ? (
                    <td className={`py-2 text-right text-sm text-gray-600 whitespace-nowrap ${row.won ? "align-bottom" : "align-top"}`}>{row.won && t("tournaments.result.walkover")}</td>
                  ) : (
                    row.points.map((p, i) => {
                      const other = row.won ? final.sets[i][1] : final.sets[i][0];
                      return (
                        <td key={i} className={`py-2 pl-2 sm:pl-3 w-6 sm:w-8 text-right tabular-nums ${row.won ? "align-bottom" : "align-top"} ${p > other ? "" : "text-gray-400"}`}>
                          {p}
                        </td>
                      );
                    })
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
