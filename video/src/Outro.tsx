import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

// The installed app's startup screen (web/components/layout/AppSplash.tsx, its animation in web/app/globals.css),
// frame by frame: the mark fades and grows in, its line draws itself, the shuttle drops cork first into the dip with a
// little squash and settles, the name rises in under it. The site's timings, slowed by SLOW for video, then the
// address under it.
const SLOW = 1.5;
const BG = "#f5f5f4"; // the splash's bg-stone-100
const ACCENT = "#f97316";
const MARK = {
  line: "M-1 9H3L6.4 12.8L9 11L12.4 14.6L14.2 17.4H21.8L25.2 11.6H33",
  cork: "M14.6 19.6V22A3.4 3.4 0 0 0 21.4 22V19.6Z",
};

const bezier = (x1: number, y1: number, x2: number, y2: number) => Easing.bezier(x1, y1, x2, y2);
/** Progress 0..1 of a CSS animation of `duration` s starting at `delay` s, with its timing function */
function progress(seconds: number, delay: number, duration: number, easing: (t: number) => number) {
  return easing(interpolate(seconds, [delay * SLOW, (delay + duration) * SLOW], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
}

export function Outro() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const s = frame / fps;
  const size = Math.min(width, height) * 0.3;

  // splash-mark: from opacity 0 and scale 0.92, 0.4 s
  const mark = progress(s, 0, 0.4, bezier(0.2, 0.8, 0.3, 1));
  // splash-line: the dash offset from 1 to 0, 0.6 s after 0.1 s
  const line = progress(s, 0.1, 0.6, bezier(0.4, 0, 0.2, 1));
  // splash-cork, 0.5 s after 0.45 s: from 14 above (opacity 0) to landing squashed at 55%, a little rebound at 80%, settled
  const c = progress(s, 0.45, 0.5, bezier(0.3, 0, 0.3, 1));
  const corkY = interpolate(c, [0, 0.55, 0.8, 1], [-14, 0, -1, 0]);
  const corkSx = interpolate(c, [0, 0.55, 0.8, 1], [1, 1.08, 0.97, 1]);
  const corkSy = interpolate(c, [0, 0.55, 0.8, 1], [1, 0.88, 1.04, 1]);
  const corkOpacity = interpolate(c, [0, 0.55], [0, 1], { extrapolateRight: "clamp" });
  // splash-name: rises 0.5rem and fades in, 0.45 s after 0.6 s
  const name = progress(s, 0.6, 0.45, bezier(0.2, 0.8, 0.3, 1));
  // The address, after the name has settled
  const address = progress(s, 1.3, 0.5, bezier(0.2, 0.8, 0.3, 1));

  return (
    <AbsoluteFill style={{ background: BG, alignItems: "center", justifyContent: "center", gap: size * 0.2, fontFamily: "Redaction, Georgia, serif", color: "#111827" }}>
      <svg width={size} height={size} viewBox="0 0 32 32" style={{ opacity: mark, transform: `scale(${0.92 + 0.08 * mark})` }}>
        <clipPath id="outro-square">
          <rect width="32" height="32" rx="7" />
        </clipPath>
        <rect width="32" height="32" rx="7" fill="#000" />
        <g clipPath="url(#outro-square)">
          <path d={MARK.line} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - line} fill="none" stroke="#fff" strokeWidth={2.6} strokeLinejoin="round" />
          {/* Scaled from the cork's bottom centre (transform-origin 50% 100% of its box: x 18, y 25.4) */}
          <path
            d={MARK.cork}
            fill={ACCENT}
            opacity={corkOpacity}
            transform={`translate(0 ${corkY}) translate(18 25.4) scale(${corkSx} ${corkSy}) translate(-18 -25.4)`}
          />
        </g>
      </svg>
      <div style={{ fontSize: size * 0.3, fontWeight: 700, letterSpacing: "-0.025em", opacity: name, transform: `translateY(${(1 - name) * size * 0.08}px)`, lineHeight: 1 }}>Elodrop</div>
      <div style={{ fontSize: size * 0.14, color: "#6b7280", opacity: address, transform: `translateY(${(1 - address) * size * 0.05}px)`, marginTop: -size * 0.08 }}>elodrop.no</div>
    </AbsoluteFill>
  );
}
