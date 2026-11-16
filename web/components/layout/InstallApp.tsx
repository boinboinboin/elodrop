"use client";

// "Install the app" (utils/install.ts): where the browser offers to install the site (Chrome, Edge, Android), a button
// that opens its install dialog; on iPhone and iPad, where the browser has no such offer, a button that shows how to
// add it to the home screen. Nothing when the site is already open as the app, nor in other browsers (Firefox), nor on
// the server (the page stays the same for everyone; the browser fills it in).
//
// Two looks: a download icon button in the sticky header (`icon`, beside the search and the menu: always in sight,
// and nothing at all where it can't be installed), its iPhone instructions in a box under the header; and a labelled
// button in the menu and the footer, the instructions under it.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Download, ShareBox } from "@/components/SVG";
import { BUTTON, toggleClass } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";
import { APP_DISPLAY, INSTALL_EVENT } from "@/utils/install";

type Mode = "prompt" | "ios" | null;

/** Open as the installed app: then there's nothing to install */
const STANDALONE = APP_DISPLAY;
const subscribe = (onChange: () => void) => {
  const media = window.matchMedia(STANDALONE);
  window.addEventListener(INSTALL_EVENT, onChange);
  media.addEventListener("change", onChange);
  return () => {
    window.removeEventListener(INSTALL_EVENT, onChange);
    media.removeEventListener("change", onChange);
  };
};
// iPhone, or iPad (which says it's a Mac, but has touch)
const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const mode = (): Mode => {
  if (window.matchMedia(STANDALONE).matches || navigator.standalone) return null;
  if (window.__installPrompt) return "prompt";
  return isIos() ? "ios" : null;
};

export default function InstallApp({ title, icon = false, className = "" }: { title?: string; icon?: boolean; className?: string }) {
  const { t } = useI18n();
  const current = useSyncExternalStore(subscribe, mode, () => null);
  const [help, setHelp] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  // The header's instructions box closes on Escape or a press outside it
  useEffect(() => {
    if (!icon || !help) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setHelp(false);
    const onPress = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setHelp(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPress);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPress);
    };
  }, [icon, help]);
  if (!current) return null;

  const install = async () => {
    if (current === "ios") return setHelp(!help);
    const offer = window.__installPrompt;
    if (!offer) return;
    // The offer can be used once: after the dialog, whatever the answer, the browser makes a new one if it's still
    // installable
    window.__installPrompt = null;
    window.dispatchEvent(new Event(INSTALL_EVENT));
    await offer.prompt();
  };
  const instructions = current === "ios" && help && (
    <p className={icon ? "absolute inset-x-4 top-[calc(100%+0.5rem)] z-40 bg-white border border-black shadow-sm p-4 text-sm text-gray-700 md:left-auto md:w-80" : "mt-2 text-sm text-gray-700 max-w-xs"}>
      {t("layout.install.iosBefore")} <ShareBox className="inline align-[-0.15em]" /> {t("layout.install.iosAfter")}
    </p>
  );

  if (icon) {
    return (
      // Not positioned itself: the instructions box spans the header (sticky, so positioned), as the menu does
      <div ref={root} className={`flex ${className}`}>
        <button
          type="button"
          onClick={install}
          aria-expanded={current === "ios" ? help : undefined}
          aria-label={t("layout.install.button")}
          title={t("layout.install.button")}
          className={`w-[42px] h-[42px] inline-flex items-center justify-center ${BUTTON} ${help ? "bg-black text-white" : ""}`}
        >
          <Download className="text-xl" />
        </button>
        {instructions}
      </div>
    );
  }
  return (
    <div className={className}>
      {title && <h2 className="text-sm text-gray-600 mb-2">{title}</h2>}
      <button type="button" onClick={install} aria-expanded={current === "ios" ? help : undefined} className={`${toggleClass(help, "sm")} inline-flex items-center gap-2 cursor-pointer`}>
        <Download />
        {t("layout.install.button")}
      </button>
      {instructions}
    </div>
  );
}
