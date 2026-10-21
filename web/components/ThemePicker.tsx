"use client";

// The colour themes (lib/theme.ts) as a choice of one, in the menu (components/MenuButton.tsx): each
// with a swatch of its colours. The theme lives on <html data-theme> (set before the page paints)
// and in localStorage; this reads it from the page.
import { useSyncExternalStore } from "react";
import { DEFAULT_THEME, THEMES, THEME_KEY, type Theme } from "@/lib/theme";

const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
};
const current = (): Theme => {
  const t = document.documentElement.dataset.theme;
  return t && t in THEMES ? (t as Theme) : DEFAULT_THEME;
};

function setTheme(theme: Theme) {
  if (theme === DEFAULT_THEME) delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage blocked (private mode): the theme still applies to this page
  }
}

/** A theme's main colours as slices of a circle */
const Swatch = ({ colors }: { colors: readonly string[] }) => {
  const slice = 360 / colors.length;
  return (
    <span
      aria-hidden="true"
      className="block w-6 h-6 rounded-full ring-1 ring-gray-300 shrink-0"
      style={{ background: `conic-gradient(${colors.map((c, i) => `${c} ${i * slice}deg ${(i + 1) * slice}deg`).join(", ")})` }}
    />
  );
};

/** `onPick`: called after a theme is chosen (the menu closes) */
export default function ThemePicker({ onPick }: { onPick?: () => void }) {
  // The server renders the default; the page's actual theme takes over on hydration
  const theme = useSyncExternalStore(subscribe, current, () => DEFAULT_THEME);
  return (
    <div role="radiogroup" aria-label="Colour theme" className="grid gap-1">
      {(Object.keys(THEMES) as Theme[]).map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={theme === t}
          onClick={() => {
            setTheme(t);
            onPick?.();
          }}
          className={`flex items-center gap-3 px-2 py-2 -mx-2 text-left cursor-pointer transition-colors duration-200 ${theme === t ? "bg-gray-100" : "hover:bg-gray-50"}`}
        >
          <Swatch colors={THEMES[t].swatch} />
          <span className="min-w-0">
            <span className={`block ${theme === t ? "font-semibold" : ""}`}>{THEMES[t].label}</span>
            <span className="block text-sm text-gray-600">{THEMES[t].description}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
