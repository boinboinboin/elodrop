"use client";

// The "I'm a big nerd" switch on /how-it-works: off, the page explains the ratings in plain words;
// on, the details (formulas, parameters, how each rule was tested) open under each part. The choice
// is kept in the URL (?nerd=1), so a link can open the page with the details, and read from it as
// ThemePicker reads the theme: the server renders the plain page, the browser then switches.
import { type ReactNode, useSyncExternalStore } from "react";
import { t } from "@/messages/i18n";

const PARAM = "nerd";
const EVENT = "elodrop:nerd";

const subscribe = (onChange: () => void) => {
  window.addEventListener("popstate", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(EVENT, onChange);
  };
};
const current = () => new URLSearchParams(window.location.search).get(PARAM) === "1";

function setNerd(on: boolean) {
  const url = new URL(window.location.href);
  if (on) url.searchParams.set(PARAM, "1");
  else url.searchParams.delete(PARAM);
  // Replaces the URL without a navigation (Next.js keeps its router in step with it)
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new Event(EVENT));
}

/** Whether the details are on */
export const useNerd = () => useSyncExternalStore(subscribe, current, () => false);

/** The switch: a track whose knob slides over, filled black when on */
export function NerdSwitch() {
  const nerd = useNerd();
  return (
    <button type="button" role="switch" aria-checked={nerd} onClick={() => setNerd(!nerd)} className="group flex items-center gap-3 text-left cursor-pointer">
      <span aria-hidden="true" className={`relative shrink-0 w-14 h-8 border border-black transition-colors duration-200 ${nerd ? "bg-black" : "bg-white group-hover:bg-gray-100"}`}>
        <span className={`absolute top-1 left-1 w-[22px] h-[22px] transition-[translate,background-color] duration-200 motion-reduce:transition-none ${nerd ? "translate-x-6 bg-accent" : "bg-black"}`} />
      </span>
      <span>
        <span className="block font-semibold">{t("howItWorks.nerd.label")}</span>
        <span className="block text-sm text-gray-600">{t(nerd ? "howItWorks.nerd.on" : "howItWorks.nerd.off")}</span>
      </span>
    </button>
  );
}

/** Content shown only with the details on: it opens and closes smoothly, and is out of reach while closed */
export function NerdOnly({ children }: { children: ReactNode }) {
  const nerd = useNerd();
  return (
    <div
      inert={!nerd}
      className={`grid transition-[grid-template-rows,opacity] duration-300 motion-reduce:transition-none ${nerd ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}
