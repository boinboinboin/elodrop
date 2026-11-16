// The installed app's startup screen (components/layout/AppSplash.tsx; the animation in app/globals.css): the mark
// large on the page's background, its line drawing itself and the shuttle dropping into the dip, the name under it,
// then the screen lifts away. Only in the installed app (display-mode standalone, or iOS's home-screen mode), once
// per launch (sessionStorage starts empty with each launch): never on the website, which stays instant.
//
// SPLASH_SCRIPT runs in the root layout's head, before the page paints: it sets <html data-splash="in">, which shows
// the screen, then "out" (it lifts away), then takes it off. With reduced motion it's a short still screen.

import { APP_DISPLAY } from "./install";

const KEY = "splash";
/** From the start until the screen begins to lift (the animation's length), and the lift */
const SHOW_MS = 1000;
const LEAVE_MS = 450;
const REDUCED_SHOW_MS = 300;

export const SPLASH_SCRIPT = `try{var d=document.documentElement,w=window;if((w.matchMedia(${JSON.stringify(APP_DISPLAY)}).matches||navigator.standalone)&&!sessionStorage.getItem("${KEY}")){sessionStorage.setItem("${KEY}","1");var s=w.matchMedia("(prefers-reduced-motion: reduce)").matches?${REDUCED_SHOW_MS}:${SHOW_MS};d.dataset.splash="in";setTimeout(function(){d.dataset.splash="out"},s);setTimeout(function(){delete d.dataset.splash},s+${LEAVE_MS})}}catch(e){}`;
