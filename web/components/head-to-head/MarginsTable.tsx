// Winning margins of two sides' meetings (data/head-to-head.ts margins()), for the head-to-head pages.
import Swatch from "@/components/ui/Swatch";
import { plural, t } from "@/messages/i18n";
import type { Margins, Match } from "@/types";
import { SIDE_COLORS } from "@/utils/chart";
import { date, EMPTY, num, pct } from "@/utils/format";

/** A score from the winner's side: "18-21, 15-21" → "21-18, 21-15" */
const winnerScore = (m: Match, flip: boolean) => (flip ? m.score.split(", ").map((set) => set.split("-").reverse().join("-")).join(", ") : m.score);

/** Winning margins: per side (a player or a pair) the matches, sets and points won, the average margin of their wins and their biggest win; then deciding sets and the closest match */
export default function MarginsTable({ mg, names, showPool }: { mg: Margins; names: [string, string]; showPool: boolean }) {
  const sides = [
    { name: names[0], s: mg.a, i: 0 },
    { name: names[1], s: mg.b, i: 1 },
  ];
  const total = mg.points[0] + mg.points[1];
  const closest = mg.closest;
  const winnerIsB = closest?.result === 0;
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm sm:text-base">
          <thead className="text-sm text-gray-600 border-b border-gray-200">
            <tr>
              <th scope="col" className="py-2 pr-4 font-normal"><span className="sr-only">{t("headToHead.margins.measure")}</span></th>
              {sides.map((side) => (
                <th key={side.i} scope="col" className="py-2 pr-2 sm:pr-4 font-normal text-right align-bottom max-sm:[overflow-wrap:anywhere]">
                  <Swatch color={SIDE_COLORS[side.i]} className="w-3 h-1 align-middle mr-1.5" />
                  {side.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular-nums">
            <tr className="border-b border-gray-100">
              <th scope="row" className="py-2 pr-2 sm:pr-4 font-normal text-gray-700">{t("headToHead.margins.matchesWon")}</th>
              {sides.map((side) => <td key={side.i} className="py-2 pr-2 sm:pr-4 text-right">{side.s.wins}</td>)}
            </tr>
            <tr className="border-b border-gray-100">
              <th scope="row" className="py-2 pr-2 sm:pr-4 font-normal text-gray-700">{t("headToHead.margins.setsWon")}</th>
              {sides.map((side) => <td key={side.i} className="py-2 pr-2 sm:pr-4 text-right">{mg.sets[side.i]}</td>)}
            </tr>
            <tr className="border-b border-gray-100">
              <th scope="row" className="py-2 pr-2 sm:pr-4 font-normal text-gray-700">{t("headToHead.margins.pointsWon")}</th>
              {sides.map((side) => (
                <td key={side.i} className="py-2 pr-2 sm:pr-4 text-right">
                  {num(mg.points[side.i])}
                  {total > 0 && <span className="block text-sm text-gray-500">{pct(mg.points[side.i] / total, 1)}</span>}
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-100">
              <th scope="row" className="py-2 pr-2 sm:pr-4 font-normal text-gray-700">{t("headToHead.margins.averageMargin")}</th>
              {sides.map((side) => <td key={side.i} className="py-2 pr-2 sm:pr-4 text-right">{side.s.average !== null ? plural("headToHead.margins.points", side.s.average, { count: side.s.average.toFixed(1) }, { decimals: 1 }) : EMPTY}</td>)}
            </tr>
            <tr>
              <th scope="row" className="py-2 pr-2 sm:pr-4 font-normal text-gray-700">{t("headToHead.margins.biggestWin")}</th>
              {sides.map((side) => {
                const big = side.s.biggest;
                return (
                  <td key={side.i} className="py-2 pr-2 sm:pr-4 text-right">
                    {big ? (
                      <>
                        {winnerScore(big, side.i === 1)}
                        <span className="block text-sm text-gray-500">
                          {[plural("headToHead.margins.plusPoints", Math.abs(big.margin!)), date(big.day), showPool && big.pool && t(`common.poolsInSentence.${big.pool}`)].filter(Boolean).join(" · ")}
                        </span>
                      </>
                    ) : EMPTY}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-sm text-gray-600 mt-3">
        {plural("headToHead.margins.deciding", mg.matches, { deciding: mg.deciding })}
        {closest &&
          ` ${t("headToHead.margins.closest", {
            name: names[winnerIsB ? 1 : 0],
            score: winnerScore(closest, winnerIsB),
            margin: closest.margin === 0 ? t("headToHead.margins.levelOnPoints") : plural("headToHead.margins.by", Math.abs(closest.margin!)),
            date: date(closest.day),
          })}`}
      </p>
    </>
  );
}
