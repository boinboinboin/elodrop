"use client";

// An option switched on and off by a click, shown as a small square box ticked while on (the rankings' and a club's
// "show inactive players", EloStonk's "has an upcoming tournament"). CheckBox is the box alone, for a link that
// toggles by going to another page (the rankings' inactive list).
import type { ReactNode } from "react";
import { Check } from "@/components/SVG";

export function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span className={`shrink-0 w-4 h-4 border border-black inline-flex items-center justify-center ${checked ? "bg-black text-white" : "bg-white"}`} aria-hidden="true">
      {checked && <Check className="text-[0.75rem]" />}
    </span>
  );
}

export default function CheckToggle({ checked, onChange, children, className = "" }: { checked: boolean; onChange: (checked: boolean) => void; children: ReactNode; className?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`flex items-center gap-2 select-none cursor-pointer text-left ${className}`} role="checkbox" aria-checked={checked}>
      <CheckBox checked={checked} />
      {children}
    </button>
  );
}
