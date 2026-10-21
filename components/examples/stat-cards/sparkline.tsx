"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SparkSeries {
  /** Tab label, e.g. "7D". */
  key: string;
  /** Word used in the caption, e.g. "past 7 days". */
  caption: string;
  points: number[];
  /** Label per point, same length as points. */
  labels: string[];
}

export interface SparklineStatCardProps {
  label?: string;
  unit?: string;
  series?: SparkSeries[];
  defaultKey?: string;
  className?: string;
}

const DAYS = ["Sep 26", "Sep 27", "Sep 28", "Sep 29", "Sep 30", "Oct 1", "Oct 2"];
const WEEKS = ["Aug 7", "Aug 14", "Aug 21", "Aug 28", "Sep 4", "Sep 11", "Sep 18", "Sep 25", "Oct 2"];
const MONTHS = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];

const DEFAULT_SERIES: SparkSeries[] = [
  { key: "7D", caption: "past 7 days", points: [1840, 2120, 1980, 2410, 2290, 2630, 2754], labels: DAYS },
  { key: "60D", caption: "past 60 days", points: [12400, 13150, 12890, 14020, 13700, 14980, 15420, 15110, 16240], labels: WEEKS },
  { key: "1Y", caption: "past year", points: [38e3, 41e3, 39.5e3, 44e3, 47e3, 46e3, 51e3, 55e3, 53e3, 58e3, 61e3, 64.8e3], labels: MONTHS },
];

const focus = "outline-none focus-visible:shadow-[var(--focus-ring)]";
const W = 300;
const H = 72;

function coords(points: number[]) {
  const min = Math.min(...points);
  const span = Math.max(...points) - min || 1;
  return points.map((p, i) => ({ x: (i / (points.length - 1)) * W, y: H - 6 - ((p - min) / span) * (H - 14) }));
}

/** Stat with a scrubbable sparkline: period tabs redraw the line, and pointer or arrow keys read out any point. */
export function SparklineStatCard({ label = "Active users", unit = "", series = DEFAULT_SERIES, defaultKey, className }: SparklineStatCardProps) {
  const reduce = useReducedMotion() ?? false;
  const baseId = React.useId();
  const [key, setKey] = React.useState(defaultKey ?? series[0]?.key);
  const [hover, setHover] = React.useState<number | null>(null);
  const s = series.find((x) => x.key === key) ?? series[0];
  const pts = coords(s.points);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const idx = hover ?? s.points.length - 1;
  const value = s.points[idx];
  const change = (s.points[s.points.length - 1] - s.points[0]) / s.points[0];
  const up = change >= 0;
  const fmt = (n: number) => n.toLocaleString("en-US") + unit;

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    setHover(Math.round(t * (s.points.length - 1)));
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const d2 = e.key === "ArrowRight" ? 1 : -1;
    setHover(Math.min(s.points.length - 1, Math.max(0, idx + d2)));
  }

  return (
    <section aria-label={label} className={cn("w-full max-w-[360px] rounded-xl border border-border bg-surface-raised p-5 shadow-sm", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-ink-muted">{label}</p>
          <div className="relative mt-1.5 h-9">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.p
                key={`${s.key}-${idx}`}
                initial={{ opacity: 0, filter: "blur(6px)", y: 4 }}
                animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                exit={{ opacity: 0, filter: "blur(6px)", y: -4 }}
                transition={{ duration: 0.18 }}
                className="font-display text-[32px] font-semibold leading-9 tracking-[-1px] text-ink tabular-nums"
              >
                {fmt(value)}
              </motion.p>
            </AnimatePresence>
          </div>
          <p className="mt-1 text-xs text-ink-subtle" aria-live="polite">
            {hover === null ? (
              <span className={cn("inline-flex items-center gap-1 font-medium", up ? "text-success" : "text-danger")}>
                {up ? <TrendingUp aria-hidden className="size-3.5" /> : <TrendingDown aria-hidden className="size-3.5" />}
                {up ? "Up" : "Down"} {Math.abs(change * 100).toFixed(1)}%<span className="font-normal text-ink-subtle">{s.caption}</span>
              </span>
            ) : (
              <span>{s.labels[idx]}</span>
            )}
          </p>
        </div>
        <div role="group" aria-label="Period" className="flex shrink-0 gap-0.5 rounded-full bg-surface-sunken p-0.5">
          {series.map((x) => {
            const on = x.key === s.key;
            return (
              <button
                key={x.key}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setKey(x.key);
                  setHover(null);
                }}
                className={cn("relative h-7 rounded-full px-2.5 font-mono text-[11px] transition-colors", on ? "text-ink" : "text-ink-subtle hover:text-ink", focus)}
              >
                {on && <motion.span layoutId={`${baseId}-tab`} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }} className="absolute inset-0 rounded-full bg-surface-raised shadow-sm" />}
                <span className="relative">{x.key}</span>
              </button>
            );
          })}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="slider"
        tabIndex={0}
        aria-label={`${label} over the ${s.caption}`}
        aria-valuemin={0}
        aria-valuemax={s.points.length - 1}
        aria-valuenow={idx}
        aria-valuetext={`${s.labels[idx]}: ${fmt(value)}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
        className={cn("mt-4 h-[72px] w-full touch-none overflow-visible rounded-xs text-ink", focus)}
      >
        <defs>
          <linearGradient id={`${baseId}-g`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity={0.14} />
            <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
          </linearGradient>
        </defs>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.g key={s.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.12 } }}>
            <path d={`${d} L${W} ${H} L0 ${H} Z`} fill={`url(#${baseId}-g)`} />
            <motion.path
              d={d}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: reduce ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
          </motion.g>
        </AnimatePresence>
        <line x1={pts[idx].x} x2={pts[idx].x} y1={0} y2={H} stroke="currentColor" strokeOpacity={hover === null ? 0 : 0.18} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="pointer-events-none relative -mt-[72px] h-[72px]" aria-hidden>
        <motion.span
          className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface-raised bg-volt shadow-sm"
          animate={{ left: `${(pts[idx].x / W) * 100}%`, top: pts[idx].y }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 36 }}
        />
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10.5px] text-ink-subtle">
        <span>{s.labels[0]}</span>
        <span>{s.labels[s.labels.length - 1]}</span>
      </div>
    </section>
  );
}
