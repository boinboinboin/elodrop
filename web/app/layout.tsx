import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { t } from "@/messages/i18n";
import { THEME_SCRIPT } from "@/utils/theme";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: t("layout.siteName"), template: t("layout.titleTemplate") },
  description: t("layout.description"),
};

// The site's pages are in (site), with the header and footer; the Sanity Studio (/studio) is full-screen
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The theme attribute is set by THEME_SCRIPT before React hydrates, so it may differ from the server's
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        {/* The saved colour theme, before the page paints (utils/theme.ts) */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen flex flex-col">
        {/* Type-safe URL query state (nuqs) for client components */}
        <NuqsAdapter>{children}</NuqsAdapter>
      </body>
    </html>
  );
}
