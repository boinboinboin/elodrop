// Installing the site as an app (a PWA; the manifest: app/[lang]/manifest.webmanifest/route.ts). Chrome, Edge and
// Android offer it with a `beforeinstallprompt` event, which can come before React has hydrated the page: so
// INSTALL_SCRIPT, in the root layout's head, keeps it on window (and forgets it once the app is installed) and tells
// the install button (components/layout/InstallApp.tsx) with an INSTALL_EVENT. Keeping it also holds back Chrome's
// own install bar on Android, as the site has its button. Safari on iPhone has no such event: the button shows how to
// add the site to the home screen instead.

/** The browser's install offer: prompt() shows its install dialog, once */
export interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __installPrompt?: InstallPrompt | null;
  }
  interface Navigator {
    /** iOS Safari: opened from the home screen */
    standalone?: boolean;
  }
}

/** Sent on window when the install offer comes or goes */
export const INSTALL_EVENT = "elodrop:installable";

export const INSTALL_SCRIPT = `try{var w=window,s=function(p){w.__installPrompt=p;w.dispatchEvent(new Event("${INSTALL_EVENT}"))};w.addEventListener("beforeinstallprompt",function(e){e.preventDefault();s(e)});w.addEventListener("appinstalled",function(){s(null)})}catch(e){}`;
