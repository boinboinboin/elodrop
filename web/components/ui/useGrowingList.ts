// How many rows of a long table to render: the first ROWS, and ROWS more whenever the end comes
// near (well before it's in view), so a list of 2,000 players isn't rendered and hydrated at once.
// Back to the first ROWS when `reset` changes (a new search or sort). Put `sentinel` on an element
// after the rows, rendered while there are more (limit < total).
import { useEffect, useRef, useState } from "react";

const ROWS = 100;

export function useGrowingList(total: number, reset: string) {
  const [limit, setLimit] = useState(ROWS);
  // Reset while rendering, not in an effect, so the long list isn't rendered once first
  const [lastReset, setLastReset] = useState(reset);
  if (reset !== lastReset) {
    setLastReset(reset);
    setLimit(ROWS);
  }
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = sentinel.current;
    if (!element || limit >= total) return;
    // Observed again after each step, so a sentinel still near the view adds the next ROWS too
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setLimit((l) => l + ROWS), { rootMargin: "0px 0px 2000px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, [limit, total]);

  return { limit, sentinel };
}
