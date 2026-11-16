"use client";

// The installed app's startup screen (utils/splash.ts), in the root layout: hidden (display: none) unless
// SPLASH_SCRIPT has put data-splash on <html>, so on the website it's a few hundred bytes that never show. The mark as
// the app's icon draws it (utils/logo.ts: white line and orange cork on a black square), then the name. The script is
// rendered as ThemeScript is: a script from the server, inert when React renders it on the client.
import { ACCENT, MARK } from "@/utils/logo";
import { SPLASH_SCRIPT } from "@/utils/splash";

export function SplashScript() {
  return <script type={typeof window === "undefined" ? undefined : "text/plain"} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: SPLASH_SCRIPT }} />;
}

export default function AppSplash() {
  const { size, line, stroke, cork, radius } = MARK;
  return (
    <div className="app-splash bg-stone-100" aria-hidden="true">
      <svg viewBox={`0 0 ${size} ${size}`} className="app-splash-mark">
        <clipPath id="app-splash-square">
          <rect width={size} height={size} rx={radius} />
        </clipPath>
        <rect width={size} height={size} rx={radius} fill="#000" />
        <g clipPath="url(#app-splash-square)">
          <path className="app-splash-line" pathLength={1} d={line} fill="none" stroke="#fff" strokeWidth={stroke} strokeLinejoin="round" />
          <path className="app-splash-cork" d={cork} fill={ACCENT} />
        </g>
      </svg>
      <span className="app-splash-name">elodrop</span>
    </div>
  );
}
