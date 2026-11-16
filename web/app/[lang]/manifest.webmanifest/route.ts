// The web app manifest, one per language: /manifest.webmanifest (Norwegian, through the rewrite to "/nb" in
// next.config.ts) and /en/manifest.webmanifest, each linked from its language's pages (app/[lang]/layout.tsx).
// With it the site installs as an app (a PWA: "Install app" in Chrome, Edge and Android, "Add to Home Screen" on
// iPhone; components/layout/InstallApp.tsx), opening in its own window on the front page of its language. Each
// language is its own app (its own id). Icons from scripts/make-icons.mts. Static: built once per language.
import type { MetadataRoute } from "next";
import { createI18n, isLanguage, LANGUAGES } from "@/messages/i18n";
import { DEFAULT_THEME, THEMES } from "@/utils/theme";

export const generateStaticParams = async () => LANGUAGES.map((lang) => ({ lang }));

export async function GET(_request: Request, { params }: RouteContext<"/[lang]/manifest.webmanifest">) {
  const { lang } = await params;
  if (!isLanguage(lang)) return new Response(null, { status: 404 });
  const { t, href } = createI18n(lang);
  const start = href("/");
  const manifest: MetadataRoute.Manifest = {
    id: start,
    name: t("layout.siteName"),
    short_name: t("layout.siteName"),
    description: t("layout.manifestDescription"),
    lang,
    start_url: start,
    scope: start,
    // Its own window, without the browser's address bar and buttons
    display: "standalone",
    // The app's bars: the header's and footer's colour, so they don't show (the default theme's; the page sets the
    // theme picked: utils/theme.ts), and the page background behind the splash screen while it starts
    theme_color: THEMES[DEFAULT_THEME].bar,
    background_color: "#f5f5f4",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return new Response(JSON.stringify(manifest), { headers: { "Content-Type": "application/manifest+json" } });
}
