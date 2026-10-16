"use client";

// A player name field with suggestions (an ARIA combobox): typing searches /api/players/search
// and choosing a suggestion puts its id in the hidden field `name`. Typing again clears the id
// until a player is chosen. Arrow keys move through the suggestions, Enter chooses, Escape closes.
import { useEffect, useRef, useState } from "react";

interface Found {
  id: number;
  name: string;
  club: string | null;
}

export default function PlayerPicker({ name, label, initial }: { name: string; label: string; initial: { id: number; name: string } | null }) {
  const [query, setQuery] = useState(initial?.name ?? "");
  const [id, setId] = useState<number | null>(initial?.id ?? null);
  const [results, setResults] = useState<Found[] | null>(null);
  const [active, setActive] = useState(-1);
  const request = useRef(0);
  const listId = `player-${name}-list`;

  useEffect(() => {
    const q = query.trim();
    if (id !== null || q.length < 2) return;
    const req = ++request.current;
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/players/search?q=${encodeURIComponent(q)}`);
      if (!res.ok || req !== request.current) return;
      const found = (await res.json()) as Found[];
      setResults(found);
      setActive(found.length ? 0 : -1);
    }, 150);
    return () => clearTimeout(timer);
  }, [query, id]);

  const choose = (i: number) => {
    const p = results?.[i];
    if (!p) return;
    setQuery(p.name);
    setId(p.id);
    setResults(null);
  };
  const onKey = (event: React.KeyboardEvent) => {
    if (!results) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!results.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((a) => (a + step + results.length) % results.length);
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      choose(active);
    } else if (event.key === "Escape") setResults(null);
  };

  return (
    <div className="relative">
      <label htmlFor={`player-${name}`} className="block text-sm text-gray-600 mb-1">{label}</label>
      <input
        id={`player-${name}`}
        type="text"
        autoComplete="off"
        required
        placeholder="Search by name"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={!!results}
        aria-controls={listId}
        aria-activedescendant={results && active >= 0 ? `${listId}-${active}` : undefined}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setId(null);
          if (e.target.value.trim().length < 2) setResults(null);
        }}
        onKeyDown={onKey}
        onBlur={() => setResults(null)}
        className="w-full px-3 py-2 border border-black bg-white"
      />
      <input type="hidden" name={name} value={id ?? ""} />
      <ul id={listId} role="listbox" hidden={!results} className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-300 shadow-sm max-h-80 overflow-y-auto">
        {results?.map((p, i) => (
          <li
            key={p.id}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            // mousedown, not click: it comes before the input's blur closes the list
            onMouseDown={(e) => {
              e.preventDefault();
              choose(i);
            }}
            className="px-3 py-2 cursor-pointer aria-selected:bg-gray-100"
          >
            {p.name}
            <span className="block text-sm text-gray-600">{p.club ?? ""}</span>
          </li>
        ))}
        {results && !results.length && <li className="px-3 py-2 text-gray-600">No players found</li>}
      </ul>
    </div>
  );
}
