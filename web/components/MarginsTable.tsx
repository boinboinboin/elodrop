// Winning margins of two sides' meetings (lib/data.ts margins()), for the head-to-head pages.
import type { Margins } from "@/lib/data";
import { PALETTE } from "@/lib/chart";
import { date, num } from "@/lib/format";
import type { Match } from "@/lib/types";

// The sides' colours, as on the head-to-head pages
const COLORS = [PALETTE[0], PALETTE[1]];

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
        <table className="w-full text-left">
          <thead className="text-sm text-gray-600 border-b border-gray-200">
            <tr>
              <th scope="col" className="py-2 pr-4 font-normal"><span className="sr-only">Measure</span></th>
              {sides.map((side) => (
                <th key={side.i} scope="col" className="py-2 pr-4 font-normal text-right whitespace-nowrap">
                  <span className="inline-block w-3 h-1 rounded-full align-middle mr-1.5" style={{ background: COLORS[side.i] }} />
                  {side.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular-nums">
            <tr className="border-b border-gray-100">
              <th scope="row" className="py-2 pr-4 font-normal text-gray-700">Matches won</th>
              {sides.map((side) => <td key={side.i} className="py-2 pr-4 text-right">{side.s.wins}</td>)}
            </tr>
            <tr className="border-b border-gray-100">
              <th scope="row" className="py-2 pr-4 font-normal text-gray-700">Sets won</th>
              {sides.map((side) => <td key={side.i} className="py-2 pr-4 text-right">{mg.sets[side.i]}</td>)}
            </tr>
            <tr className="border-b border-gray-100">
              <th scope="row" className="py-2 pr-4 font-normal text-gray-700">Points won</th>
              {sides.map((side) => (
                <td key={side.i} className="py-2 pr-4 text-right">
                  {num(mg.points[side.i])}
                  {total > 0 && <span className="block text-sm text-gray-500">{((mg.points[side.i] / total) * 100).toFixed(1)}%</span>}
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-100">
              <th scope="row" className="py-2 pr-4 font-normal text-gray-700">Average winning margin</th>
              {sides.map((side) => <td key={side.i} className="py-2 pr-4 text-right">{side.s.average !== null ? `${side.s.average.toFixed(1)} points` : "–"}</td>)}
            </tr>
            <tr>
              <th scope="row" className="py-2 pr-4 font-normal text-gray-700">Biggest win</th>
              {sides.map((side) => {
                const big = side.s.biggest;
                return (
                  <td key={side.i} className="py-2 pr-4 text-right">
                    {big ? (
                      <>
                        {winnerScore(big, side.i === 1)}
                        <span className="block text-sm text-gray-500">
                          +{Math.abs(big.margin!)} points · {date(big.day)}{showPool && big.poolLabel ? ` · ${big.poolLabel.toLowerCase()}` : ""}
                        </span>
                      </>
                    ) : "–"}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-sm text-gray-600 mt-3">
        {mg.deciding} of {mg.matches} {mg.matches === 1 ? "match" : "matches"} went to a deciding set.
        {closest && (
          <>
            {" "}Closest: {names[winnerIsB ? 1 : 0]} won {winnerScore(closest, winnerIsB)} (
            {closest.margin === 0 ? "level on points" : `by ${Math.abs(closest.margin!)} ${Math.abs(closest.margin!) === 1 ? "point" : "points"}`}) on {date(closest.day)}.
          </>
        )}
      </p>
    </>
  );
}
