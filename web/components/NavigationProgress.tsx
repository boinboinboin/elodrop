"use client";

// A thin bar along the top of the page while a navigation loads, so a tap visibly did something.
// It starts on a click on a link to another page of the site (or with startNavigationProgress, for
// navigations in code), creeps towards the end while the page loads, and fills and fades once the
// new URL is in place. Only shown if the navigation takes more than a moment (no flash when it's
// instant). Styled directly, without re-rendering; the movement is transforms and opacity only.
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const DELAY_MS = 100; // shown only for navigations slower than this
const GIVE_UP_MS = 15_000; // hidden anyway if the navigation never completes (e.g. it failed)

let bar: HTMLDivElement | null = null;
let running = false;
let timers: number[] = [];
const clear = () => {
  timers.forEach(clearTimeout);
  timers = [];
};
const set = (transform: string, transition: string, opacity = "1") => {
  if (!bar) return;
  bar.style.transition = transition;
  bar.style.transform = transform;
  bar.style.opacity = opacity;
};

/** Start the bar (link clicks start it on their own) */
export function startNavigationProgress() {
  if (running || !bar) return;
  running = true;
  clear();
  set("scaleX(0)", "none", "0");
  timers.push(
    window.setTimeout(() => {
      // Jump to a sliver at once, then creep towards 90% (slowing down, never quite getting there)
      set("scaleX(0.2)", "transform 0.2s ease-out, opacity 0.1s");
      timers.push(window.setTimeout(() => set("scaleX(0.9)", "transform 8s cubic-bezier(0.1, 0.6, 0.3, 1)"), 200));
    }, DELAY_MS),
    window.setTimeout(done, GIVE_UP_MS),
  );
}

function done() {
  if (!running) return;
  running = false;
  clear();
  // Never shown (fast navigation): nothing to finish
  if (!bar || bar.style.opacity === "0") return set("scaleX(0)", "none", "0");
  set("scaleX(1)", "transform 0.2s ease-out");
  timers.push(window.setTimeout(() => set("scaleX(1)", "opacity 0.3s ease-out", "0"), 200));
}

// A plain left click on a link to another page of this site (not a new tab, a download or a jump
// within the page)
function isNavigation(e: MouseEvent) {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  const a = (e.target as Element | null)?.closest?.("a[href]");
  if (!(a instanceof HTMLAnchorElement) || a.hasAttribute("download") || (a.target && a.target !== "_self")) return false;
  const url = new URL(a.href, location.href);
  return url.origin === location.origin && url.pathname + url.search !== location.pathname + location.search;
}

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // The new page's URL is in place: done
  useEffect(done, [pathname, searchParams]);

  useEffect(() => {
    // Capture: Next.js's links stop the browser's own navigation, but the click still comes through here first
    const onClick = (e: MouseEvent) => isNavigation(e) && startNavigationProgress();
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", done);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", done);
    };
  }, []);

  return (
    <div
      ref={(el) => {
        bar = el;
      }}
      aria-hidden="true"
      className="fixed top-0 inset-x-0 z-50 h-0.5 bg-black origin-left pointer-events-none motion-reduce:transition-none!"
      style={{ transform: "scaleX(0)", opacity: 0 }}
    />
  );
}
