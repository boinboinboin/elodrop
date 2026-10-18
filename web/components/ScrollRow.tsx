"use client";

// A row of buttons that scrolls sideways when it doesn't fit (scrollbar hidden), starting scrolled so
// the current one (aria-current) is in view.
import { useEffect, useRef, type ReactNode } from "react";

export default function ScrollRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = row.current;
    const current = el?.querySelector<HTMLElement>("[aria-current]");
    if (!el || !current) return;
    // Only the row scrolls, not the page
    const overflow = current.offsetLeft + current.offsetWidth - (el.scrollLeft + el.clientWidth);
    if (overflow > 0) el.scrollLeft += overflow;
  }, []);
  return (
    <div ref={row} className={`flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}>
      {children}
    </div>
  );
}
