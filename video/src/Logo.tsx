import { Easing, interpolate } from "remotion";

// The elodrop mark (web/utils/logo.ts): white on a black rounded square
export const ACCENT = "#f97316";
const MARK = {
  line: "M-1 9H3L6.4 12.8L9 11L12.4 14.6L14.2 17.4H21.8L25.2 11.6H33",
  cork: "M14.6 19.6V22A3.4 3.4 0 0 0 21.4 22V19.6Z",
};

export const splashEase = Easing.bezier(0.2, 0.8, 0.3, 1);
/** Progress 0..1 at `seconds` of a CSS animation of `duration` s starting at `delay` s, with its timing function */
export function progress(seconds: number, delay: number, duration: number, easing: (t: number) => number = splashEase) {
  return easing(interpolate(seconds, [delay, delay + duration], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
}

/** The mark, still */
export function Mark({ size, id = "mark" }: { size: number; id?: string }) {
  return <AnimatedMark size={size} id={id} seconds={1e6} />;
}

/**
 * The installed app's startup animation of the mark (web/components/layout/AppSplash.tsx, its keyframes in
 * web/app/globals.css), at `seconds` into it, the site's timings stretched by `slow`: the mark fades and grows in, its
 * line draws itself, the shuttle drops cork first into the dip with a little squash and settles (done at 0.95 s × slow).
 */
export function AnimatedMark({ size, seconds, slow = 1, id }: { size: number; seconds: number; slow?: number; id: string }) {
  const s = seconds / slow;
  // splash-mark: from opacity 0 and scale 0.92, 0.4 s
  const mark = progress(s, 0, 0.4);
  // splash-line: the dash offset from 1 to 0, 0.6 s after 0.1 s
  const line = progress(s, 0.1, 0.6, Easing.bezier(0.4, 0, 0.2, 1));
  // splash-cork, 0.5 s after 0.45 s: from 14 above (opacity 0) to landing squashed at 55%, a little rebound at 80%, settled
  const c = progress(s, 0.45, 0.5, Easing.bezier(0.3, 0, 0.3, 1));
  const corkY = interpolate(c, [0, 0.55, 0.8, 1], [-14, 0, -1, 0]);
  const corkSx = interpolate(c, [0, 0.55, 0.8, 1], [1, 1.08, 0.97, 1]);
  const corkSy = interpolate(c, [0, 0.55, 0.8, 1], [1, 0.88, 1.04, 1]);
  const corkOpacity = interpolate(c, [0, 0.55], [0, 1], { extrapolateRight: "clamp" });

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ opacity: mark, transform: `scale(${0.92 + 0.08 * mark})`, flexShrink: 0 }}>
      <clipPath id={id}>
        <rect width="32" height="32" rx="7" />
      </clipPath>
      <rect width="32" height="32" rx="7" fill="#000" />
      <g clipPath={`url(#${id})`}>
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
  );
}
