import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { LanguageProvider } from "@/messages/client";
import { isLanguage, LANGUAGES } from "@/messages/i18n";
import { getI18n } from "@/messages/server";
import { SITE_URL } from "@/utils/hrefs";
import { THEME_SCRIPT } from "@/utils/theme";
import "../globals.css";

// Redaction (SIL Open Font License, app/fonts/redaction/OFL.txt) is self-hosted: it is newer than
// next/font/google's font list. The files are Google Fonts' latin subset, which has æ, ø and å
const redaction = localFont({
  variable: "--font-redaction",
  src: [
    { path: "../fonts/redaction/Redaction-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/redaction/Redaction-Italic.woff2", weight: "400", style: "italic" },
    { path: "../fonts/redaction/Redaction-Bold.woff2", weight: "700", style: "normal" },
  ],
});
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Both languages are built: Norwegian ("nb", served at the site's root by the rewrites in
// next.config.ts) and English ("/en")
export const generateStaticParams = async () => LANGUAGES.map((lang) => ({ lang }));

// The defaults; every page sets its own title, description, canonical address and preview
// (utils/metadata.ts). metadataBase makes their addresses absolute.
export async function generateMetadata(): Promise<Metadata> {
  const { t, openGraphLocale } = await getI18n();
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t("seo.homeTitle"), template: t("layout.titleTemplate") },
    description: t("layout.description"),
    openGraph: { type: "website", siteName: t("layout.siteName"), locale: openGraphLocale },
    twitter: { card: "summary_large_image" },
  };
}

// The site's pages are in (site), with the header and footer; the Sanity Studio (/studio) has its own root layout
export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  return (
    // The theme attribute is set by THEME_SCRIPT before React hydrates, so it may differ from the server's
    <html lang={lang} className={`${redaction.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        {/* The saved colour theme, before the page paints (utils/theme.ts) */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen flex flex-col">
        {/* Type-safe URL query state (nuqs) for client components */}
        <NuqsAdapter>
          <LanguageProvider lang={lang}>{children}</LanguageProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
