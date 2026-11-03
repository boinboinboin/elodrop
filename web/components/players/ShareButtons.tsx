"use client";

// A player's two icon buttons by their name: open the page's link preview (preview.png) in a new
// tab, and share the page (the device's share sheet, or the address copied where there's none).
import { useEffect, useState } from "react";
import { Check, Picture, Share } from "@/components/SVG";
import { ICON_BUTTON } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";

export default function ShareButtons({ path, title }: { path: string; title: string }) {
  const { t, href } = useI18n();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const share = async () => {
    const url = new URL(href(path), window.location.origin).toString();
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // Closed without sharing
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // No clipboard access: nothing to do
    }
  };

  return (
    <div className="flex gap-2 shrink-0">
      <a href={href(`${path}/preview.png`)} target="_blank" rel="noopener" aria-label={t("players.share.preview")} title={t("players.share.preview")} className={ICON_BUTTON}>
        <Picture className="text-xl" />
      </a>
      <button type="button" onClick={share} aria-label={t(copied ? "players.share.copied" : "players.share.share")} title={t(copied ? "players.share.copied" : "players.share.share")} className={ICON_BUTTON}>
        {copied ? <Check className="text-xl" /> : <Share className="text-xl" />}
      </button>
      <span role="status" className="sr-only">{copied ? t("players.share.copied") : ""}</span>
    </div>
  );
}
