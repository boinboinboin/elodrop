"use client";

// INSTALL_SCRIPT (utils/install.ts) in the root layout's head (app/[lang]/layout.tsx), as ThemeScript: a script from
// the server, run before React hydrates (when the browser's install offer may already come); an inert data block when
// React renders it on the client.
import { INSTALL_SCRIPT } from "@/utils/install";

export default function InstallScript() {
  return <script type={typeof window === "undefined" ? undefined : "text/plain"} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: INSTALL_SCRIPT }} />;
}
