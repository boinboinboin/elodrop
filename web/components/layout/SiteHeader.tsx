"use client";

// The site's header (app/[lang]/(site)/layout.tsx gives it the logo, links, search and menu), sticky at the top of the
// page. On phones (below md) it slides away while the page scrolls down and comes back as soon as it scrolls up
// (never while the menu or the search is open, nor near the top), and the search is folded away behind a button
// beside the menu's, opening on its own line. From md the header always stays, the search beside the logo. Where the
// site can be installed as an app, a download button comes first among the buttons (InstallApp).
//
// Its height on screen (0 while it's away) is --header-offset on <html>, for everything else that sticks to the top
// (table headings, tabs, day headings: "top-(--header-offset)"), so it sticks just under the header and slides with
// it. Until this runs, app/globals.css sets the header's usual height.
import { type ReactNode, useEffect, useRef, useState } from "react";
import InstallApp from "@/components/layout/InstallApp";
import { Cross, Search } from "@/components/SVG";
import { BUTTON } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";

/** Scrolling less than this (px) between two scroll events doesn't show or hide the header (a finger's jitter) */
const JITTER = 6;
const PHONE = "(max-width: 767.98px)";

export default function SiteHeader({ logo, nav, search, menu }: { logo: ReactNode; nav: ReactNode; search: ReactNode; menu: ReactNode }) {
  const { t } = useI18n();
  const header = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const [away, setAway] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const el = header.current;
    if (!el) return;
    const root = document.documentElement;
    const phone = window.matchMedia(PHONE);
    let height = el.offsetHeight;
    let hidden = false;
    let last = window.scrollY;
    const publish = () => root.style.setProperty("--header-offset", `${hidden ? 0 : height}px`);
    const set = (value: boolean) => {
      if (value === hidden) return;
      hidden = value;
      setAway(value);
      publish();
    };
    const resize = new ResizeObserver(() => {
      height = el.offsetHeight;
      publish();
    });
    resize.observe(el);
    const onScroll = () => {
      const y = window.scrollY;
      const moved = y - last;
      if (Math.abs(moved) < JITTER) return;
      last = y;
      // Kept while something in it is open: the menu, the search's results or the search itself on phones
      const busy = !!el.querySelector('[aria-expanded="true"]') || (el.contains(document.activeElement) && document.activeElement?.tagName === "INPUT");
      set(phone.matches && moved > 0 && y > height && !busy);
    };
    const onPhoneChange = () => set(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    phone.addEventListener("change", onPhoneChange);
    publish();
    return () => {
      resize.disconnect();
      window.removeEventListener("scroll", onScroll);
      phone.removeEventListener("change", onPhoneChange);
      root.style.removeProperty("--header-offset");
    };
  }, []);

  // Opened: straight into the search field
  useEffect(() => {
    if (searching) header.current?.querySelector<HTMLInputElement>("#site-search")?.focus();
  }, [searching]);

  return (
    <header
      ref={header}
      className={`sticky top-0 z-40 bg-white border-b border-gray-200 transition-transform duration-200 motion-reduce:transition-none ${away ? "-translate-y-full" : ""}`}
    >
      <div className="base-container px-4 py-3 md:py-4 flex flex-wrap md:flex-nowrap items-center gap-x-6 gap-y-3">
        {logo}
        {nav}
        <div
          // Phones: its own line, shown when opened; from md beside the logo, always
          className={`order-last w-full md:order-none md:w-auto md:flex-1 md:min-w-0 ${searching ? "" : "max-md:hidden"}`}
          // A result opened (the search bar has gone to its page: a result pressed, or Enter with results listed) folds
          // the search away again; so does Escape with the results closed (the search bar closes them first). It
          // doesn't read the page's address for this: that would make every page wait for it.
          onMouseDown={(e) => {
            if ((e.target as Element).closest('[role="option"]')) setSearching(false);
          }}
          onKeyDown={(e) => {
            const listed = !!header.current?.querySelector('#site-search[aria-expanded="true"]');
            if (e.key === "Enter" && listed) setSearching(false);
            if (e.key === "Escape" && !listed) {
              setSearching(false);
              toggle.current?.focus();
            }
          }}
        >
          {search}
        </div>
        <div className="ml-auto md:ml-0 flex gap-2">
          <InstallApp icon />
          <button
            ref={toggle}
            type="button"
            onClick={() => setSearching(!searching)}
            aria-expanded={searching}
            aria-controls="site-search"
            aria-label={t(searching ? "layout.search.close" : "layout.search.open")}
            title={t(searching ? "layout.search.close" : "layout.search.open")}
            className={`md:hidden w-[42px] h-[42px] inline-flex items-center justify-center ${BUTTON} ${searching ? "bg-black text-white" : ""}`}
          >
            {searching ? <Cross className="text-xl" /> : <Search className="text-xl" />}
          </button>
          {menu}
        </div>
      </div>
    </header>
  );
}
