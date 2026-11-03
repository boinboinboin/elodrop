// The picture a shared link shows (Open Graph / X card, 1200×630), drawn by next/og: the elodrop
// mark, what it is ("Player") and a note at the other end (the day the ratings are from), the title,
// a line under it, up to five numbers with their labels (a club's rank in all five disciplines), a
// chance bar (head to head and team matches: each side's chance of winning, as on the page), and the site's address. Used by app/opengraph-image.tsx and the preview.png routes (players, clubs,
// tournaments, team matches, head to head).
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getMeta } from "@/data/meta";
import type { I18n } from "@/messages/i18n";
import { SITE_URL } from "@/utils/hrefs";
import { ACCENT, MARK, markSvg } from "@/utils/logo";
import { PREVIEW_SIZE } from "@/utils/metadata";

export interface PreviewStat {
  value: string;
  label: string;
}

/** Each side's chance of winning as a split bar (components/head-to-head/ChanceBar.tsx): the first side's from
 *  the left, and with `draw` (a team match) the chance of a draw between them, named `drawLabel` */
export interface PreviewBar {
  names: [string, string];
  chance: number;
  draw?: number;
  drawLabel?: string;
}

// The sides' colours and a draw's (--color-chart-1, -2 and -other, the light theme's: next/og can't read CSS variables)
const SIDES = ["#3061d8", "#ca5956"];
const DRAW = "#8a8984";

/** A split bar's shares as drawn: each side's at least 2 %, so both colours show at ">99 %" */
function barShares(chance: number, draw: number): [number, number] {
  const shown = draw > 0 ? Math.max(draw, 0.02) : 0;
  return [Math.min(Math.max(chance, 0.02), 0.98 - shown), shown];
}

// The site's typeface, Redaction (app/fonts/redaction), as TTF: next/og can't read the site's woff2 files.
// Read once per server instance
const fonts = Promise.all(
  ([["Regular", 400], ["Bold", 700]] as const).map(async ([file, weight]) => ({
    name: "Redaction",
    data: await readFile(join(process.cwd(), `app/fonts/redaction/Redaction-${file}.ttf`)),
    weight,
    style: "normal" as const,
  })),
);

/** The note for a preview with ratings: the last data update's day in Norway ("Ratinger per 2. nov. 2026"; the
 *  server runs on UTC, and a night's run can start before 01:00) */
export async function ratingsNote({ t, date }: I18n): Promise<string | undefined> {
  const meta = await getMeta();
  const updated = meta ? (meta.updatedAt ?? meta.generatedAt) : null;
  if (!updated) return undefined;
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Oslo" }).format(new Date(updated));
  return t("seo.preview.asOf", { date: date(day) });
}

export async function previewCard(i18n: I18n, { kicker, title, subtitle, stats = [], bar, image, note }: { kicker?: string; title: string; subtitle?: string; stats?: PreviewStat[]; bar?: PreviewBar; image?: string | null; note?: string }) {
  const mark = `data:image/svg+xml;base64,${Buffer.from(markSvg(MARK)).toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, fontFamily: "Redaction", background: "#ffffff", color: "#111827", borderTop: `16px solid ${ACCENT}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 36 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mark} width={64} height={64} alt="" />
            <span style={{ fontWeight: 700 }}>{i18n.t("layout.siteName")}</span>
            {kicker && <span style={{ color: "#6b7280" }}>{`· ${kicker}`}</span>}
          </div>
          {note && <span style={{ fontSize: 26, color: "#6b7280" }}>{note}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {image && <img src={image} width={140} height={140} alt="" style={{ objectFit: "contain" }} />}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Smaller for longer titles (two players, or two doubles pairs), to keep to two lines */}
            <span style={{ fontSize: title.length > 56 ? 52 : title.length > 28 ? 64 : 84, fontWeight: 700, lineHeight: 1.05 }}>{title}</span>
            {subtitle && <span style={{ fontSize: 38, color: "#4b5563" }}>{subtitle}</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 56 }}>
          {stats.length > 0 && (
            <div style={{ display: "flex", gap: stats.length > 4 ? 44 : 56 }}>
              {stats.slice(0, 5).map((s) => (
                <div key={s.label} style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 56, fontWeight: 700 }}>{s.value}</span>
                  <span style={{ fontSize: 26, color: "#6b7280" }}>{s.label}</span>
                </div>
              ))}
            </div>
          )}
          {bar && (
            // Only as wide as the room left (minWidth 0): long names wrap rather than push it wider
            <div style={{ display: "flex", flexDirection: "column", flex: "1 1 0", minWidth: 0, gap: 10 }}>
              {/* Each side's chance over its name (and a draw's in the middle), like the numbers beside it */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24 }}>
                {[
                  { value: bar.chance, name: bar.names[0], align: "flex-start" as const },
                  ...((bar.draw ?? 0) > 0 ? [{ value: bar.draw!, name: bar.drawLabel ?? "", align: "center" as const, muted: true }] : []),
                  { value: 1 - bar.chance - (bar.draw ?? 0), name: bar.names[1], align: "flex-end" as const },
                ].map((side, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: side.align, flexShrink: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 44, fontWeight: 700 }}>{i18n.chance(side.value)}</span>
                    <span style={{ fontSize: 26, lineHeight: 1.1, color: "muted" in side ? "#6b7280" : "#111827", textAlign: side.align === "flex-end" ? "right" : side.align === "center" ? "center" : "left" }}>{side.name}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", height: 18, gap: 4 }}>
                <div style={{ width: `${(barShares(bar.chance, bar.draw ?? 0)[0] * 100).toFixed(1)}%`, background: SIDES[0], borderRadius: "6px 0 0 6px" }} />
                {(bar.draw ?? 0) > 0 && <div style={{ width: `${(barShares(bar.chance, bar.draw!)[1] * 100).toFixed(1)}%`, background: DRAW }} />}
                <div style={{ flex: 1, background: SIDES[1], borderRadius: "0 6px 6px 0" }} />
              </div>
            </div>
          )}
          <span style={{ fontSize: 28, color: "#6b7280", marginLeft: "auto", flexShrink: 0 }}>{SITE_URL.replace(/^https:\/\//, "")}</span>
        </div>
      </div>
    ),
    // Drawn on request (one per player, club or tournament), then kept by the CDN for a day, like
    // the pages (the data changes once a night)
    { ...PREVIEW_SIZE, fonts: await fonts, headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
  );
}
