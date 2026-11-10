"use client";
// A dropdown of related pages (a season, a division), where a row of links would be too many: a button
// styled as the site's buttons (outlined, filled black on hover) showing the current page, opening a
// list of links in the style of the header's menu (the current one bold, with a check). Like the menu
// it closes on a link (the next page, opened where the visitor is, as in LinkTabs), Escape (focus
// back on the button) or a press outside it. Options with a group (a division's region) are listed
// under its heading, which sticks to the list's top while its options scroll by; each group's options
// With `onSelect` the options are buttons picking a value on the
// page instead (a team to show), and close the list.
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { CaretDown, Check } from "@/components/SVG";
import Link from "@/components/ui/Link";
import { BUTTON } from "@/components/ui/styles";

export interface LinkOption {
  key: string;
  /** The page's path without the language ("/team-matches/2025-26"); not with `onSelect` */
  href?: string;
  label: string;
  /** The heading it's listed under ("National", a region), its group's options next to each other */
  group?: string;
}

export default function LinkSelect({
  label,
  options,
  current,
  onSelect,
  className = "",
}: {
  label: string;
  options: LinkOption[];
  current: string;
  /** Options pick a value (their key) instead of linking to a page */
  onSelect?: (key: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const pathname = usePathname();
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  // Closed once the page changes (adjusted while rendering, not in an effect)
  if (open && openedAt !== pathname) setOpen(false);
  const selected = options.find((o) => o.key === current);

  useEffect(() => {
    if (!open) return;
    // The current option in view, for a long list
    list.current?.querySelector<HTMLElement>("[aria-current]")?.scrollIntoView({ block: "nearest" });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    const onPointer = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  // The options in runs of the same group (ungrouped ones too), in their order
  const groups = options.reduce<{ group?: string; options: LinkOption[] }[]>((runs, o) => {
    const last = runs.at(-1);
    if (last && last.group === o.group) last.options.push(o);
    else runs.push({ group: o.group, options: [o] });
    return runs;
  }, []);
  // An option; under a heading, scrolled into view below it (the heading's height)
  const item = (o: LinkOption, grouped: boolean) => {
    const className = `w-full flex items-center justify-between gap-4 px-4 py-2 text-left whitespace-nowrap transition-colors duration-200 hover:bg-gray-50 cursor-pointer ${grouped ? "scroll-mt-9" : ""} ${o.key === current ? "font-semibold" : "text-gray-700 hover:text-black"}`;
    const content = (
      <>
        {o.label}
        {o.key === current && <Check className="w-4 h-4" />}
      </>
    );
    return (
      <li key={o.key} className="border-b border-gray-100 last:border-0">
        {onSelect ? (
          <button
            type="button"
            onClick={() => {
              onSelect(o.key);
              setOpen(false);
              button.current?.focus();
            }}
            className={className}
            aria-current={o.key === current ? "true" : undefined}
          >
            {content}
          </button>
        ) : (
          <Link href={o.href ?? ""} scroll={false} onClick={() => setOpen(false)} className={className} aria-current={o.key === current ? "page" : undefined}>
            {content}
          </Link>
        )}
      </li>
    );
  };

  return (
    <div ref={root} className={`relative ${className}`}>
      <span id={`${id}-label`} className="block text-sm text-gray-600 mb-1">{label}</span>
      <button
        ref={button}
        type="button"
        onClick={() => {
          setOpen(!open);
          setOpenedAt(pathname);
        }}
        className={`w-full flex items-center justify-between gap-3 px-4 py-2 text-left ${BUTTON}`}
        aria-expanded={open}
        aria-controls={id}
        aria-labelledby={`${id}-label ${id}-value`}
      >
        <span id={`${id}-value`} className="truncate">{selected?.label}</span>
        <CaretDown className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <div
        id={id}
        inert={!open}
        className={`absolute left-0 top-[calc(100%+0.25rem)] z-30 min-w-full bg-white border border-gray-200 shadow-sm transition-[opacity,translate] duration-200 ${open ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}
      >
        {/* (No top padding with groups: a group's heading sticks to the very top, not below the padding) */}
        <ul ref={list} className={`max-h-80 overflow-y-auto ${groups.some((g) => g.group) ? "pb-1" : "py-1"}`} aria-labelledby={`${id}-label`}>
          {groups.flatMap(({ group, options: items }) =>
            group ? (
              // The group's heading stays at the top while its options scroll by, until the next one's pushes it off
              <li key={`group-${group}`} className="border-b border-gray-100 last:border-0">
                <span className="sticky top-0 z-10 block bg-white px-4 pt-3 pb-1 text-xs uppercase tracking-wide text-gray-500 border-b border-gray-100">{group}</span>
                <ul aria-label={group}>{items.map((o) => item(o, true))}</ul>
              </li>
            ) : (
              items.map((o) => item(o, false))
            ),
          )}
        </ul>
      </div>
    </div>
  );
}
