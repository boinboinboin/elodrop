"use client";

// A player's achievements as a row of small badges (art, and how many times when more than once),
// under their name. Clicking one opens a box below with every badge in full (its details rendered
// on the server: components/players/Achievements.tsx), with a pointer up to the badge clicked, which
// is scrolled into view; clicking it again, or the box's close button, closes it. Closed at first,
// so the page doesn't move until asked.
import { type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, Cross } from "@/components/SVG";
import Link from "@/components/ui/Link";
import { ICON_BUTTON, TEXT_LINK } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";

export interface BadgeStripItem {
  id: string;
  title: string;
  art: string | null;
  /** Times earned (0: given by hand) */
  count: number;
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

export default function BadgeStrip({ items }: { items: BadgeStripItem[] }) {
  const { t } = useI18n();
  const [open, setOpen] = useState<string | null>(null);
  const [pointer, setPointer] = useState<number | null>(null);
  const boxId = useId();
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const cards = useRef(new Map<string, HTMLLIElement>());
  // The pointer under the badge clicked: its middle, from the left of the row (the buttons' offset parent)
  useLayoutEffect(() => {
    const button = open ? buttons.current.get(open) : null;
    setPointer(button ? button.offsetLeft + button.offsetWidth / 2 : null);
  }, [open]);
  // That badge's card into view
  useEffect(() => {
    if (open) cards.current.get(open)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open]);

  return (
    <div className="relative mt-3">
      <ul className="flex flex-wrap gap-2" aria-label={t("players.achievements.title")}>
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
      {open && (
        <div id={boxId} className="relative bg-white mt-4 p-4 md:p-6 shadow-sm">
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
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {items.map((item) => (
              <li
                key={item.id}
                ref={(el) => {
                  if (el) cards.current.set(item.id, el);
                  else cards.current.delete(item.id);
                }}
                className="flex gap-4 scroll-mt-24"
              >
                <Art src={item.art} className="w-14 h-14" />
                <div className="min-w-0">
                  <p className="text-lg leading-snug">
                    {item.title}
                    {item.count > 1 && <TimesLabel count={item.count} className="ml-2 align-[0.15em]" />}
                  </p>
                  {item.details}
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 pt-4 border-t border-gray-100">
            <Link href="/achievements" className={TEXT_LINK}>{t("players.achievements.all")} <ArrowRight /></Link>
          </p>
        </div>
      )}
    </div>
  );
}
