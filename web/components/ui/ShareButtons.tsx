"use client";

// Two icon buttons by a page's title (the front page, players, clubs, tournaments, team matches, head to head): open
// the page's link preview image in a new tab, and share the page (the device's share sheet, or the
// address copied where there's none). `path` and `image` are without the language ("/players/1").
import { useEffect, useState } from "react";
import { Check, Picture, Share } from "@/components/SVG";
import { ICON_BUTTON } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";

export type ShareKind = "site" | "player" | "club" | "tournament" | "teamMatch" | "headToHead";

export default function ShareButtons({ path, image, title, kind }: { path: string; image: string; title: string; kind: ShareKind }) {
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
      <a href={href(image)} target="_blank" rel="noopener" aria-label={t("common.share.preview")} title={t("common.share.preview")} className={ICON_BUTTON}>
        <Picture className="text-xl" />
      </a>
      <button type="button" onClick={share} aria-label={t(copied ? "common.share.copied" : `common.share.${kind}`)} title={t(copied ? "common.share.copied" : `common.share.${kind}`)} className={ICON_BUTTON}>
        {copied ? <Check className="text-xl" /> : <Share className="text-xl" />}
      </button>
      <span role="status" className="sr-only">{copied ? t("common.share.copied") : ""}</span>
    </div>
  );
}
