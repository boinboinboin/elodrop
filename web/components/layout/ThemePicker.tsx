"use client";

// The colour themes (utils/theme.ts) as a choice of one, in the menu (components/layout/MenuButton.tsx): first
// "Automatic" (Yinyang or Lights out, as the device is light or dark), then each theme, with a swatch of its colours.
// The theme lives on <html data-theme> (set before the page paints) and the choice in localStorage; this reads the
// choice, or the page's theme when the browser blocks storage.
import { useSyncExternalStore } from "react";
import { useI18n } from "@/messages/client";
import { DARK_QUERY, DARK_THEME, DEFAULT_THEME, resolveTheme, THEMES, THEME_KEY, type Theme, type ThemeChoice } from "@/utils/theme";

const CHOICES: ThemeChoice[] = ["auto", ...(Object.keys(THEMES) as Theme[])];
const isChoice = (value: string | null | undefined): value is ThemeChoice => !!value && (CHOICES as string[]).includes(value);

// The choice can change without the page's theme changing (Yinyang to "auto" on a light device): setTheme tells with
// this event, another tab with "storage"
const CHANGE = "themechoice";
const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  window.addEventListener(CHANGE, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    observer.disconnect();
    window.removeEventListener(CHANGE, onChange);
    window.removeEventListener("storage", onChange);
  };
};
const current = (): ThemeChoice => {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return isChoice(saved) ? saved : "auto";
  } catch {
    // Storage blocked (private mode): the theme on the page
    const t = document.documentElement.dataset.theme;
    return t && t in THEMES ? (t as Theme) : DEFAULT_THEME;
  }
};

function setTheme(choice: ThemeChoice) {
  try {
    localStorage.setItem(THEME_KEY, choice);
  } catch {
    // Storage blocked (private mode): the theme still applies to this page
  }
  const theme = resolveTheme(choice, matchMedia(DARK_QUERY).matches);
  if (theme === DEFAULT_THEME) delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new Event(CHANGE));
}

/** A theme's main colours as slices of a circle; "auto" as its two themes' pages, split on the diagonal */
const Swatch = ({ choice }: { choice: ThemeChoice }) => {
  let background: string;
  if (choice === "auto") background = `linear-gradient(135deg, ${THEMES[DEFAULT_THEME].bar} 50%, ${THEMES[DARK_THEME].swatch[0]} 50%)`;
  else {
    const colors = THEMES[choice].swatch;
    const slice = 360 / colors.length;
    background = `conic-gradient(${colors.map((c, i) => `${c} ${i * slice}deg ${(i + 1) * slice}deg`).join(", ")})`;
  }
  return <span aria-hidden="true" className="block w-6 h-6 rounded-full ring-1 ring-gray-300 shrink-0" style={{ background }} />;
};

/** `onPick`: called after a theme is chosen (the menu closes) */
export default function ThemePicker({ onPick }: { onPick?: () => void }) {
  const { t } = useI18n();
  // The server renders "auto"; the visitor's choice takes over on hydration
  const choice = useSyncExternalStore(subscribe, current, () => "auto" as ThemeChoice);
  return (
    <div role="radiogroup" aria-label={t("layout.menu.theme")} className="grid gap-1">
      {CHOICES.map((name) => (
        <button
          key={name}
          type="button"
          role="radio"
          aria-checked={choice === name}
          onClick={() => {
            setTheme(name);
            onPick?.();
          }}
          className={`flex items-center gap-3 px-2 py-2 -mx-2 text-left cursor-pointer transition-colors duration-200 ${choice === name ? "bg-gray-100" : "hover:bg-gray-50"}`}
        >
          <Swatch choice={name} />
          <span className="min-w-0">
            <span className={`block ${choice === name ? "font-semibold" : ""}`}>{t(`layout.themes.${name}.label`)}</span>
            <span className="block text-sm text-gray-600">{t(`layout.themes.${name}.description`)}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
