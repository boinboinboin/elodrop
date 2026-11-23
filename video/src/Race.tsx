import { useMemo, useState } from "react";
import { AbsoluteFill, Img, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Outro } from "./Outro";

export const LISTS = {
  men: "Herresingle",
  women: "Damesingle",
  mensDoubles: "Herredouble",
  womensDoubles: "Damedouble",
  "mixedDoubles-men": "Mixdouble – herrer",
  "mixedDoubles-women": "Mixdouble – damer",
} as const;

export interface RacePlayer {
  id: number;
  name: string;
  /** Rating at the end of each week, null while inactive */
  values: (number | null)[];
  /** The club played for, as periods [firstWeek, club] */
  clubs: [number, string][];
}
export interface RaceData {
  list: keyof typeof LISTS;
  /** Each week's last day (Sunday) */
  weeks: string[];
  players: RacePlayer[];
  /** Each week's top 10 ids, best first */
  top: number[][];
  /** Club name -> logo file in public/ */
  logos: Record<string, string>;
}
export type RaceProps = {
  list: keyof typeof LISTS;
  /** The first week shown (a date; the week ending on or after it) */
  from: string;
  /** Video frames per week (30 fps): 11 is a week in about 0.37 s, about 6 minutes from autumn 2008 */
  framesPerWeek: number;
  data: RaceData | null;
};

// The site's chart colours (web/app/globals.css), and two more so ten bars can all differ
const COLORS = ["#3061d8", "#ca5956", "#129495", "#a7951e", "#e761cc", "#008300", "#6250d6", "#e34948", "#b45309", "#334155"];
const INK = "#111827";
const MUTED = "#6b7280";
const GRID = "#e7e5e4";
const ACCENT = "#f97316";
const ROWS = 10;
// Weeks either side averaged for the axis, so it glides instead of jumping with each result
const AXIS_SMOOTHING = 12;
// Places and ratings change over this many weeks (11 frames a week: about 0.9 s with the week itself), sampled this often
const SWAP_WEEKS = 1.5;
const SWAP_SAMPLES = 16;
// A rating's gain or loss shows beside it for this many frames (popping in, fading out at the end)
const DELTA_FRAMES = 50;
const GAIN = "#15803d"; // the site's green-700 and red-700, for good and bad
const LOSS = "#b91c1c";

// The ending: the race runs on until every bar has settled, the final standings hold, then fade into the logo
const SETTLE_WEEKS = SWAP_WEEKS + 1;
const HOLD_SECONDS = 5;
const FADE_SECONDS = 0.8;
const OUTRO_SECONDS = 4.5;

/** The first week shown, and the frames of the race (to the end of settling), the outro's start and the whole video */
export function timeline(data: RaceData, { from, framesPerWeek }: Pick<RaceProps, "from" | "framesPerWeek">, fps: number) {
  const start = Math.max(0, data.weeks.findIndex((w) => w >= from));
  const race = Math.ceil((data.weeks.length - 1 - start + SETTLE_WEEKS) * framesPerWeek);
  const outro = race + Math.round(HOLD_SECONDS * fps);
  return { start, race, outro, total: outro + Math.round((FADE_SECONDS + OUTRO_SECONDS) * fps) };
}

// Text width in the video's font, to fit a name into its bar
let canvas: HTMLCanvasElement | null = null;
function textWidth(text: string, size: number, weight: number) {
  canvas ??= document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = `${weight} ${size}px Redaction`;
  return ctx.measureText(text).width;
}

const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
const ease = (f: number) => f * f * (3 - 2 * f);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function useFont() {
  const [handle] = useState(() => delayRender("Loading Redaction"));
  useState(() => {
    const faces = [
      new FontFace("Redaction", `url(${staticFile("fonts/Redaction-Regular.woff2")})`, { weight: "400" }),
      new FontFace("Redaction", `url(${staticFile("fonts/Redaction-Bold.woff2")})`, { weight: "700" }),
    ];
    Promise.all(faces.map((f) => f.load()))
      .then((loaded) => loaded.forEach((f) => (document.fonts as unknown as Set<FontFace>).add(f)))
      .finally(() => continueRender(handle));
  });
}

/** The elodrop mark (web/utils/logo.ts): white on a black rounded square */
function Mark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <clipPath id="square">
        <rect width="32" height="32" rx="7" />
      </clipPath>
      <rect width="32" height="32" rx="7" fill="#000" />
      <g clipPath="url(#square)">
        <path d="M-1 9H3L6.4 12.8L9 11L12.4 14.6L14.2 17.4H21.8L25.2 11.6H33" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M14.6 19.6V22A3.4 3.4 0 0 0 21.4 22V19.6Z" fill={ACCENT} />
      </g>
    </svg>
  );
}

function ClubLogo({ club, logo, size }: { club: string; logo?: string; size: number }) {
  const box = { width: size, height: size, borderRadius: size / 2, flexShrink: 0, background: "#fff", border: `2px solid ${GRID}` };
  if (logo)
    return (
      <div style={{ ...box, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <Img src={staticFile(logo)} style={{ width: "78%", height: "78%", objectFit: "contain" }} />
      </div>
    );
  const initials = club.replace(/[^\p{L} ]/gu, "").split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 3) || "?";
  return (
    <div style={{ ...box, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: size * 0.34, fontWeight: 700 }}>
      {initials.toUpperCase()}
    </div>
  );
}

function niceStep(range: number) {
  for (const step of [25, 50, 100, 200, 250, 500, 1000]) if (range / step <= 5) return step;
  return 1000;
}

export function Race({ data, from, framesPerWeek }: RaceProps) {
  useFont();
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const d = data!;
  const last = d.weeks.length - 1;
  const times = timeline(d, { from, framesPerWeek }, fps);
  const start = times.start;

  // Per week: the 10th's and the leader's rating, smoothed for the axis
  const axis = useMemo(() => {
    const value = (id: number, w: number) => d.players.find((p) => p.id === id)!.values[w] ?? 0;
    const lo = d.top.map((ids, w) => value(ids[ids.length - 1], w));
    const hi = d.top.map((ids, w) => value(ids[0], w));
    const smooth = (xs: number[]) =>
      xs.map((_, w) => {
        let sum = 0, n = 0;
        for (let i = Math.max(start, w - AXIS_SMOOTHING); i <= Math.min(last, w + AXIS_SMOOTHING); i++) (sum += xs[i]), n++;
        return sum / n;
      });
    return { lo: smooth(lo), hi: smooth(hi) };
  }, [d, start, last]);

  // Colours: players in the top 10 at the same time get different ones where possible (greedy, the
  // longest-staying first, each taking the colour it shares the fewest weeks on screen with)
  const colorOf = useMemo(() => {
    const together = new Map<string, number>();
    const weeksIn = new Map<number, number>();
    for (const ids of d.top.slice(start))
      for (const a of ids) {
        weeksIn.set(a, (weeksIn.get(a) ?? 0) + 1);
        for (const b of ids) if (a < b) together.set(`${a} ${b}`, (together.get(`${a} ${b}`) ?? 0) + 1);
      }
    const overlap = (a: number, b: number) => together.get(a < b ? `${a} ${b}` : `${b} ${a}`) ?? 0;
    const colors = new Map<number, string>();
    for (const id of [...weeksIn.keys()].sort((a, b) => weeksIn.get(b)! - weeksIn.get(a)!)) {
      const clash = COLORS.map((c) => [...colors].reduce((sum, [other, oc]) => sum + (oc === c ? overlap(id, other) : 0), 0));
      colors.set(id, COLORS[clash.indexOf(Math.min(...clash))]);
    }
    return colors;
  }, [d, start]);

  // t runs on past the last week while the bars settle (SETTLE_WEEKS); tw is the week shown
  const t = start + Math.min(frame, times.race) / framesPerWeek;
  const tw = Math.min(last, t);
  const w0 = Math.floor(tw);
  const w1 = Math.min(last, w0 + 1);
  const f = tw - w0;
  const lo = lerp(axis.lo[w0], axis.lo[w1], f);
  const hi = lerp(axis.hi[w0], axis.hi[w1], f);
  // The axis starts below the 10th, so the 10th's bar is about half the leader's
  const axisMin = lo - (hi - lo) * 1.1 - 40;
  const axisMax = hi + (hi - lo) * 0.04 + 10;

  const portrait = height > width;
  const pad = portrait ? 64 : 80;
  const headerH = portrait ? 330 : 250;
  const footerH = portrait ? 260 : 110;
  const chartTop = headerH;
  const chartH = height - headerH - footerH;
  const rowH = chartH / ROWS;
  const barH = rowH * 0.78;
  const rankW = portrait ? 64 : 70;
  const logoSize = barH * 0.92;
  const barLeft = pad + rankW + logoSize + 16;
  const valueW = portrait ? 150 : 150;
  const barMaxW = width - pad - valueW - barLeft;
  const x = (v: number) => clamp(((v - axisMin) / (axisMax - axisMin)) * barMaxW, 0, barMaxW);

  const rankOf = (w: number, id: number) => {
    const i = d.top[Math.max(start, w)].indexOf(id);
    return i < 0 ? ROWS + 0.4 : i;
  };
  // A week's value eased into the next, averaged over the last SWAP_WEEKS weeks: places and ratings glide from one
  // week to the next instead of jumping, and come to rest once the last week is reached
  const windowed = (at: (w: number) => number) => {
    let sum = 0;
    for (let k = 0; k <= SWAP_SAMPLES; k++) {
      const tau = clamp(t - (SWAP_WEEKS * k) / SWAP_SAMPLES, start, last);
      const a = Math.floor(tau);
      sum += lerp(at(a), at(Math.min(last, a + 1)), ease(tau - a));
    }
    return sum / (SWAP_SAMPLES + 1);
  };
  const valueAt = (p: RacePlayer, w: number) => p.values[w] ?? p.values[w + 1] ?? p.values[w - 1] ?? 0;
  // The latest change of rating that started within DELTA_FRAMES: its size and how many frames ago it started
  const deltaOf = (p: RacePlayer) => {
    for (let a = Math.min(last - 1, Math.floor(t)); a >= start && (t - a) * framesPerWeek <= DELTA_FRAMES; a--) {
      const before = p.values[a], after = p.values[a + 1];
      if (before !== null && after !== null && Math.round(after) !== Math.round(before))
        return { change: Math.round(after) - Math.round(before), age: (t - a) * framesPerWeek };
    }
    return null;
  };
  const rows = d.players
    .map((p) => {
      const pos = windowed((w) => rankOf(w, p.id));
      if (pos >= ROWS) return null;
      const w = f < 0.5 ? w0 : w1;
      const club = [...p.clubs].reverse().find(([from]) => from <= w)?.[1] ?? "";
      return { p, pos, value: windowed((w) => valueAt(p, w)), delta: deltaOf(p), club, color: colorOf.get(p.id) ?? COLORS[0] };
    })
    .filter((r) => r !== null)
    .sort((a, b) => b.pos - a.pos);

  const step = niceStep(axisMax - axisMin);
  const ticks = [];
  for (let v = Math.ceil(axisMin / step) * step; v <= axisMax; v += step) ticks.push(v);

  const date = new Date(d.weeks[Math.round(tw)] + "T12:00:00Z");
  const month = date.toLocaleDateString("nb-NO", { month: "long", timeZone: "UTC" });
  const year = date.getUTCFullYear();
  // The ISO week number (the week's Thursday decides its year), so the clock visibly moves in quiet weeks too
  const thursday = new Date(date.getTime() - 3 * 86400000);
  const week = 1 + Math.floor((thursday.getTime() - Date.UTC(thursday.getUTCFullYear(), 0, 1)) / (7 * 86400000));
  const nameSize = portrait ? barH * 0.34 : barH * 0.4;

  return (
    <AbsoluteFill style={{ background: "#fff", fontFamily: "Redaction, Georgia, serif", color: INK }}>
      {/* Header */}
      <div style={{ position: "absolute", left: pad, right: pad, top: portrait ? 110 : 50 }}>
        <div style={{ fontSize: portrait ? 92 : 76, fontWeight: 700, lineHeight: 1 }}>{LISTS[d.list]}</div>
        <div style={{ fontSize: portrait ? 40 : 32, color: MUTED, marginTop: portrait ? 18 : 10 }}>Topp 10 i Norge etter Elo-rating</div>
      </div>

      {/* Axis grid and labels */}
      {ticks.map((v) => (
        <div key={v} style={{ position: "absolute", left: barLeft + x(v), top: chartTop - 36, height: chartH + 36, borderLeft: `2px solid ${GRID}` }}>
          <div style={{ position: "absolute", top: 0, left: 8, fontSize: 24, color: MUTED, fontVariantNumeric: "tabular-nums" }}>{v}</div>
        </div>
      ))}

      {/* Fixed rank numbers */}
      {Array.from({ length: ROWS }, (_, i) => (
        <div
          key={i}
          style={{ position: "absolute", left: pad, width: rankW - 12, top: chartTop + i * rowH + (rowH - barH) / 2, height: barH, display: "flex", alignItems: "center", justifyContent: "flex-end", fontSize: barH * 0.4, fontWeight: 700, color: MUTED }}
        >
          {i + 1}
        </div>
      ))}

      {/* Bars */}
      <div style={{ position: "absolute", left: 0, right: 0, top: chartTop, height: chartH, overflow: "hidden" }}>
        {rows.map(({ p, pos, value, delta, club, color }) => {
          // The name shrinks to fit its bar (to 70%), and is cut short with … beyond that
          const room = Math.max(x(value), 8) - 36;
          // fitted to 94% of the room: the page lays text out a little wider or narrower than the canvas measures it,
          // and a name fitted exactly would flicker between whole and cut short as the bar's width changes
          const size = Math.max(nameSize * 0.7, Math.min(nameSize, (nameSize * room * 0.94) / textWidth(p.name, nameSize, 700)));
          return (
          <div
            key={p.id}
            style={{ position: "absolute", left: pad + rankW, top: pos * rowH + (rowH - barH) / 2, height: barH, display: "flex", alignItems: "center", gap: 16, opacity: clamp(ROWS - pos, 0, 1) }}
          >
            <ClubLogo club={club} logo={d.logos[club]} size={logoSize} />
            <div style={{ width: Math.max(x(value), 8), height: barH, background: color, borderRadius: 8, flexShrink: 0 }} />
            <div style={{ fontSize: barH * (portrait ? 0.36 : 0.46), fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{Math.round(value)}</div>
            {delta && (
              <div
                style={{
                  fontSize: barH * (portrait ? 0.3 : 0.38),
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  color: delta.change > 0 ? GAIN : LOSS,
                  opacity: interpolate(delta.age, [0, 6, DELTA_FRAMES - 15, DELTA_FRAMES], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                  transform: `scale(${interpolate(delta.age, [0, 6, 10], [0.6, 1.12, 1], { extrapolateRight: "clamp" })})`,
                  transformOrigin: "left center",
                }}
              >
                {delta.change > 0 ? `+${delta.change}` : `−${-delta.change}`}
              </div>
            )}
            {/* Name and club over the bar */}
            <div style={{ position: "absolute", left: logoSize + 16 + 18, top: 0, width: room, height: barH, display: "flex", flexDirection: "column", justifyContent: "center", color: "#fff", whiteSpace: "nowrap", textShadow: "0 1px 3px rgba(0,0,0,0.35)" }}>
              <div style={{ fontSize: size, fontWeight: 700, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
              <div style={{ fontSize: nameSize * 0.68, lineHeight: 1.15, opacity: 0.92, overflow: "hidden", textOverflow: "ellipsis" }}>{club}</div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Date: in the footer (portrait) or the header (landscape), right-aligned */}
      <div
        style={{ position: "absolute", right: pad, ...(portrait ? { bottom: 96 } : { top: 40 }), display: "flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1 }}
      >
        <div style={{ fontSize: portrait ? 120 : 104, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{year}</div>
        <div style={{ fontSize: portrait ? 44 : 38, color: MUTED, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
          {month}
          <span style={{ color: "#9ca3af", fontSize: "0.8em" }}> · uke {week}</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: "absolute", left: pad, right: pad, bottom: portrait ? 120 : 36, display: "flex", alignItems: "center", gap: 20 }}>
        <Mark size={portrait ? 72 : 56} />
        <div style={{ fontSize: portrait ? 48 : 40, fontWeight: 700 }}>elodrop.no</div>
      </div>
      {/* The ending: after the hold, the logo animation fades in over the final standings */}
      <Sequence from={times.outro}>
        <AbsoluteFill style={{ opacity: interpolate(frame - times.outro, [0, FADE_SECONDS * fps], [0, 1], { extrapolateRight: "clamp" }) }}>
          <Sequence from={Math.round(FADE_SECONDS * fps * 0.6)}>
            <Outro />
          </Sequence>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
}
