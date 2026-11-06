"use client";

// A milestone badge's levels on the achievements page (app/[lang]/(site)/achievements/page.tsx), as a
// vertical carousel of its art stacked like a pile of medals: the level shown in front, the higher
// levels peeking out above and behind it. The arrows (or a click on the pile) step a level up or
// down; up from the top level starts over at the lowest. Beside it, the card's text and the list of
// levels with how many players each, the one shown marked; a click on one shows it. It renders two
// siblings, the pile and the text, for the card's row to lay out.
import { type ReactNode, useState } from "react";
import { ArrowRight } from "@/components/SVG";
import { BUTTON } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";

export interface ShowcaseLevel {
  level: number;
  /** The level's title, its placeholders filled ("On fire: 20 in a row") */
  title: string;
  art: string | null;
  /** "12 players" */
  players: string;
}

/** Where a level's art sits in the pile, by how far it is from the one shown (above it: positive) */
function place(offset: number): { transform: string; opacity: number; zIndex: number } {
  // Shown, then dropped off the front (sliding down and fading) once a higher level comes forward
  if (offset === 0) return { transform: "translateY(0) scale(1)", opacity: 1, zIndex: 30 };
  if (offset < 0) return { transform: "translateY(22%) scale(1.04)", opacity: 0, zIndex: 40 };
  // The next two above it, smaller and fainter the further back; any further hidden behind them
  const step = Math.min(offset, 2);
  return { transform: `translateY(${-13 * step}%) scale(${1 - 0.13 * step})`, opacity: offset > 2 ? 0 : 1 - 0.35 * step, zIndex: 30 - step };
}

const STEP_BUTTON = `inline-flex items-center justify-center w-8 h-8 ${BUTTON}`;

export default function LevelShowcase({ levels, children }: { levels: ShowcaseLevel[]; children: ReactNode }) {
  const { t } = useI18n();
  const [current, setCurrent] = useState(0);
  const show = (i: number) => setCurrent((i + levels.length) % levels.length);
  const shown = levels[current];

  return (
    <>
      <div className="shrink-0 flex flex-col items-center gap-3">
        {/* The pile, with room above for the levels peeking out */}
        <button
          type="button"
          onClick={() => show(current + 1)}
          disabled={levels.length < 2}
          aria-label={levels.length > 1 ? `${shown.title}. ${t("achievements.nextLevel")}` : shown.title}
          className="relative w-16 h-16 md:w-24 md:h-24 mt-2 md:mt-3 cursor-pointer disabled:cursor-default"
        >
          {levels.map((l, i) =>
            l.art ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={l.level}
                src={l.art}
                alt=""
                className="absolute inset-0 w-full h-full object-contain drop-shadow-md transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none"
                style={place(i - current)}
              />
            ) : (
              <span key={l.level} aria-hidden="true" className="absolute inset-0 rounded-full bg-gray-200 transition-[transform,opacity] duration-500 motion-reduce:transition-none" style={place(i - current)} />
            ),
          )}
        </button>
        {levels.length > 1 && (
          <div className="flex gap-1.5">
            <button type="button" onClick={() => show(current - 1)} className={STEP_BUTTON} aria-label={t("achievements.previousLevel")}>
              <ArrowRight className="rotate-90" />
            </button>
            <button type="button" onClick={() => show(current + 1)} className={STEP_BUTTON} aria-label={t("achievements.nextLevel")}>
              <ArrowRight className="-rotate-90" />
            </button>
          </div>
        )}
      </div>
      <div className="min-w-0">
        {children}
        {/* The levels, highest first, the one shown marked */}
        <ul className="mt-3 space-y-1.5 md:space-y-0.5"aria-label={t("achievements.byLevel")}>
          {levels
            .map((l, i) => ({ ...l, i }))
            .reverse()
            .map((l) => (
              <li key={l.level}>
                <button
                  type="button"
                  onClick={() => show(l.i)}
                  aria-current={l.i === current ? "true" : undefined}
                  className={`flex items-center gap-2 text-sm text-left cursor-pointer transition-colors duration-200 ${l.i === current ? "text-black" : "text-gray-500 hover:text-black"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {l.art ? <img src={l.art} alt="" className="w-6 h-6 object-contain shrink-0" /> : <span aria-hidden="true" className="w-6 h-6 shrink-0" />}
                  {/* The title and the number of players: on two lines on a phone, one from md up */}
                  <span className="flex flex-col md:flex-row md:gap-2">
                    <span className={l.i === current ? "underline decoration-1" : ""}>{l.title}</span>
                    <span className="font-mono">
                      <span className="hidden md:inline">· </span>
                      {l.players}
                    </span>
                  </span>
                </button>
              </li>
            ))}
        </ul>
      </div>
    </>
  );
}
