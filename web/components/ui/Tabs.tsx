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
//
// Every panel is rendered (hidden ones too), and tells what's in it whether it's shown (useTabShown), so content can
// wait to load until its tab is opened (components/players/LazyMatchTable.tsx).
//
// With `swipe`, the panels lie side by side (Embla, as the Carousel): a swipe or drag sideways goes to the next or
// previous tab, following the finger, and picking a tab slides to its panel. The box is as tall as the panel shown.
// Panels not shown are inert (out of the tab order and hidden from screen readers) instead of hidden. Instead of the
// row of tab buttons, "‹ Quarter-finals ›": the tab shown named between arrows to the previous and next one, and a dot
// per tab under it (the tabs, as the Carousel's dots), which says the panels can be swiped through.
import useEmblaCarousel from "embla-carousel-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { createContext, Suspense, useContext, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { ArrowLeft, ArrowRight } from "@/components/SVG";
import Dots from "@/components/ui/Dots";
import { ICON_BUTTON } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";

const TabShown = createContext(true);
/** Whether the tab panel this is in, and every tab panel around that, is the one shown (true outside tabs) */
export const useTabShown = () => useContext(TabShown);

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
   * The tab list sticks to the top of the page (below the sticky header: --header-offset) while scrolling through
   * the panels, with a line under it while it's stuck; sticky table headers inside them stick below it
   * (--sticky-offset, the list's height)
   */
  sticky?: boolean;
  /** Swipe or drag sideways between the panels (as the bracket's rounds on a phone) */
  swipe?: boolean;
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
function TabsView({ tabs, label, id: prefix, className = "mb-8", small = false, sticky = false, swipe = false, index, onSelect }: Props & { index: number; onSelect: (i: number) => void }) {
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
  // Stuck: the marker just above the list has scrolled up under the header (its height on screen changes as it
  // slides away and back on phones, so this is checked as the page scrolls rather than with an observer's fixed edge)
  const marker = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const el = marker.current;
    if (!sticky || !el) return;
    const check = () => {
      const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-offset")) || 0;
      setStuck(el.getBoundingClientRect().top < header);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [sticky]);
  const elementId = (tab: string) => (prefix ? `${prefix}-${tab}` : tab);
  // Tabs inside a hidden panel are all hidden
  const shown = useTabShown();
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
      {sticky && <div ref={marker} aria-hidden="true" />}
      {swipe ? (
        <SwipeNav tabs={tabs} index={index} label={label} className={className} select={select} onKey={onKey} elementId={elementId} buttons={buttons} />
      ) : (
        <div
          ref={list}
          role="tablist"
          aria-label={label}
          // Sticky: on the page's background, reaching to the container's edges, the line under it
          // shown only while stuck (always there, transparent otherwise, so nothing shifts)
          className={`flex flex-wrap ${small ? "gap-1" : "gap-2"} ${sticky ? `sticky top-(--header-offset) z-20 bg-stone-100 -mx-4 px-4 py-2 border-b transition-[top,border-color] duration-200 ${stuck ? "border-gray-300" : "border-transparent"}` : ""} ${className}`}
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
      )}
      {swipe ? (
        <SwipePanels tabs={tabs} index={index} onSelect={onSelect} elementId={elementId} shown={shown} />
      ) : (
        tabs.map((t, i) => (
          <div key={t.id} id={elementId(t.id)} role="tabpanel" aria-labelledby={`tab-${elementId(t.id)}`} hidden={i !== index}>
            <TabShown.Provider value={shown && i === index}>{t.content}</TabShown.Provider>
          </div>
        ))
      )}
    </div>
  );
}

/** For swiped tabs (`swipe`): the tab shown between arrows to the previous and next one, and a dot per tab (the tabs) */
function SwipeNav({
  tabs,
  index,
  label,
  className,
  select,
  onKey,
  elementId,
  buttons,
}: {
  tabs: Tab[];
  index: number;
  label: string;
  className: string;
  select: (i: number, focus?: boolean) => void;
  onKey: (event: KeyboardEvent, current: number) => void;
  elementId: (tab: string) => string;
  buttons: RefObject<(HTMLButtonElement | null)[]>;
}) {
  const { t } = useI18n();
  // A tab's name for the dots' and arrows' labels (its label, or its place when the label isn't text)
  const name = (i: number) => (typeof tabs[i].label === "string" ? tabs[i].label : t("common.carousel.position", { position: i + 1, count: tabs.length }));
  const arrow = (to: number, key: "previous" | "next") => (
    <button
      type="button"
      onClick={() => select(to)}
      disabled={to < 0 || to >= tabs.length}
      className={`${ICON_BUTTON} shrink-0`}
      aria-label={to >= 0 && to < tabs.length ? `${t(`common.carousel.${key}`)}: ${name(to)}` : t(`common.carousel.${key}`)}
    >
      {key === "previous" ? <ArrowLeft /> : <ArrowRight />}
    </button>
  );
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      {arrow(index - 1, "previous")}
      <div className="min-w-0 flex flex-col items-center">
        {/* Said when it changes (a swipe moves to another tab without touching the dots) */}
        <p className="font-semibold text-center" aria-live="polite">
          {tabs[index].label}
        </p>
        <Dots
          role="tablist"
          aria-label={label}
          className="justify-center"
          count={tabs.length}
          current={index}
          onSelect={(i) => select(i)}
          button={(i) => ({
            ref: (el) => {
              buttons.current[i] = el;
            },
            role: "tab",
            id: `tab-${elementId(tabs[i].id)}`,
            "aria-controls": elementId(tabs[i].id),
            "aria-selected": i === index,
            "aria-label": name(i),
            title: name(i),
            tabIndex: i === index ? 0 : -1,
            onKeyDown: (e) => onKey(e, i),
          })}
        />
      </div>
      {arrow(index + 1, "next")}
    </div>
  );
}

/** The panels side by side, swiped through (`swipe`), the one shown at `index` */
function SwipePanels({ tabs, index, onSelect, elementId, shown }: { tabs: Tab[]; index: number; onSelect: (i: number) => void; elementId: (tab: string) => string; shown: boolean }) {
  // Starting at the panel shown first (read once: options that change would start the carousel again)
  const [start] = useState(index);
  const [viewport, api] = useEmblaCarousel({ align: "start", startIndex: start });
  // Swiped to a panel: its tab is selected (the latest onSelect, without subscribing again on every render)
  const select = useRef(onSelect);
  useEffect(() => {
    select.current = onSelect;
  });
  useEffect(() => {
    if (!api) return;
    const onSwipe = () => select.current(api.selectedScrollSnap());
    api.on("select", onSwipe);
    return () => void api.off("select", onSwipe);
  }, [api]);
  // A tab picked: its panel slides in
  useEffect(() => {
    if (api && api.selectedScrollSnap() !== index) api.scrollTo(index);
  }, [api, index]);
  // As tall as the panel shown (the others lie beside it, as tall as they are)
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const [height, setHeight] = useState<number>();
  useEffect(() => {
    const el = panels.current[index];
    if (!el) return;
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);
  return (
    <div ref={viewport} className="overflow-hidden transition-[height] duration-300 motion-reduce:transition-none" style={{ height }}>
      {/* The gap between panels while swiping: padding on the panels, taken back by the container's margin */}
      <div className="flex items-start -ml-4 touch-pan-y">
        {tabs.map((t, i) => (
          <div
            key={t.id}
            ref={(el) => {
              panels.current[i] = el;
            }}
            id={elementId(t.id)}
            role="tabpanel"
            aria-labelledby={`tab-${elementId(t.id)}`}
            inert={i !== index}
            className="min-w-0 shrink-0 basis-full pl-4"
          >
            <TabShown.Provider value={shown && i === index}>{t.content}</TabShown.Provider>
          </div>
        ))}
      </div>
    </div>
  );
}
