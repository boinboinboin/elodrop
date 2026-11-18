"use client";

// A list's search field (the rankings, a club's players, team matches, EloStonk's players): underlined, with the
// search icon and the site's clear button, full width on phones and 20rem from sm.
import { Search } from "@/components/SVG";
import ClearButton from "@/components/ui/ClearButton";

export default function SearchField({ label, value, onChange, className = "w-full sm:w-80" }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <label className={`flex items-center gap-2 border-b border-gray-300 focus-within:border-black transition-colors ${className}`}>
      <span className="sr-only">{label}</span>
      <Search className="text-xl text-gray-400" />
      <input type="search" placeholder={label} value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 min-w-0 py-2 bg-transparent outline-none" />
      <ClearButton show={!!value} onClear={() => onChange("")} />
    </label>
  );
}
