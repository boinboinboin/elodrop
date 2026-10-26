// The building blocks of /how-it-works: a numbered part of the page in its own colour, the details
// for nerds under it (shown with the switch on), and a formula.
import type { ReactNode } from "react";
import { NerdOnly } from "@/components/how-it-works/NerdMode";
import { t } from "@/messages/i18n";

/** A part of the page: its number in its colour, its heading and the plain text, then anything else */
export function Part({ id, number, color, title, children }: { id: string; number: number; color: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 xl:scroll-mt-8">
      <div className="flex items-baseline gap-3 mb-4">
        <span aria-hidden="true" className="font-mono text-sm font-semibold" style={{ color }}>{String(number).padStart(2, "0")}</span>
        <h2 id={`${id}-title`} className="text-3xl">{title}</h2>
      </div>
      <div className="grid gap-4 text-lg max-w-3xl [&_strong]:font-semibold">{children}</div>
    </section>
  );
}

/** The details for nerds: a box with the part's colour along its side, opened by the switch */
export function Nerdy({ color, children }: { color: string; children: ReactNode }) {
  return (
    <NerdOnly>
      <div className="bg-white border-l-4 p-4 sm:p-5 md:p-6 text-base grid gap-3 mt-1" style={{ borderColor: color }}>
        <p className="font-mono text-xs uppercase tracking-widest text-gray-600">{t("howItWorks.nerd.badge")}</p>
        {children}
      </div>
    </NerdOnly>
  );
}

/**
 * A formula on a line of its own. On phones it wraps at its spaces (between the terms) rather than
 * running off the side; from sm it keeps to one line, scrolling sideways if it must.
 */
export const Formula = ({ children }: { children: ReactNode }) => (
  <div className="overflow-x-auto bg-gray-50 px-3 sm:px-4 py-3">
    <p className="font-mono text-sm sm:text-[0.95rem] leading-relaxed sm:whitespace-nowrap [&_sub]:text-[0.7em] [&_sup]:text-[0.7em]">{children}</p>
  </div>
);
