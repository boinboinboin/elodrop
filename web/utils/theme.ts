// The site's colour themes (app/globals.css): "yinyang", black and white (the default); "totebag",
// light cream with dark olive text and court-green links; and "allengland", the All England
// Open's grey courts. The choice is kept in the browser (localStorage) and set as <html data-theme>
// before the page paints (THEME_SCRIPT, in the root layout's head), so the pages stay static and
// there's no flash of the other theme.

// Each theme's swatch: its main colours (names and descriptions in messages/<locale>/layout.json)
export const THEMES = {
  yinyang: { swatch: ["#000000", "#ffffff"] },
  totebag: { swatch: ["#f3efdf", "#2c3a1d", "#2f6b45"] },
  allengland: { swatch: ["#c0c6d0", "#1f2228", "#00834d"] },
} as const;
export type Theme = keyof typeof THEMES;
export const DEFAULT_THEME: Theme = "yinyang";
export const THEME_KEY = "theme";

// Runs before the first paint: the saved theme onto <html> (the default needs no attribute)
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t&&t!=="${DEFAULT_THEME}"&&${JSON.stringify(Object.keys(THEMES))}.indexOf(t)>=0)document.documentElement.dataset.theme=t}catch(e){}`;
