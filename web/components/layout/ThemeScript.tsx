"use client";

// THEME_SCRIPT (utils/theme.ts) in the root layout's head (app/[lang]/layout.tsx). From the server it's a
// script, run before the first paint. When React renders it on the client (it mounts the root layout
// again on some navigations), it's an inert data block (text/plain): a script React creates never runs
// anyway, and the observer from the first run is still there, but React warns about one in a component.
// Hydrating keeps the server's tag as it is; suppressHydrationWarning hides the type's difference.
import { THEME_SCRIPT } from "@/utils/theme";

export default function ThemeScript() {
  return <script type={typeof window === "undefined" ? undefined : "text/plain"} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
}
