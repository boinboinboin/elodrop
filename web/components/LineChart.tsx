"use client";

// Weekly series on one chart, drawn as SVG: a player's rating in each discipline, a club's
// strength, two players head to head. `series` is [{ label, from, values, slot?, ranks?, counts?,
// clubs? }]: `from` is the Monday of the series' first week and values[i] the value at the end of
// week i (null breaks the line). `slot` is the series' fixed palette position (default: its
// position in the list).
// A single series with `clubs` ([week index, club], ...) is coloured by the club played for at the
// time, with a club legend; several series get a legend of their labels.
// `ranks` and `counts` show in the tooltip as "#3 of 89 <rankOf>". With `rank`, the values are
// ranks: "#12" on a log scale with #1 at the top. `decimals` and `signed` format the values.
// Hover or focus and use the arrow keys (PageUp/PageDown a year, Home/End) to read values.
import { motion } from "motion/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { dayAt, weekAt } from "@/lib/format";
import { COLORS, MARGIN, OTHER_COLOR, PALETTE, WEEK, DAY, formatNumber, logDomain, yDomain, yearTicks } from "@/lib/chart";

export interface ChartSeries {
  label: string;
  from: string;
  values: (number | null)[];
  slot?: number;
  ranks?: (number | null)[];
  counts?: (number | null)[];
  clubs?: [number, string][];
}

interface Props {
  series: ChartSeries[];
  label?: string;
  rank?: boolean;
  rankOf?: string;
  decimals?: number;
  signed?: boolean;
  className?: string;
}

// The detail box's gliding: short, so it keeps up with the pointer
const GLIDE = { duration: 0.18, ease: "easeOut" } as const;

const Swatch = ({ color }: { color: string }) => <span className="inline-block w-3 h-1 rounded-full shrink-0" style={{ background: color }} />;

export default function LineChart({ series: input, label = "Rating", rank = false, rankOf = "", decimals = 0, signed = false, className = "relative h-80" }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setSize({ width: el.clientWidth, height: el.clientHeight }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Weeks on one axis from the earliest start; per series its offset and colours
  const { start, weeks, series, clubColors } = useMemo(() => {
    const starts = input.map((s) => Date.parse(`${s.from}T00:00:00Z`));
    const start = Math.min(...starts);
    const clubColors = new Map<string, string>();
    const series = input.map((s, i) => {
      const offset = Math.round((starts[i] - start) / WEEK);
      const color = PALETTE[s.slot ?? i];
      // Per point colour: by club period for a single series with clubs
      let colors: string[] | null = null;
      if (input.length === 1 && s.clubs?.length) {
        for (const [, club] of s.clubs) if (!clubColors.has(club)) clubColors.set(club, PALETTE[clubColors.size] ?? OTHER_COLOR);
        let period = -1;
        colors = s.values.map((_, w) => {
          while ((s.clubs![period + 1]?.[0] ?? Infinity) <= w) period++;
          return clubColors.get(s.clubs![Math.max(period, 0)][1]) ?? COLORS.series;
        });
      }
      return { ...s, offset, color, colors };
    });
    const weeks = Math.max(...series.map((s) => s.offset + s.values.length));
    return { start, weeks, series, clubColors };
  }, [input]);

  const time = (week: number) => start + (week * 7 + 6) * DAY;
  const value = (s: (typeof series)[number], week: number) => s.values[week - s.offset] ?? null;
  const clubAt = (s: (typeof series)[number], week: number) => {
    if (!s.clubs?.length) return null;
    const i = week - s.offset;
    let club = s.clubs[0][1];
    for (const [w, c] of s.clubs) if (w <= i) club = c;
    return club;
  };
  const fmt = (v: number) => (rank ? `#${formatNumber(v)}` : formatNumber(v, decimals, signed));

  const all = series.flatMap((s) => s.values).filter((v): v is number => v !== null);
  const { width, height } = size;
  const ready = width > 0 && height > 0 && all.length > 0;
  const domain = rank ? logDomain(Math.min(...all), Math.max(...all)) : yDomain(Math.min(...all), Math.max(...all));
  const plot = { left: MARGIN.left, right: width - (series.length === 1 ? MARGIN.right : MARGIN.rightWithoutLabel), top: MARGIN.top, bottom: height - MARGIN.bottom };
  const t0 = time(0);
  const t1 = time(weeks - 1);
  const x = (t: number) => plot.left + ((t - t0) / (t1 - t0 || 1)) * (plot.right - plot.left);
  const y = rank
    ? (v: number) => plot.top + ((Math.log(v) - Math.log(domain.yMin)) / (Math.log(domain.yMax) - Math.log(domain.yMin) || 1)) * (plot.bottom - plot.top)
    : (v: number) => plot.bottom - ((v - domain.yMin) / (domain.yMax - domain.yMin)) * (plot.bottom - plot.top);

  // The nearest week with a value in any series
  const hasValue = (week: number) => series.some((s) => value(s, week) !== null);
  const nearest = (px: number) => {
    const w = Math.min(weeks - 1, Math.max(0, Math.round(((px - plot.left) / (plot.right - plot.left)) * (weeks - 1))));
    for (let d = 0; d < weeks; d++) {
      if (w - d >= 0 && hasValue(w - d)) return w - d;
      if (w + d < weeks && hasValue(w + d)) return w + d;
    }
    return w;
  };
  // Touch: holding still on the chart shows the values (as hovering does), and sliding sideways while
  // holding moves through the weeks. A quick swipe still scrolls the page; the values stay after
  // lifting the finger, and a quick tap hides them.
  const press = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number; holding: boolean } | null>(null);
  const HOLD_MS = 300;
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    const x = e.nativeEvent.offsetX;
    const timer = setTimeout(() => {
      if (!press.current) return;
      press.current.holding = true;
      setActive(nearest(press.current.x));
    }, HOLD_MS);
    press.current = { timer, x, y: e.clientY, holding: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const x = e.nativeEvent.offsetX;
    if (e.pointerType === "mouse") return setActive(nearest(x));
    const p = press.current;
    if (!p) return;
    if (p.holding) return setActive(nearest(x));
    // Moved before the hold: a swipe, not a hold
    if (Math.abs(x - p.x) > 8 || Math.abs(e.clientY - p.y) > 8) {
      clearTimeout(p.timer);
      press.current = null;
    } else p.x = x;
  };
  const onPointerEnd = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    const p = press.current;
    if (p && !p.holding) {
      clearTimeout(p.timer);
      setActive(null); // a quick tap hides the values
    }
    press.current = null;
  };
  useEffect(() => () => clearTimeout(press.current?.timer), []);
  // While holding, the page mustn't scroll: a slight vertical drift while sliding would otherwise
  // start a scroll, and the browser would cancel the touch (sliding stops until the next hold).
  // A non-passive listener, as React's touch listeners are passive and can't prevent scrolling.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (press.current?.holding) e.preventDefault();
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, []);

  const onKey = (event: React.KeyboardEvent) => {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, PageDown: -52, PageUp: 52, Home: -Infinity, End: Infinity };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const direction = moves[event.key] > 0 ? 1 : -1;
    let w = Math.min(weeks - 1, Math.max(0, (active ?? weeks - 1) + moves[event.key]));
    while (!hasValue(w) && w > 0 && w < weeks - 1) w += direction;
    if (hasValue(w)) setActive(w);
  };

  // Lines: per series, segments broken at nulls; a single series with clubs changes colour per club
  const paths = series.flatMap((s, si) => {
    const out: { d: string; color: string; key: string }[] = [];
    let d = "";
    let color = s.color;
    let prev: { px: number; py: number } | null = null;
    s.values.forEach((v, i) => {
      if (v === null) {
        if (d) out.push({ d, color, key: `${si}-${i}` });
        d = "";
        prev = null;
        return;
      }
      const px = x(time(s.offset + i));
      const py = y(v);
      const c = s.colors?.[i] ?? s.color;
      if (d && c !== color) {
        out.push({ d, color, key: `${si}-${i}` });
        d = prev ? `M${prev.px.toFixed(1)},${prev.py.toFixed(1)}` : "";
      }
      color = c;
      d += `${d ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`;
      prev = { px, py };
    });
    if (d) out.push({ d, color, key: `${si}-end` });
    return out;
  });

  const ends = series.map((s) => {
    const last = s.values.findLastIndex((v) => v !== null);
    return last >= 0 ? { s, week: s.offset + last, v: s.values[last] as number, color: s.colors?.[last] ?? s.color } : null;
  });

  const legend =
    series.length > 1
      ? series.map((s) => ({ label: s.label, color: s.color }))
      : clubColors.size > 1
        ? [...clubColors].map(([club, color]) => ({ label: club, color }))
        : [];

  // The detail box's size, measured once shown, to keep it inside the chart
  const tip = useRef<HTMLDivElement>(null);
  const [tipSize, setTipSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    if (active === null || !tip.current) return;
    const { offsetWidth, offsetHeight } = tip.current;
    if (offsetWidth !== tipSize.width || offsetHeight !== tipSize.height) setTipSize({ width: offsetWidth, height: offsetHeight });
  }, [active, tipSize.width, tipSize.height]);
  const tooltip = (() => {
    if (active === null || !ready) return null;
    const px = x(time(active));
    let top = plot.bottom;
    const rows = series.flatMap((s, i) => {
      const v = value(s, active);
      if (v === null) return [];
      top = Math.min(top, y(v));
      const r = s.ranks?.[active - s.offset];
      const c = s.counts?.[active - s.offset];
      const club = series.length === 1 ? clubAt(s, active) : null;
      const detail = rank ? (c ? `of ${formatNumber(c)} ${rankOf}`.trim() : "") : r ? `#${r} of ${formatNumber(c ?? 0)} ${rankOf}`.trim() : "";
      const name = series.length > 1 ? s.label : (club ?? "");
      return [{ key: i, color: s.colors?.[active - s.offset] ?? s.color, v, y: y(v), text: [name, detail].filter(Boolean).join(" · ") }];
    });
    // Highest on the chart first (on a rank chart: the best rank)
    rows.sort((a, b) => a.y - b.y);
    return { px, top, rows };
  })();

  const lastWeek = ends.filter(Boolean).at(-1);
  const ariaLabel = ready
    ? `${label} history${series.length > 1 ? ` in ${series.map((s) => s.label).join(", ")}` : ""}, from ${dayAt(t0)} to ${dayAt(t1)}${lastWeek && series.length === 1 ? `, ending at ${fmt(lastWeek.v)}` : ""}. Use the arrow keys to read values.`
    : label;

  return (
    <div>
      {legend.length > 0 && (
        <ul className="flex flex-wrap gap-x-5 gap-y-1 mb-3 text-sm text-gray-700" aria-label={series.length > 1 ? "Series" : "Clubs"}>
          {legend.map((l) => (
            <li key={l.label} className="flex items-center gap-1.5">
              <Swatch color={l.color} />
              {l.label}
            </li>
          ))}
        </ul>
      )}
      {/* No text selection or iOS long-press menu on the chart, where holding shows the values */}
      <div ref={box} className={`${className} select-none [-webkit-touch-callout:none]`}>
        {ready && (
          <svg
            width={width}
            height={height}
            role="img"
            tabIndex={0}
            aria-label={ariaLabel}
            className="block outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            onKeyDown={onKey}
            onBlur={() => setActive(null)}
          >
            {domain.ticks.map((v) => (
              <g key={v}>
                <line x1={plot.left} x2={plot.right} y1={y(v)} y2={y(v)} stroke={COLORS.grid} />
                <text x={plot.left - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" fill={COLORS.axis} fontSize={12} style={{ fontVariantNumeric: "tabular-nums" }}>
                  {rank ? `#${formatNumber(v)}` : formatNumber(v, domain.decimals, signed)}
                </text>
              </g>
            ))}
            {yearTicks(t0, t1, plot.right - plot.left).map((year) => {
              const px = x(Date.UTC(year, 0, 1));
              return (
                <g key={year}>
                  <line x1={px} x2={px} y1={plot.bottom} y2={plot.bottom + 4} stroke={COLORS.axis} />
                  <text x={px} y={plot.bottom + 18} textAnchor="middle" fill={COLORS.axis} fontSize={12}>
                    {year}
                  </text>
                </g>
              );
            })}
            {paths.map((p) => (
              <path key={p.key} d={p.d} fill="none" stroke={p.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            ))}
            {ends.map(
              (e, i) =>
                e && (
                  <g key={i}>
                    <circle cx={x(time(e.week))} cy={y(e.v)} r={4} fill={e.color} stroke={COLORS.surface} strokeWidth={2} />
                    {series.length === 1 && (
                      <text x={x(time(e.week)) + 8} y={y(e.v)} dominantBaseline="middle" fill={COLORS.text} fontSize={12} fontWeight={600} style={{ fontVariantNumeric: "tabular-nums" }}>
                        {fmt(e.v)}
                      </text>
                    )}
                  </g>
                ),
            )}
            {tooltip && (
              <>
                <line x1={tooltip.px} x2={tooltip.px} y1={plot.top} y2={plot.bottom} stroke={COLORS.crosshair} />
                {series.map((s, i) => {
                  const v = value(s, active!);
                  return v === null ? null : <circle key={i} cx={tooltip.px} cy={y(v)} r={4} fill={s.colors?.[active! - s.offset] ?? s.color} stroke={COLORS.surface} strokeWidth={2} />;
                })}
              </>
            )}
            <rect
              x={plot.left}
              y={plot.top}
              width={Math.max(0, plot.right - plot.left)}
              height={Math.max(0, plot.bottom - plot.top)}
              fill="transparent"
              // pan-y: vertical swipes scroll the page, sideways moves come here (for sliding while holding)
              style={{ touchAction: "pan-y" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerEnd}
              onPointerCancel={onPointerEnd}
              onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
              onContextMenu={(e) => e.preventDefault()}
            />
          </svg>
        )}
        {tooltip && (
          <motion.div
            ref={tip}
            // To the right of the crosshair, or to its left when it doesn't fit, and always inside the
            // chart (as wide as the chart at most, the lines wrapping). layout: it glides to each new
            // place, and its lines glide into their new order (highest first) instead of jumping
            layout="position"
            transition={GLIDE}
            className="absolute z-10 pointer-events-none bg-white border border-gray-200 shadow-sm px-3 py-2 text-sm max-w-full"
            style={{
              left: Math.max(0, Math.min(tooltip.px + 12 + tipSize.width <= width ? tooltip.px + 12 : tooltip.px - 12 - tipSize.width, width - tipSize.width)),
              top: Math.max(0, Math.min(tooltip.top - 24, height - tipSize.height)),
            }}
          >
            <span className="block text-gray-600 mb-1" title={`Week ending ${dayAt(time(active!))}`}>{weekAt(time(active!))}</span>
            {tooltip.rows.map((r) => (
              <motion.span key={r.key} layout="position" transition={GLIDE} className="flex items-center gap-1.5">
                <Swatch color={r.color} />
                <strong className="tabular-nums">{fmt(r.v)}</strong>
                {r.text && <span className="text-gray-600">{r.text}</span>}
              </motion.span>
            ))}
          </motion.div>
        )}
      </div>
      {/* Touch screens only: there is no hovering there */}
      <p className="hidden pointer-coarse:block mt-1 text-xs text-gray-500">Hold the chart to see the values; slide to move through the weeks</p>
    </div>
  );
}
