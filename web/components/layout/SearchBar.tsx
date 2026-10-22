"use client";

// The search bar on every page (an ARIA combobox): typing searches /api/search, which returns
// { players, clubs, tournaments, eliteserien }, each [{ name, detail?, club?, url, logo? }], and
// lists the results in groups. Choosing one (click, or arrow keys and Enter) opens its page;
// Enter without moving opens the first result. Escape closes the list.
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { startNavigationProgress } from "@/components/layout/NavigationProgress";
import { t } from "@/messages/i18n";

interface Result {
  name: string;
  detail?: string;
  club?: string | null;
  url: string;
  logo?: string | null;
}
const GROUPS = { players: t("layout.search.groups.players"), clubs: t("layout.search.groups.clubs"), tournaments: t("layout.search.groups.tournaments"), eliteserien: t("layout.search.groups.eliteserien") } as const;
type Found = Partial<Record<keyof typeof GROUPS, Result[]>>;

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  const [active, setActive] = useState(-1);
  const request = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const id = ++request.current;
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!res.ok || id !== request.current) return;
      const data = (await res.json()) as Found;
      setFound(data);
      setActive(Object.values(data).some((g) => g?.length) ? 0 : -1);
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  const open = query.trim().length >= 2 && found !== null;
  const groups = (Object.keys(GROUPS) as (keyof typeof GROUPS)[]).map((key) => ({ key, label: GROUPS[key], items: found?.[key] ?? [] })).filter((g) => g.items.length);
  const results = groups.flatMap((g) => g.items);
  const go = (i: number) => {
    const r = results[i];
    if (!r) return;
    setFound(null);
    setQuery("");
    startNavigationProgress();
    router.push(r.url);
  };
  const onKey = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") return setFound(null);
    if (!open || !results.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((a) => (a + step + results.length) % results.length);
    }
  };

  let index = 0;
  return (
    <form
      role="search"
      className="relative max-w-md ml-auto w-full"
      onSubmit={(e) => {
        e.preventDefault();
        if (active >= 0) go(active);
      }}
    >
      <label htmlFor="site-search" className="sr-only">{t("layout.search.label")}</label>
      <input
        id="site-search"
        type="search"
        autoComplete="off"
        placeholder={t("layout.search.label")}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="site-search-list"
        aria-activedescendant={open && active >= 0 ? `site-search-${active}` : undefined}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKey}
        onBlur={() => setFound(null)}
        className="w-full px-3 py-2 border border-black bg-white"
      />
      <ul id="site-search-list" role="listbox" aria-label={t("layout.search.results")} hidden={!open} className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-300 shadow-sm max-h-96 overflow-y-auto pb-1">
        {groups.map((g) => [
          <li key={g.key} role="presentation" className="px-3 pt-3 pb-1 text-xs uppercase tracking-wide text-gray-500">{g.label}</li>,
          ...g.items.map((item) => {
            const i = index++;
            return (
              <li
                key={`${g.key}-${item.url}`}
                id={`site-search-${i}`}
                role="option"
                aria-selected={i === active}
                // mousedown, not click: it comes before the input's blur closes the list
                onMouseDown={(e) => {
                  e.preventDefault();
                  go(i);
                }}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer aria-selected:bg-gray-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {item.logo && <img src={item.logo} alt="" className="w-5 h-5 object-contain shrink-0" />}
                <span>
                  {item.name}
                  <span className="block text-sm text-gray-600">{item.detail ?? item.club ?? ""}</span>
                </span>
              </li>
            );
          }),
        ])}
        {open && !results.length && <li className="px-3 py-2 text-gray-600">{t("layout.search.nothing")}</li>}
      </ul>
    </form>
  );
}
