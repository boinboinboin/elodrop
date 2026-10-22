// The web app manifest: the name and icons for a phone's home screen (icons from
// scripts/make-icons.mts)
import type { MetadataRoute } from "next";
import { t } from "@/messages/i18n";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: t("layout.siteName"),
    short_name: t("layout.siteName"),
    description: t("layout.manifestDescription"),
    start_url: "/",
    display: "browser",
    background_color: "#f5f5f4",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
