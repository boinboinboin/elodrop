"use client";

// Tabs: buttons (role="tab") that each show one panel. With `param`, the selected tab is kept in
// the URL query (?discipline=mixedDoubles, via nuqs), so a link can open a given tab; the first
// tab leaves the URL clean. Without it, the choice is just local state. Changing tabs neither
// scrolls, reloads the page nor adds to the history. Arrow keys, Home and End move between tabs.
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useRef, useState, type ReactNode } from "react";

export interface Tab {
  /** The tab's value in the URL (and, with the Tabs' `id`, its element ids) */
  id: string;
  label: ReactNode;
  content: ReactNode;
}

const buttonClass = "border border-black transition-colors duration-200 hover:bg-black hover:text-white aria-selected:bg-black aria-selected:text-white cursor-pointer";

interface Props {
  tabs: Tab[];
  label: string;
  /** The query parameter that keeps the selected tab, e.g. "discipline" */
  param?: string;
  /** Prefix for the element ids, when tabs with the same ids appear more than once on a page */
  id?: string;
  /** Classes of the tab list (spacing) */
  className?: string;
  /** Smaller buttons, for tabs inside a box */
  small?: boolean;
}

export default function Tabs({ tabs, label, param, id: prefix, className = "mb-8", small = false }: Props) {
  const ids = tabs.map((t) => t.id);
  const [fromUrl, setUrl] = useQueryState(
    param ?? "",
    parseAsStringLiteral(ids).withDefault(ids[0]).withOptions({ history: "replace", scroll: false, clearOnDefault: true }),
  );
  const [local, setLocal] = useState(ids[0]);
  const selected = param ? fromUrl : local;
  const index = Math.max(0, ids.indexOf(selected));
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const elementId = (tab: string) => (prefix ? `${prefix}-${tab}` : tab);

  const select = (i: number, focus = false) => {
    if (param) setUrl(ids[i]);
    else setLocal(ids[i]);
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
            id={`tab-${elementId(t.id)}`}
            aria-controls={elementId(t.id)}
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
        <div key={t.id} id={elementId(t.id)} role="tabpanel" aria-labelledby={`tab-${elementId(t.id)}`} hidden={i !== index}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
