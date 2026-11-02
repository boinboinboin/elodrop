"use client";

// What a match would do to the players' ratings, from a score typed in (up to three sets): the
// winner, each player's change and new rating (hypotheticalMatch in utils/rating.ts), rated as a
// top-level match between clubs in the same region. On the head-to-head pages' discipline tabs: two
// players in singles, two pairs in doubles (four different players).
//
// Closed by default (a disclosure), so the comparison isn't crowded. The score is a scoreboard: a row per side in its colour, a box per set (a set's winning score
// filled in black, like a selected toggle) and the sets won. Tab goes set by set (set 1 A, set 1 B,
// set 2 A, …), so the grid is laid out column by column. The outcome beside it: the winner, whether
// that was expected, the margin's weight, and a card per side in its colour with each player's change.
import { Fragment, useId, useState } from "react";
import Disclosure from "@/components/ui/Disclosure";
import Swatch from "@/components/ui/Swatch";
import { toggleClass } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";
import { SIDE_COLORS } from "@/utils/chart";
import { toneClass } from "@/utils/format";
import { type MatchPlayer, type SetScore, hypotheticalMatch } from "@/utils/rating";

type Field = [string, string];
const EMPTY: Field[] = [["", ""], ["", ""], ["", ""]];

/** A set's points once both are filled in, else null */
const toSet = ([a, b]: Field): SetScore | null => (a === "" || b === "" ? null : [Number(a), Number(b)]);

/** The side that won a set, or null (not filled in, or level) */
const setWinner = (set: SetScore | null) => (!set || set[0] === set[1] ? null : set[0] > set[1] ? 0 : 1);

/** A small outlined label in monospace, as components/ui/Badge.tsx */
const LABEL = "inline-block font-mono text-xs px-1.5 py-0.5 border rounded";

/** A side: its name (a player's, or "Pair A") and its players, one in singles and two in doubles */
export interface CalculatorSide {
  name: string;
  players: (MatchPlayer & { name: string })[];
}

export default function ScoreCalculator({ sides }: { sides: [CalculatorSide, CalculatorSide] }) {
  const { t, num, signed } = useI18n();
  const id = useId();
  const [fields, setFields] = useState<Field[]>(EMPTY);

  const [first, second] = fields.slice(0, 2).map(toSet);
  // The third set is only played after the first two are split
  const split = !!first && !!second && first[0] !== first[1] && second[0] !== second[1] && first[0] > first[1] !== second[0] > second[1];
  const sets = [first, second, split ? toSet(fields[2]) : null];
  const played = sets.filter((s): s is SetScore => !!s);
  const match = hypotheticalMatch([sides[0].players, sides[1].players], played);
  const names = sides.map((side) => side.name);
  const doubles = sides[0].players.length > 1;
  const setsWon = [0, 1].map((side) => sets.filter((set) => setWinner(set) === side).length);

  const update = (set: number, side: number, value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 2);
    setFields((current) => current.map((f, i) => (i === set ? (side === 0 ? [digits, f[1]] : [f[0], digits]) : f)) as Field[]);
  };
  const filled = fields.some(([a, b]) => a !== "" || b !== "");
  const decided = match && !match.walkover ? match : null;

  return (
    <div data-calculator className="mt-8 pt-6 border-t border-gray-200">
      <Disclosure summary={<span className="text-lg">{t("headToHead.calculator.title")}</span>}>
        <p className="text-sm text-gray-600 mt-1 mb-5 max-w-3xl">{t("headToHead.calculator.intro")}</p>
        <div className="grid gap-6 lg:gap-10 lg:grid-cols-[auto_minmax(0,1fr)] items-start">
          {/* The scoreboard: names, then each set's label and both sides' points, then the sets won */}
          <div className="grid grid-flow-col grid-rows-[auto_auto_auto] gap-x-1.5 sm:gap-x-2 gap-y-1.5 items-center justify-start">
            <span aria-hidden="true" />
            {names.map((name, side) => (
              <span key={side} className="flex items-center gap-2 pr-2 sm:pr-3 min-w-0 max-w-32 sm:max-w-48 self-stretch">
                <Swatch color={SIDE_COLORS[side]} className="w-1 self-stretch" />
                <span className="truncate">{name}</span>
              </span>
            ))}
            {[0, 1, 2].map((set) => {
              const off = set === 2 && !split;
              const winner = setWinner(sets[set]);
              return (
                <Fragment key={set}>
                  <span aria-hidden="true" className={`font-mono text-xs text-center text-gray-500 ${off ? "opacity-50" : ""}`}>
                    {t("headToHead.calculator.set", { n: set + 1 })}
                  </span>
                  {names.map((name, side) => (
                    <input
                      key={side}
                      id={`${id}-${set}-${side}`}
                      aria-label={t("headToHead.calculator.points", { name, n: set + 1 })}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="–"
                      maxLength={2}
                      disabled={off}
                      value={off ? "" : fields[set][side]}
                      onChange={(e) => update(set, side, e.target.value)}
                      className={`w-11 h-11 sm:w-13 sm:h-13 text-lg sm:text-xl font-semibold text-center tabular-nums border transition-colors duration-200 placeholder:text-gray-300 placeholder:font-normal ${
                        off ? "border-dashed border-gray-300 bg-transparent" : winner === side ? "border-black bg-black text-white" : "border-black bg-white"
                      }`}
                    />
                  ))}
                </Fragment>
              );
            })}
            <span aria-hidden="true" className="font-mono text-xs text-center text-gray-500 pl-2 sm:pl-3">{t("headToHead.calculator.sets")}</span>
            {setsWon.map((won, side) => (
              <span key={side} aria-hidden="true" className={`font-mono text-xl text-center tabular-nums pl-2 sm:pl-3 ${decided?.winner === side ? "font-semibold" : "text-gray-400"}`}>
                {played.length ? won : "–"}
              </span>
            ))}
          </div>

          {/* The outcome, read out as it changes */}
          <div aria-live="polite" className={`min-w-0 ${decided ? "" : "lg:self-stretch flex flex-col"}`}>
            {decided ? (
              <>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3">
                  <p className="text-xl">{t("headToHead.calculator.wins", { name: names[decided.winner] })}</p>
                  {decided.chance >= 0.5 === (decided.winner === 0) ? (
                    <span className={`${LABEL} border-gray-500 text-gray-700`}>{t("headToHead.calculator.expected")}</span>
                  ) : (
                    <span className={`${LABEL} border-black bg-black text-white`}>{t("headToHead.calculator.upset")}</span>
                  )}
                  <span className={`${LABEL} border-gray-500 text-gray-700`} title={t("headToHead.calculator.weightTitle")}>
                    {t(`headToHead.calculator.${decided.margin < 0.8 ? "close" : decided.margin > 1.25 ? "big" : "typical"}`)} · {t("headToHead.calculator.weight", { weight: num(decided.margin, 2) })}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {sides.map((side, i) => (
                    <dl key={i} className="bg-gray-50 border-t-4 p-3 sm:p-4 grid gap-3 content-start min-w-0" style={{ borderTopColor: SIDE_COLORS[i] }}>
                      {side.players.map((player, j) => {
                        const change = decided.changes[i][j];
                        return (
                          <div key={j} className="min-w-0">
                            <dt className="text-sm text-gray-600 truncate">{player.name}</dt>
                            <dd className="tabular-nums">
                              <span className={`block ${doubles ? "text-2xl" : "text-3xl"} font-semibold ${Math.abs(change) < 0.05 ? "" : toneClass(change)}`}>{signed(change, 1)}</span>
                              <span className="block text-sm text-gray-600">
                                {t("headToHead.calculator.newRating", { from: num(Math.round(player.rating)), to: num(Math.round(decided.after[i][j])) })}
                              </span>
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  ))}
                </div>
              </>
            ) : (
              <p className="flex-1 flex items-center border border-dashed border-gray-300 px-4 py-6 text-gray-600">
                {t(match?.walkover ? "headToHead.calculator.walkover" : filled ? "headToHead.calculator.undecided" : "headToHead.calculator.empty")}
              </p>
            )}
            {filled && (
              <button type="button" onClick={() => setFields(EMPTY)} className={`mt-3 self-start cursor-pointer ${toggleClass(false, "sm")}`}>
                {t("common.clear")}
              </button>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-5 max-w-3xl">{t(doubles ? "headToHead.calculator.noteDoubles" : "headToHead.calculator.note")}</p>
      </Disclosure>
    </div>
  );
}
