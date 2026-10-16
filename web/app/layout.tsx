import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "elodrop", template: "%s · elodrop" },
  description: "elodrop: singles and doubles Elo ratings for Norwegian badminton, from every tournament and league result on badmintonportalen.no since 2013.",
};

// The site's pages are in (site), with the header and footer; the Sanity Studio (/studio) is full-screen
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
