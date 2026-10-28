"use client";

// How the ratings spread (data/distribution.ts): a histogram of the players by rating in 50-point
// bins, with the normal distribution of the same average and spread as a dashed line over it, so
// it shows how far the ratings are from a bell curve. Buttons choose the discipline, and the ranked
// players (the default) or everyone ever rated. Hovering, touching or the arrow keys show a bin's players.
import { useEffect, useRef, useState } from "react";
import { NerdOnly } from "@/components/how-it-works/NerdMode";
import { toggleClass } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";
import type { Pool } from "@/types";
import { COLORS, niceStep } from "@/utils/chart";
import { BIN, type Distribution, type Distributions, RANGE } from "@/utils/distribution";
import { POOL_KEYS } from "@/utils/pools";
import { P0 } from "@/utils/rating";

// left: room for the counts (narrower on phones)
const MARGIN = { top: 16, right: 12, bottom: 28, left: 48, leftNarrow: 36 };
const HEIGHT = 300;
type Scope = "all" | "ranked";

/** The normal distribution's players per bin at rating r */
const normal = (d: Distribution, r: number) => (d.players * BIN * Math.exp(-(((r - d.mean) / d.sd) ** 2) / 2)) / (d.sd * Math.sqrt(2 * Math.PI));

export default function RatingDistribution({ data, color }: { data: Distributions; color: string }) {
  const { t, plural, num, pct, pools } = useI18n();
  const [pool, setPool] = useState<Pool>("men");
  const [scope, setScope] = useState<Scope>("ranked");
  const [active, setActive] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const d = data[pool][scope];
  const n = d.bins.length;
  const curveMax = normal(d, d.mean);
  const step = niceStep(Math.max(...d.bins, curveMax));
  const yMax = Math.ceil(Math.max(...d.bins, curveMax) / step) * step;
  const plot = { left: width < 480 ? MARGIN.leftNarrow : MARGIN.left, right: width - MARGIN.right, top: MARGIN.top, bottom: HEIGHT - MARGIN.bottom };
  const x = (r: number) => plot.left + ((r - RANGE.from) / (RANGE.to - RANGE.from)) * (plot.right - plot.left);
  const y = (v: number) => plot.bottom - (v / yMax) * (plot.bottom - plot.top);
  const slot = (plot.right - plot.left) / n;
  // A 2 px gap between the bars, rounded tops (square at the baseline)
  const barWidth = Math.max(1, slot - 2);
  const radius = Math.min(4, barWidth / 2);
  const bar = (i: number) => {
    const x0 = plot.left + i * slot + 1;
    const top = y(d.bins[i]);
    const r = Math.min(radius, plot.bottom - top);
    return `M${x0},${plot.bottom}V${top + r}Q${x0},${top} ${x0 + r},${top}H${x0 + barWidth - r}Q${x0 + barWidth},${top} ${x0 + barWidth},${top + r}V${plot.bottom}Z`;
  };
  const curve = Array.from({ length: 120 }, (_, i) => {
    const r = RANGE.from + ((RANGE.to - RANGE.from) * i) / 119;
    return `${i ? "L" : "M"}${x(r).toFixed(1)},${y(normal(d, r)).toFixed(1)}`;
  }).join("");
  const ticks = Array.from({ length: Math.floor(yMax / step) + 1 }, (_, i) => i * step);
  const xTicks = [500, 1000, 1500, 2000, 2500];

  // The active bin's players and the share rated at least as high
  const tip =
    active === null
      ? null
      : {
          from: RANGE.from + active * BIN,
          players: d.bins[active],
          top: d.bins.slice(active).reduce((s, c) => s + c, 0) / d.players,
        };
  const binAt = (px: number) => Math.min(n - 1, Math.max(0, Math.floor((px - plot.left) / slot)));
  const onKey = (e: React.KeyboardEvent) => {
    const next = { ArrowRight: (active ?? -1) + 1, ArrowLeft: (active ?? n) - 1, Home: 0, End: n - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setActive(Math.min(n - 1, Math.max(0, next)));
  };
  const summary = t("howItWorks.spread.chartLabel", { pool: pools[pool], players: num(d.players), median: num(d.median), top10: num(d.top10) });

  return (
    <div className="bg-white p-4 sm:p-5 md:p-6 text-base">
      <h3 className="text-xl">{t("howItWorks.spread.chartTitle")}</h3>
      <p className="text-sm text-gray-600 mb-4">{t(scope === "all" ? "howItWorks.spread.subtitleAll" : "howItWorks.spread.subtitleRanked")}</p>
      {/* The choices in one row above the chart: the discipline, then whom it counts */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4">
        <div role="group" aria-label={t("howItWorks.spread.discipline")} className="flex flex-wrap gap-1">
          {POOL_KEYS.map((key) => (
            <button key={key} type="button" aria-pressed={pool === key} onClick={() => setPool(key)} className={`${toggleClass(pool === key, "sm")} cursor-pointer`}>
              {t(`common.poolCodes.${key}`)}
              <span className="sr-only"> {pools[key]}</span>
            </button>
          ))}
        </div>
        <div role="group" aria-label={t("howItWorks.spread.who")} className="flex flex-wrap gap-1">
          {(["ranked", "all"] as const).map((key) => (
            <button key={key} type="button" aria-pressed={scope === key} onClick={() => setScope(key)} className={`${toggleClass(scope === key, "sm")} cursor-pointer`}>
              {t(`howItWorks.spread.${key}`)}
            </button>
          ))}
        </div>
      </div>

      <ul className="flex flex-wrap gap-x-5 gap-y-1 mb-2 text-sm text-gray-700" aria-label={t("common.chart.series")}>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="w-3 h-3 rounded-sm" style={{ background: color }} />
          {t("howItWorks.spread.players")}
        </li>
        <li className="flex items-center gap-1.5">
          <svg aria-hidden="true" width="18" height="4"><line x1="0" x2="18" y1="2" y2="2" strokeWidth="2" strokeDasharray="4 3" style={{ stroke: COLORS.text }} /></svg>
          {t("howItWorks.spread.normal")}
        </li>
      </ul>

      <div ref={box} className="relative select-none" style={{ height: HEIGHT }}>
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label={`${summary} ${t("common.chart.keys")}`}
            tabIndex={0}
            onKeyDown={onKey}
            onBlur={() => setActive(null)}
            onPointerMove={(e) => setActive(binAt(e.clientX - e.currentTarget.getBoundingClientRect().left))}
            onPointerDown={(e) => setActive(binAt(e.clientX - e.currentTarget.getBoundingClientRect().left))}
            onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
            className="block outline-none focus-visible:ring-2 focus-visible:ring-blue-500 touch-pan-y"
          >
            {ticks.map((v) => (
              <g key={v}>
                <line x1={plot.left} x2={plot.right} y1={y(v)} y2={y(v)} style={{ stroke: COLORS.grid }} />
                <text x={plot.left - 8} y={y(v)} dy="0.32em" textAnchor="end" fontSize={12} style={{ fill: COLORS.axis }}>{num(v)}</text>
              </g>
            ))}
            {xTicks.map((r) => (
              <text key={r} x={x(r)} y={plot.bottom + 18} textAnchor="middle" fontSize={12} style={{ fill: COLORS.axis }}>{num(r)}</text>
            ))}
            {/* Where a new top-level player starts */}
            <line x1={x(P0)} x2={x(P0)} y1={plot.top} y2={plot.bottom} style={{ stroke: COLORS.crosshair }} />
            <text x={x(P0) + 4} y={plot.top + 4} dy="0.7em" fontSize={12} style={{ fill: COLORS.axis }}>{t("howItWorks.spread.start", { rating: num(P0) })}</text>
            {d.bins.map((count, i) =>
              count > 0 ? <path key={i} d={bar(i)} style={{ fill: color, opacity: active === null || active === i ? 1 : 0.45 }} className="transition-opacity duration-150" /> : null,
            )}
            <path d={curve} fill="none" strokeWidth={2} strokeDasharray="6 4" strokeLinecap="round" style={{ stroke: COLORS.text }} />
          </svg>
        )}
        {tip && width > 0 && (
          <div
            className="absolute z-10 pointer-events-none bg-white border border-gray-200 shadow-sm px-3 py-2 text-sm whitespace-nowrap"
            style={{
              left: Math.min(Math.max(0, x(tip.from + BIN / 2) - 80), width - 170),
              top: Math.max(0, y(d.bins[active!]) - 80),
            }}
          >
            <span className="block text-gray-600">{t("howItWorks.spread.range", { from: num(tip.from), to: num(tip.from + BIN - 1) })}</span>
            <strong className="block">{plural("howItWorks.spread.playersCount", tip.players, { count: num(tip.players) })}</strong>
            <span className="block text-gray-600">{t("howItWorks.spread.top", { share: pct(tip.top, tip.top < 0.01 ? 1 : 0) })}</span>
          </div>
        )}
      </div>
      <p className="hidden pointer-coarse:block mt-1 text-xs text-gray-500">{t("howItWorks.spread.touchHint")}</p>

      <dl className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Figure label={t("howItWorks.spread.half")} value={num(d.median)} />
        <Figure label={t("howItWorks.spread.top10")} value={num(d.top10)} />
        <Figure label={t("howItWorks.spread.top1")} value={num(d.top1)} />
        <Figure label={t("howItWorks.spread.rated")} value={num(d.players)} />
      </dl>
      <NerdOnly>
        <dl className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-sm">
          <Figure label={t("howItWorks.spread.mean")} value={num(d.mean)} mono />
          <Figure label={t("howItWorks.spread.sd")} value={num(d.sd)} mono />
          <Figure label={t("howItWorks.spread.skew")} value={num(d.skew, 2)} mono />
          <Figure label={t("howItWorks.spread.onMinimum")} value={num(d.onMinimum)} mono />
        </dl>
      </NerdOnly>
    </div>
  );
}

const Figure = ({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) => (
  <div className={mono ? "" : "bg-gray-50 p-3"}>
    <dt className="text-xs text-gray-600">{label}</dt>
    <dd className={mono ? "tabular-nums" : "text-xl font-semibold"}>{value}</dd>
  </div>
);
