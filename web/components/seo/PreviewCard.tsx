// The picture a shared link shows (Open Graph / X card, 1200×630), drawn by next/og: the elodrop
// mark, what it is ("Player"), the title, a line under it, up to four numbers with their labels, and
// the site's address. Used by app/opengraph-image.tsx and the preview.png routes (players, clubs, tournaments).
import { ImageResponse } from "next/og";
import type { I18n } from "@/messages/i18n";
import { SITE_URL } from "@/utils/hrefs";
import { ACCENT, MARK, markSvg } from "@/utils/logo";
import { PREVIEW_SIZE } from "@/utils/metadata";

export interface PreviewStat {
  value: string;
  label: string;
}

export function previewCard(i18n: I18n, { kicker, title, subtitle, stats = [], image }: { kicker?: string; title: string; subtitle?: string; stats?: PreviewStat[]; image?: string | null }) {
  const mark = `data:image/svg+xml;base64,${Buffer.from(markSvg(MARK)).toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#ffffff", color: "#111827", borderTop: `16px solid ${ACCENT}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 36 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mark} width={64} height={64} alt="" />
          <span style={{ fontWeight: 700 }}>{i18n.t("layout.siteName")}</span>
          {kicker && <span style={{ color: "#6b7280" }}>{`· ${kicker}`}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {image && <img src={image} width={140} height={140} alt="" style={{ objectFit: "contain" }} />}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span style={{ fontSize: title.length > 28 ? 64 : 84, fontWeight: 700, lineHeight: 1.05 }}>{title}</span>
            {subtitle && <span style={{ fontSize: 38, color: "#4b5563" }}>{subtitle}</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 56 }}>
            {stats.slice(0, 4).map((s) => (
              <div key={s.label} style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 56, fontWeight: 700 }}>{s.value}</span>
                <span style={{ fontSize: 26, color: "#6b7280" }}>{s.label}</span>
              </div>
            ))}
          </div>
          <span style={{ fontSize: 28, color: "#6b7280" }}>{SITE_URL.replace(/^https:\/\//, "")}</span>
        </div>
      </div>
    ),
    // Drawn on request (one per player, club or tournament), then kept by the CDN for a day, like
    // the pages (the data changes once a night)
    { ...PREVIEW_SIZE, headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
  );
}
