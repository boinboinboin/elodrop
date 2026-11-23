import { AbsoluteFill, Easing, useCurrentFrame, useVideoConfig } from "remotion";
import { ACCENT, AnimatedMark, progress } from "./Logo";
import { SPLASH_BG } from "./Outro";

// The opening: the mark's startup animation (as in the outro, at the site's own speed), the list's name rising in under
// it, then what the video shows. It holds briefly, then slides up and away, uncovering the race's first week.
export const TITLE_SECONDS = 2.4;
export const TITLE_OUT_SECONDS = 0.5;

export function TitleCard({ title, years }: { title: string; years: string }) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const s = frame / fps;
  const portrait = height > width;
  const size = Math.min(width, height) * (portrait ? 0.26 : 0.24);
  const name = progress(s, 0.55, 0.45);
  const sub = progress(s, 0.75, 0.45);
  const span = progress(s, 0.95, 0.45);
  const out = progress(s, TITLE_SECONDS, TITLE_OUT_SECONDS, Easing.inOut(Easing.cubic));
  const rise = (p: number, by: number) => `translateY(${(1 - p) * by}px)`;

  return (
    <AbsoluteFill
      style={{
        background: SPLASH_BG,
        fontFamily: "Redaction, Georgia, serif",
        color: "#111827",
        transform: `translateY(${-out * 104}%)`,
        boxShadow: out > 0 ? "0 12px 48px rgba(0,0,0,0.18)" : undefined,
      }}
    >
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 64px" }}>
        <AnimatedMark size={size} seconds={s} id="title-square" />
        <div style={{ fontSize: portrait ? 112 : 104, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05, marginTop: size * 0.22, opacity: name, transform: rise(name, size * 0.1) }}>
          {title}
        </div>
        <div style={{ fontSize: portrait ? 46 : 40, color: "#6b7280", marginTop: portrait ? 22 : 16, opacity: sub, transform: rise(sub, size * 0.08) }}>
          Topp 10 i Norge etter Elo-rating
        </div>
        <div style={{ fontSize: portrait ? 46 : 40, fontWeight: 700, color: ACCENT, marginTop: portrait ? 14 : 10, fontVariantNumeric: "tabular-nums", opacity: span, transform: rise(span, size * 0.08) }}>
          {years}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
