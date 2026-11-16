"use client";

// A player's achievements as a row of small badges (art, and how many times when more than once),
// under their name. Clicking one opens a box below (its details rendered on the server:
// components/players/Achievements.tsx), with a pointer up to the badge clicked: that badge first, in
// full across the box with how rare it is, then the others, the rarest first. Clicking another badge
// puts it first; clicking it again, or the box's close button, closes the box. A "Show details" button beside the
// badges opens it too (on the first badge), so it's plain that they open. Closed at first, so
// the page doesn't move until asked. How rare each badge is comes from app/api/achievement-stats, loaded here, so
// the page doesn't depend on achievements.json (which changes with every run).
import { type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, ChevronRight, Cross } from "@/components/SVG";
import Link from "@/components/ui/Link";
import { BUTTON, ICON_BUTTON, TEXT_LINK } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";
import { badgeHolders, type RarityOf, type RarityStats } from "@/utils/achievements";

let request: Promise<RarityStats | null> | null = null;
/** The badges' numbers, one request per visit */
const loadStats = () =>
  (request ??= fetch("/api/achievement-stats")
    .then((res) => (res.ok ? (res.json() as Promise<RarityStats>) : null))
    .catch(() => {
      request = null;
      return null;
    }));

export interface BadgeStripItem {
  id: string;
  title: string;
  art: string | null;
  /** Times earned (0: given by hand) */
  count: number;
  /** What its rarity is counted from (at the player's level, for a milestone) */
  rarityOf: RarityOf;
  details: ReactNode;
}

/** How many times, as a small outlined label: "×3" */
export function TimesLabel({ count, className = "" }: { count: number; className?: string }) {
  return <span className={`inline-block font-mono text-[11px] leading-none tabular-nums px-1 py-[3px] bg-white text-black border border-black rounded-full ${className}`}>×{count}</span>;
}

function Art({ src, className }: { src: string | null; className: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="" className={`${className} object-contain shrink-0`} /> : <span aria-hidden="true" className={`${className} shrink-0 rounded-full bg-gray-200`} />;
}

export default function BadgeStrip({ items: given }: { items: BadgeStripItem[] }) {
  const { t, plural, num, pct } = useI18n();
  const [stats, setStats] = useState<RarityStats | null>(null);
  useEffect(() => {
    let live = true;
    loadStats().then((value) => live && setStats(value));
    return () => {
      live = false;
    };
  }, []);
  // How many players have each one, and "Held by 28 players (0.2%)"
  const items = given.map((item) => {
    const holders = badgeHolders(item.rarityOf, stats);
    const share = holders !== null && stats?.players ? holders / stats.players : null;
    const rarity =
      holders === null
        ? null
        : t("players.achievements.rarity", {
            rarity: `${plural("achievements.players", holders, { count: num(holders) })}${share !== null ? ` (${share > 0 && share < 0.001 ? `<${pct(0.001, 1)}` : pct(share, 1)})` : ""}`,
          });
    return { ...item, holders, rarity };
  });
  const [open, setOpen] = useState<string | null>(null);
  const [pointer, setPointer] = useState<number | null>(null);
  const boxId = useId();
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const box = useRef<HTMLDivElement>(null);
  // The pointer under the badge clicked: its middle, from the left of the row (the buttons' offset parent)
  useLayoutEffect(() => {
    const button = open ? buttons.current.get(open) : null;
    setPointer(button ? button.offsetLeft + button.offsetWidth / 2 : null);
  }, [open]);
  // The box's top (the badge clicked) into view
  useEffect(() => {
    if (open) box.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open]);
  const featured = items.find((item) => item.id === open);
  // The others, the rarest first (fewest players; not known last), else in the row's order
  const others = items.filter((item) => item !== featured).sort((a, b) => (a.holders ?? Infinity) - (b.holders ?? Infinity));

  return (
    <div className="relative mt-3">
      {/* The badges, then the details button: under them on phones, beside them from sm up (at the top, by the
          first row, however many rows the badges take, so more badges never move it) */}
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:gap-4">
        <ul className="flex flex-wrap gap-2 min-w-0" aria-label={t("players.achievements.title")}>
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                ref={(el) => {
                  if (el) buttons.current.set(item.id, el);
                  else buttons.current.delete(item.id);
                }}
                onClick={() => setOpen(open === item.id ? null : item.id)}
                aria-expanded={open === item.id}
                aria-controls={boxId}
                title={item.title}
                aria-label={item.count > 1 ? `${item.title} ×${item.count}` : item.title}
                className={`relative w-11 h-11 inline-flex items-center justify-center cursor-pointer transition-transform duration-200 hover:-translate-y-0.5 ${open === item.id ? "-translate-y-0.5" : ""}`}
              >
                <Art src={item.art} className="w-11 h-11" />
                {item.count > 1 && <TimesLabel count={item.count} className="absolute -right-1.5 -bottom-1" />}
              </button>
            </li>
          ))}
        </ul>
        {/* Said in words too: many didn't see that the badges open. Opens on the first badge, as clicking it would.
            As the site's buttons (filled black while the box is open), in the box heading's small mono capitals;
            from sm up level with the badges' middle (44px high, the button 32px) */}
        <button
          type="button"
          onClick={() => setOpen(open ? null : items[0].id)}
          aria-expanded={!!open}
          aria-controls={boxId}
          className={`group shrink-0 sm:mt-1.5 inline-flex items-center gap-1.5 h-8 pl-3 pr-2 font-mono text-[11px] uppercase tracking-widest whitespace-nowrap ${BUTTON} ${open ? "bg-black text-white" : ""}`}
        >
          {t(open ? "players.achievements.hide" : "players.achievements.show")}
          <ChevronRight className={`text-sm transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${open ? "rotate-90" : "group-hover:translate-x-0.5"}`} />
        </button>
      </div>
      {open && (
        <div id={boxId} ref={box} className="relative bg-white mt-4 p-4 md:p-6 shadow-sm scroll-mt-24">
          {/* The pointer up to the badge clicked */}
          {pointer !== null && <span aria-hidden="true" className="absolute -top-1.5 w-3 h-3 bg-white rotate-45" style={{ left: pointer - 6 }} />}
          <div className="flex items-center justify-between gap-4 mb-5">
            <h2 className="font-mono text-xs uppercase tracking-widest text-gray-600">
              {t("players.achievements.title")} · {items.length}
            </h2>
            <button type="button" onClick={() => setOpen(null)} aria-label={t("players.achievements.close")} title={t("players.achievements.close")} className={`${ICON_BUTTON} shrink-0`}>
              <Cross className="text-xl" />
            </button>
          </div>
          {featured && (
            <div className="flex gap-4 md:gap-6">
              <Art src={featured.art} className="w-20 h-20 md:w-24 md:h-24" />
              <div className="min-w-0">
                <p className="text-2xl leading-snug">
                  {featured.title}
                  {featured.count > 1 && <TimesLabel count={featured.count} className="ml-2 align-[0.3em]" />}
                </p>
                {featured.rarity && <p className="font-mono text-sm text-gray-600 mt-1">{featured.rarity}</p>}
                {featured.details}
              </div>
            </div>
          )}
          {others.length > 0 && (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mt-6 pt-6 border-t border-gray-100">
              {others.map((item) => (
                <li key={item.id} className="flex gap-4">
                  <Art src={item.art} className="w-14 h-14" />
                  <div className="min-w-0">
                    <p className="text-lg leading-snug">
                      {item.title}
                      {item.count > 1 && <TimesLabel count={item.count} className="ml-2 align-[0.15em]" />}
                    </p>
                    {item.rarity && <p className="font-mono text-xs text-gray-600 mt-0.5">{item.rarity}</p>}
                    {item.details}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-6 pt-4 border-t border-gray-100">
            <Link href="/achievements" className={TEXT_LINK}>{t("players.achievements.all")} <ArrowRight /></Link>
          </p>
        </div>
      )}
    </div>
  );
}
