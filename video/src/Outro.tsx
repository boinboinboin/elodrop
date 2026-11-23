import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { AnimatedMark, progress } from "./Logo";

// The installed app's startup screen (web/components/layout/AppSplash.tsx), frame by frame: the mark's animation, the
// name rising in under it, the site's timings slowed by SLOW for video, then the address under it.
const SLOW = 1.5;
export const SPLASH_BG = "#f5f5f4"; // the splash's bg-stone-100

export function Outro() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const s = frame / fps;
  const size = Math.min(width, height) * 0.3;
  // splash-name: rises 0.5rem and fades in, 0.45 s after 0.6 s
  const name = progress(s, 0.6 * SLOW, 0.45 * SLOW);
  // The address, after the name has settled
  const address = progress(s, 1.3 * SLOW, 0.5 * SLOW);

  return (
    <AbsoluteFill style={{ background: SPLASH_BG, alignItems: "center", justifyContent: "center", gap: size * 0.2, fontFamily: "Redaction, Georgia, serif", color: "#111827" }}>
      <AnimatedMark size={size} seconds={s} slow={SLOW} id="outro-square" />
      <div style={{ fontSize: size * 0.3, fontWeight: 700, letterSpacing: "-0.025em", opacity: name, transform: `translateY(${(1 - name) * size * 0.08}px)`, lineHeight: 1 }}>Elodrop</div>
      <div style={{ fontSize: size * 0.14, color: "#6b7280", opacity: address, transform: `translateY(${(1 - address) * size * 0.05}px)`, marginTop: -size * 0.08 }}>elodrop.no</div>
    </AbsoluteFill>
  );
}
