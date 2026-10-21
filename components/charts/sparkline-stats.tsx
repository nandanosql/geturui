"use client";

import * as React from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { NumberTicker } from "@/components/ui/number-ticker";

export interface SparklineProps {
  data: number[];
  /** Labels for each point, shown under the crosshair. */
  labels?: string[];
  width?: number;
  height?: number;
  /** Stroke colour; any CSS colour. */
  color?: string;
  formatValue?: (n: number) => string;
  /** Accessible name for the sparkline. */
  label?: string;
  className?: string;
}

/** Sparkline that draws in, fills a soft gradient and shows a crosshair on hover or arrow keys. */
export function Sparkline({
  data,
  labels,
  width = 240,
  height = 56,
  color = "var(--volt-ink)",
  formatValue = (n) => n.toLocaleString("en-US"),
  label = "Trend",
  className,
}: SparklineProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20px" });
  const [hover, setHover] = React.useState<number | null>(null);
  const gid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");

  const pad = 4;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [
    pad + (i * (width - pad * 2)) / Math.max(1, data.length - 1),
    pad + (1 - (v - min) / span) * (height - pad * 2),
  ]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join("");
  const area = `${line}L${pts[pts.length - 1]?.[0] ?? 0},${height}L${pts[0]?.[0] ?? 0},${height}Z`;

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * width;
    const i = Math.round(((x - pad) / (width - pad * 2)) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      setHover((h) => {
        const cur = h ?? data.length - 1;
        return Math.max(0, Math.min(data.length - 1, cur + (e.key === "ArrowRight" ? 1 : -1)));
      });
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      setHover(e.key === "Home" ? 0 : data.length - 1);
    } else if (e.key === "Escape") setHover(null);
  }

  const hp = hover !== null ? pts[hover] : null;

  return (
    <div className={cn("relative", className)}>
      <svg
        ref={ref}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="block h-auto w-full touch-none overflow-visible outline-none focus-visible:shadow-[var(--focus-ring)] rounded-[6px]"
        style={{ aspectRatio: `${width} / ${height}` }}
        tabIndex={0}
        role="img"
        aria-label={`${label}: ${data.length} points from ${formatValue(data[0] ?? 0)} to ${formatValue(data[data.length - 1] ?? 0)}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        onBlur={() => setHover(null)}
        onKeyDown={onKey}
      >
        <defs>
          <linearGradient id={`${gid}-fill`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.28 }} />
            <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <motion.path
          d={area}
          fill={`url(#${gid}-fill)`}
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : undefined}
          transition={{ duration: 0.6, delay: reduce ? 0 : 0.5 }}
        />
        <motion.path
          d={line}
          fill="none"
          style={{ stroke: color }}
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: reduce ? 1 : 0 }}
          animate={inView ? { pathLength: 1 } : undefined}
          transition={{ duration: reduce ? 0 : 1.1, ease: [0.65, 0, 0.35, 1] }}
        />
        {hp && (
          <g pointerEvents="none">
            <line x1={hp[0]} x2={hp[0]} y1={0} y2={height} className="stroke-ink-subtle" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
          </g>
        )}
      </svg>
      {hp && hover !== null && (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface-raised"
            style={{ left: `${(hp[0] / width) * 100}%`, top: `${(hp[1] / height) * 100}%`, background: color }}
          />
          <span
            role="status"
            className={cn(
              "pointer-events-none absolute -top-7 whitespace-nowrap rounded-[6px] bg-ink px-1.5 py-0.5 font-mono text-[10.5px] text-bg tabular-nums",
              hp[0] / width > 0.7 ? "-translate-x-full" : hp[0] / width < 0.3 ? "" : "-translate-x-1/2",
            )}
            style={{ left: `${(hp[0] / width) * 100}%` }}
          >
            {labels?.[hover] ? `${labels[hover]} · ` : ""}
            {formatValue(data[hover])}
          </span>
        </>
      )}
    </div>
  );
}

export interface StatItem {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  /** Change vs. the previous period, in percent (12.4 = +12.4%). */
  delta: number;
  /** Lower is better (e.g. churn, latency): flips the delta colour. */
  invert?: boolean;
  data: number[];
  labels?: string[];
  /** Small caption under the value, e.g. "vs. last 30 days". */
  caption?: string;
}

export interface StatCardProps extends StatItem {
  className?: string;
}

/** KPI card: rolling value, delta badge with icon and word, and a sparkline with a hover crosshair. */
export function StatCard({ label, value, prefix, suffix, decimals = 0, delta, invert, data, labels, caption, className }: StatCardProps) {
  const up = delta >= 0;
  const good = invert ? !up : up;
  const fmt = (n: number) =>
    `${prefix ?? ""}${n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix ?? ""}`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn("flex min-w-0 flex-col rounded-lg border border-border bg-surface-raised p-4 shadow-sm", className)}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12.5px] font-medium text-ink-muted">{label}</p>
        <span
          className={cn(
            "inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
            good ? "bg-volt-soft text-success" : "bg-surface text-danger ring-1 ring-danger/30",
          )}
        >
          {up ? <TrendingUp aria-hidden className="size-3" strokeWidth={2.5} /> : <TrendingDown aria-hidden className="size-3" strokeWidth={2.5} />}
          {up ? "Up" : "Down"} {Math.abs(delta).toFixed(1)}%
        </span>
      </div>
      <NumberTicker
        value={value}
        prefix={prefix}
        suffix={suffix}
        decimals={decimals}
        className="mt-2 font-display text-[28px] font-semibold tracking-[-0.6px] text-ink"
      />
      {caption && <p className="mt-1 text-[11.5px] text-ink-subtle">{caption}</p>}
      <Sparkline
        data={data}
        labels={labels}
        label={`${label} trend`}
        formatValue={fmt}
        color={good ? "var(--volt-ink)" : "var(--danger)"}
        className="mt-4"
      />
    </motion.div>
  );
}

export interface SparklineStatsProps {
  stats: StatItem[];
  className?: string;
}

/** Responsive grid of KPI cards with rolling numbers, delta badges and sparklines that draw in. */
export function SparklineStats({ stats, className }: SparklineStatsProps) {
  return (
    <div className={cn("grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {stats.map((s) => (
        <StatCard key={s.label} {...s} />
      ))}
    </div>
  );
}
