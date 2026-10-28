"use client";

// The search bar on every page (an ARIA combobox): typing searches the site's search index in the
// browser (utils/search.ts; loaded on first focus) for players, clubs, tournaments and Eliteserien
// pages, and lists the results in groups. Choosing one (click, or arrow keys and Enter) opens its page;
// Enter without moving opens the first result. Escape closes the list.
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "@/components/SVG";
import { startNavigationProgress } from "@/components/layout/NavigationProgress";
import ClearButton from "@/components/ui/ClearButton";
import { useI18n } from "@/messages/client";
import { logoSrc } from "@/utils/clubs";
import { loadSearchIndex, searchSite } from "@/utils/search";

interface Result {
  name: string;
  detail?: string;
  club?: string | null;
  url: string;
  logo?: string | null;
}
type Group = "players" | "clubs" | "tournaments" | "eliteserien";
type Found = Partial<Record<Group, Result[]>>;

export default function SearchBar() {
  const router = useRouter();
  const { t, lang, href } = useI18n();
  const GROUPS: Record<Group, string> = { players: t("layout.search.groups.players"), clubs: t("layout.search.groups.clubs"), tournaments: t("layout.search.groups.tournaments"), eliteserien: t("layout.search.groups.eliteserien") };
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  const [active, setActive] = useState(-1);
  const request = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const id = ++request.current;
    // Instant once the index is loaded; the first search waits for it
    loadSearchIndex(lang)
      .then((index) => {
        if (id !== request.current) return;
        const data: Found = searchSite(index, q);
        setFound(data);
        setActive(Object.values(data).some((g) => g?.length) ? 0 : -1);
      })
      .catch(() => {});
  }, [query, lang]);

  const open = query.trim().length >= 2 && found !== null;
  const groups = (Object.keys(GROUPS) as Group[]).map((key) => ({ key, label: GROUPS[key], items: found?.[key] ?? [] })).filter((g) => g.items.length);
  const results = groups.flatMap((g) => g.items);
  const go = (i: number) => {
    const r = results[i];
    if (!r) return;
    setFound(null);
    setQuery("");
    startNavigationProgress();
    router.push(href(r.url));
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
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-xl text-gray-400 pointer-events-none" />
        <input
          id="site-search"
          type="search"
          autoComplete="off"
          placeholder={t("layout.search.placeholder")}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="site-search-list"
          aria-activedescendant={open && active >= 0 ? `site-search-${active}` : undefined}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          onFocus={() => loadSearchIndex(lang).catch(() => {})}
          onBlur={() => setFound(null)}
          // Room on the right only for the clear button, so the placeholder has the whole width
          className={`w-full pl-10 ${query ? "pr-10" : "pr-3"} py-2 border border-black bg-white`}
        />
        <ClearButton
          show={query !== ""}
          onClear={() => {
            setQuery("");
            setFound(null);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2"
        />
      </div>
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
                {item.logo && <img src={logoSrc(item.logo, 5)} alt="" className="w-5 h-5 object-contain shrink-0" />}
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
