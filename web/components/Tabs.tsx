"use client";

// Tabs: buttons (role="tab") that each show one panel. The selected tab is kept in the URL hash
// (the panel's id), so a link can open a given tab, unless `hash` is false (for tabs inside tabs).
// Arrow keys, Home and End move between tabs.
import { useEffect, useRef, useState, type ReactNode } from "react";

export interface Tab {
  id: string;
  label: ReactNode;
  content: ReactNode;
}

const buttonClass = "border border-black transition-colors duration-200 hover:bg-black hover:text-white aria-selected:bg-black aria-selected:text-white cursor-pointer";

interface Props {
  tabs: Tab[];
  /** Keep the selected tab in the URL hash */
  hash?: boolean;
  label: string;
  /** Classes of the tab list (spacing) */
  className?: string;
  /** Smaller buttons, for tabs inside a box */
  small?: boolean;
}

export default function Tabs({ tabs, hash = true, label, className = "mb-8", small = false }: Props) {
  const [index, setIndex] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!hash) return;
    const fromHash = tabs.findIndex((t) => `#${t.id}` === window.location.hash);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the URL hash once on mount
    if (fromHash > 0) setIndex(fromHash);
  }, [hash, tabs]);

  const select = (i: number, focus = false) => {
    setIndex(i);
    if (hash) history.replaceState(null, "", `#${tabs[i].id}`);
    if (focus) buttons.current[i]?.focus();
  };
  const onKey = (event: React.KeyboardEvent, current: number) => {
    const last = tabs.length - 1;
    const next = ({ ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: last } as Record<string, number>)[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select((next + last + 1) % (last + 1), true);
  };

  if (tabs.length === 1) return <>{tabs[0].content}</>;
  return (
    <div>
      <div role="tablist" aria-label={label} className={`flex flex-wrap ${small ? "gap-1" : "gap-2"} ${className}`}>
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-controls={t.id}
            aria-selected={i === index}
            tabIndex={i === index ? 0 : -1}
            onClick={() => select(i)}
            onKeyDown={(e) => onKey(e, i)}
            className={`${buttonClass} ${small ? "px-3 py-1 text-sm" : "px-4 py-2"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div key={t.id} id={t.id} role="tabpanel" aria-labelledby={`tab-${t.id}`} hidden={i !== index}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
