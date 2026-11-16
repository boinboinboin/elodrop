"use client";

// "Install the app" (utils/install.ts), in the header's menu and the footer: where the browser offers to install the
// site (Chrome, Edge, Android), a button that opens its install dialog; on iPhone and iPad, where the browser has no
// such offer, a button that shows how to add it to the home screen. Nothing when the site is already open as the app,
// nor in other browsers (Firefox), nor on the server (the page stays the same for everyone; the browser fills it in).
import { useState, useSyncExternalStore } from "react";
import { ShareBox } from "@/components/SVG";
import { toggleClass } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";
import { INSTALL_EVENT } from "@/utils/install";

type Mode = "prompt" | "ios" | null;

const STANDALONE = "(display-mode: standalone)";
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

export default function InstallApp({ title, className = "" }: { title?: string; className?: string }) {
  const { t } = useI18n();
  const current = useSyncExternalStore(subscribe, mode, () => null);
  const [help, setHelp] = useState(false);
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

  return (
    <div className={className}>
      {title && <h2 className="text-sm text-gray-600 mb-2">{title}</h2>}
      <button type="button" onClick={install} aria-expanded={current === "ios" ? help : undefined} className={`${toggleClass(help, "sm")} cursor-pointer`}>
        {t("layout.install.button")}
      </button>
      {current === "ios" && help && (
        <p className="mt-2 text-sm text-gray-700 max-w-xs">
          {t("layout.install.iosBefore")} <ShareBox className="inline align-[-0.15em]" /> {t("layout.install.iosAfter")}
        </p>
      )}
    </div>
  );
}
