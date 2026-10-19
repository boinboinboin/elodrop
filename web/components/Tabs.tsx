"use client";

// Tabs: buttons (role="tab") that each show one panel. With `param`, the selected tab is kept in
// the URL query (?discipline=mixedDoubles, via nuqs), so a link can open a given tab; the first
// tab leaves the URL clean. Without it, the choice is just local state. Changing tabs neither
// scrolls, reloads the page nor adds to the history. Arrow keys, Home and End move between tabs.
//
// Reading the URL (useSearchParams, under nuqs) can't happen when a page is prerendered, and would
// make the whole page around it render in the browser only. So the URL-reading part has its own
// Suspense boundary: the prerendered HTML shows the first tab, and the browser then switches to the
// one in the URL.
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { Suspense, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

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
  /**
   * The tab list sticks to the top of the page while scrolling through the panels; sticky table
   * headers inside them stick below it (--sticky-offset, the list's height)
   */
  sticky?: boolean;
}

export default function Tabs(props: Props) {
  const { tabs, param } = props;
  if (tabs.length === 1) return <>{tabs[0].content}</>;
  if (!param) return <LocalTabs {...props} />;
  return (
    <Suspense fallback={<TabsView {...props} index={0} onSelect={() => {}} />}>
      <UrlTabs {...props} param={param} />
    </Suspense>
  );
}

function LocalTabs(props: Props) {
  const [index, setIndex] = useState(0);
  return <TabsView {...props} index={index} onSelect={setIndex} />;
}

function UrlTabs(props: Props & { param: string }) {
  const ids = props.tabs.map((t) => t.id);
  const [selected, setSelected] = useQueryState(
    props.param,
    parseAsStringLiteral(ids).withDefault(ids[0]).withOptions({ history: "replace", scroll: false, clearOnDefault: true }),
  );
  return <TabsView {...props} index={Math.max(0, ids.indexOf(selected))} onSelect={(i) => setSelected(ids[i])} />;
}

/** The tab list and panels, with tab `index` selected */
function TabsView({ tabs, label, id: prefix, className = "mb-8", small = false, sticky = false, index, onSelect }: Props & { index: number; onSelect: (i: number) => void }) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  // A sticky list's height, for the sticky table headers below it
  const list = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(0);
  useEffect(() => {
    const el = list.current;
    if (!sticky || !el) return;
    const observer = new ResizeObserver(() => setListHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [sticky]);
  const elementId = (tab: string) => (prefix ? `${prefix}-${tab}` : tab);
  const select = (i: number, focus = false) => {
    onSelect(i);
    if (focus) buttons.current[i]?.focus();
  };
  const onKey = (event: React.KeyboardEvent, current: number) => {
    const last = tabs.length - 1;
    const next = ({ ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: last } as Record<string, number>)[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select((next + last + 1) % (last + 1), true);
  };

  return (
    <div style={sticky ? ({ "--sticky-offset": `${listHeight}px` } as CSSProperties) : undefined}>
      <div
        ref={list}
        role="tablist"
        aria-label={label}
        // Sticky: on the page's background, reaching to the container's edges
        className={`flex flex-wrap ${small ? "gap-1" : "gap-2"} ${sticky ? "sticky top-0 z-20 bg-stone-100 -mx-4 px-4 py-2" : ""} ${className}`}
      >
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
