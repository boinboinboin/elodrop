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

// Runs before the first paint: the saved theme onto <html> (the default needs no attribute). React
// clears <html>'s attributes when it mounts the root layout again (some client navigations do), so
// it also puts the saved theme back whenever data-theme changes from it; the observer's callback
// runs before the next paint
export const THEME_SCRIPT = `try{var d=document.documentElement,f=function(){var t=localStorage.getItem("${THEME_KEY}");t=t&&t!=="${DEFAULT_THEME}"&&${JSON.stringify(Object.keys(THEMES))}.indexOf(t)>=0?t:void 0;if(d.dataset.theme!==t){if(t)d.dataset.theme=t;else delete d.dataset.theme}};f();new MutationObserver(f).observe(d,{attributes:true,attributeFilter:["data-theme"]})}catch(e){}`;
