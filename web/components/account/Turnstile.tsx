"use client";

// Cloudflare Turnstile on the sign-in form, so bots can't ask for sign-in codes: Managed mode (most people see it tick
// itself; a visitor who looks like a bot gets a box to click). Its token goes with the request for a code, and Supabase
// checks it (Authentication → Attack Protection → CAPTCHA, the widget's secret key), so the sign-in can't be asked for
// without it. A token is good for one request: the form mounts a new widget for the next (its `key`).
//
// Cloudflare's script is loaded only here, on the sign-in form, when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set; without
// it there's no check (local development against a local Supabase, which doesn't ask for one).
import { useEffect, useRef } from "react";
import { useI18n } from "@/messages/client";
import { DARK_THEME } from "@/utils/theme";

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

interface TurnstileApi {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let script: Promise<TurnstileApi> | null = null;
const loadTurnstile = () =>
  (script ??= new Promise<TurnstileApi>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    el.async = true;
    el.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile")));
    el.onerror = () => {
      script = null;
      reject(new Error("turnstile"));
    };
    document.head.appendChild(el);
  }));

/** The check, calling `onToken` with its token once passed (null again when it expires or fails) */
export default function Turnstile({ onToken }: { onToken: (token: string | null) => void }) {
  const { lang } = useI18n();
  const box = useRef<HTMLDivElement>(null);
  const callback = useRef(onToken);
  useEffect(() => {
    callback.current = onToken;
  }, [onToken]);

  useEffect(() => {
    let id: string | null = null;
    let live = true;
    loadTurnstile()
      .then((api) => {
        if (!live || !box.current) return;
        id = api.render(box.current, {
          sitekey: TURNSTILE_SITE_KEY,
          // The site's dark theme (Lights out) or a light one, as the page is now
          theme: document.documentElement.dataset.theme === DARK_THEME ? "dark" : "light",
          language: lang === "nb" ? "nb" : "en",
          size: "flexible",
          callback: (token: string) => callback.current(token),
          "expired-callback": () => callback.current(null),
          "error-callback": () => callback.current(null),
        });
      })
      .catch(() => callback.current(null));
    return () => {
      live = false;
      if (id) window.turnstile?.remove(id);
    };
  }, [lang]);

  return <div ref={box} className="max-w-sm min-h-[65px]" />;
}
