// The site's colour themes (app/globals.css): "yinyang", black and white (the default); "totebag",
// light cream with dark olive text and court-green links; "allengland", the All England Open's grey
// courts; and "lightsout", pitch black for OLED screens. The visitor's choice is one of them or "auto"
// (also when nothing is chosen): Yinyang when the device is in light mode, Lights out when it's in dark
// mode, following it as it changes. The choice is kept in the browser (localStorage) and the theme it
// gives set as <html data-theme> before the page paints (THEME_SCRIPT, in the root layout's head), so
// the pages stay static and there's no flash of another theme.

// Each theme's swatch: its main colours (names and descriptions in messages/<locale>/layout.json); and `bar`, the
// header's and footer's background (the theme's --color-white in app/globals.css), for the phone's bars around the
// installed app, so they look part of the page
export const THEMES = {
  yinyang: { swatch: ["#000000", "#ffffff"], bar: "#ffffff" },
  totebag: { swatch: ["#f3efdf", "#2c3a1d", "#2f6b45"], bar: "#fbf9f1" },
  allengland: { swatch: ["#c0c6d0", "#1f2228", "#00834d"], bar: "#eef1f5" },
  lightsout: { swatch: ["#000000", "#dcd6c2", "#7aa7ff"], bar: "#0e0e0e" },
} as const;
export type Theme = keyof typeof THEMES;
export const DEFAULT_THEME: Theme = "yinyang";
/** "auto"'s theme when the device is in dark mode */
export const DARK_THEME: Theme = "lightsout";
/** What a visitor picks: a theme, or following the device */
export type ThemeChoice = Theme | "auto";
export const THEME_KEY = "theme";
export const DARK_QUERY = "(prefers-color-scheme: dark)";

/** The theme a choice gives now */
export const resolveTheme = (choice: ThemeChoice, dark: boolean): Theme => (choice === "auto" ? (dark ? DARK_THEME : DEFAULT_THEME) : choice);

// Runs before the first paint: the theme the saved choice gives onto <html> (the default needs no attribute; no
// choice, an unknown one or "auto" follow the device). React clears <html>'s attributes when it mounts the root
// layout again (some client navigations do), so it also puts the theme back whenever data-theme changes from it; the
// observer's callback runs before the next paint. With "auto", it changes the theme when the device switches between
// light and dark; it also follows a choice made in another tab. If the browser blocks storage, it starts as "auto",
// and a theme picked later is left as it is (ThemePicker sets it on the page). It also gives the bars around the page (the browser's on phones, the installed
// app's) the theme's `bar` colour (the theme-color meta: app/[lang]/layout.tsx), now and whenever the theme changes;
// and again once the page is read, in case the meta comes after this script.
const BARS = Object.fromEntries(Object.entries(THEMES).map(([name, theme]) => [name, theme.bar]));
export const THEME_SCRIPT = `try{var d=document.documentElement,b=${JSON.stringify(BARS)},q=matchMedia("${DARK_QUERY}"),m=function(){var e=document.querySelector('meta[name="theme-color"]');if(e)e.content=b[d.dataset.theme||"${DEFAULT_THEME}"]},f=function(o){var t=null;try{t=localStorage.getItem("${THEME_KEY}")}catch(e){if(o)return}if(!t||!b.hasOwnProperty(t))t=q.matches?"${DARK_THEME}":"${DEFAULT_THEME}";if(t==="${DEFAULT_THEME}")t=void 0;if(d.dataset.theme!==t){if(t)d.dataset.theme=t;else delete d.dataset.theme}m()};f();new MutationObserver(function(){f(1)}).observe(d,{attributes:true,attributeFilter:["data-theme"]});q.addEventListener("change",function(){f()});addEventListener("storage",function(){f()});document.addEventListener("DOMContentLoaded",m)}catch(e){}`;
