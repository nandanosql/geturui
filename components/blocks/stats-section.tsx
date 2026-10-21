"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { NumberTicker } from "@/components/ui/number-ticker";

export interface Stat {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  description?: string;
  /** Data points for the sparkline, oldest first (at least 2). */
  trend?: number[];
  /** Change label, e.g. "+18% QoQ". */
  delta?: string;
  /** Whether the change is good or bad news; colours the delta. */
  deltaDirection?: "up" | "down";
}

export interface StatsSectionProps {
  eyebrow?: string;
  heading?: string;
  subheading?: string;
  stats?: Stat[];
  className?: string;
}

const W = 120;
const H = 40;
const PAD = 3;

function sparkPath(points: number[]) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const xy = points.map((p, i) => [PAD + (i / (points.length - 1)) * (W - PAD * 2), H - PAD - ((p - min) / span) * (H - PAD * 2)] as const);
  let d = `M ${xy[0][0].toFixed(2)} ${xy[0][1].toFixed(2)}`;
  for (let i = 0; i < xy.length - 1; i++) {
    const p0 = xy[i - 1] ?? xy[i];
    const p1 = xy[i];
    const p2 = xy[i + 1];
    const p3 = xy[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  const last = xy[xy.length - 1];
  return { line: d, area: `${d} L ${last[0].toFixed(2)} ${H} L ${xy[0][0].toFixed(2)} ${H} Z`, end: last };
}

function Sparkline({ points, delay, tone }: { points: number[]; delay: number; tone: "volt" | "danger" }) {
  const reduce = useReducedMotion() ?? false;
  const raw = React.useId();
  const id = `spark-${raw.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const { line, area, end } = React.useMemo(() => sparkPath(points), [points]);
  const color = tone === "volt" ? "var(--volt-ink)" : "var(--danger)";
  return (
    <div aria-hidden className="relative h-10 w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.28 }} />
            <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <motion.path
          d={area}
          fill={`url(#${id})`}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: delay + (reduce ? 0 : 0.7) }}
        />
        <motion.path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={reduce ? { opacity: 0 } : { pathLength: 0, opacity: 0 }}
          whileInView={reduce ? { opacity: 1 } : { pathLength: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ pathLength: { duration: 1.1, ease: [0.22, 1, 0.36, 1], delay }, opacity: { duration: 0.2, delay } }}
        />
      </svg>
      <motion.span
        className="absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ left: `${(end[0] / W) * 100}%`, top: `${(end[1] / H) * 100}%`, background: color, boxShadow: `0 0 0 3px var(--surface)` }}
        initial={{ scale: 0, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ type: "spring", stiffness: 500, damping: 18, delay: delay + (reduce ? 0 : 1) }}
      />
    </div>
  );
}

const DEFAULT_STATS: Stat[] = [
  { label: "Weekly installs", value: 48210, description: "Across npm and the CLI", trend: [18, 22, 21, 27, 31, 30, 38, 44, 48], delta: "+18% MoM", deltaDirection: "up" },
  { label: "Components", value: 214, description: "Free and Pro, all typed", trend: [120, 128, 140, 151, 160, 176, 190, 204, 214], delta: "+12 this week", deltaDirection: "up" },
  { label: "Median bundle", value: 2.4, suffix: " kB", decimals: 1, description: "Per component, gzipped", trend: [3.4, 3.2, 3.1, 2.9, 2.9, 2.7, 2.6, 2.5, 2.4], delta: "−0.3 kB", deltaDirection: "up" },
  { label: "Lighthouse a11y", value: 100, description: "On every docs page", trend: [92, 94, 95, 95, 97, 98, 98, 100, 100], delta: "Perfect score", deltaDirection: "up" },
];

/** Four headline numbers that roll in digit by digit, each with a sparkline that draws itself when scrolled into view. */
export function StatsSection({
  eyebrow = "By the numbers",
  heading = "Built in public, measured every week",
  subheading = "Numbers from the last 30 days across the GetUrUI registry.",
  stats = DEFAULT_STATS,
  className,
}: StatsSectionProps) {
  return (
    <section className={cn("@container w-full px-4 py-16 sm:px-6 sm:py-24", className)}>
      <div className="mx-auto grid max-w-6xl gap-10">
        {(heading || eyebrow) && (
          <header className="grid max-w-2xl gap-3">
            {eyebrow && <span className="text-[13px] font-semibold uppercase tracking-[1px] text-volt-ink">{eyebrow}</span>}
            {heading && <h2 className="text-balance font-display text-3xl font-semibold tracking-[-0.8px] text-ink @xl:text-[40px] @xl:leading-[1.1]">{heading}</h2>}
            {subheading && <p className="text-balance text-base leading-7 text-ink-muted">{subheading}</p>}
          </header>
        )}
        <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border @xl:grid-cols-2 @4xl:grid-cols-4">
          {stats.map((s, i) => {
            const good = (s.deltaDirection ?? "up") === "up";
            return (
              <div key={s.label} className="flex flex-col gap-4 bg-surface p-6">
                <dt className="text-[13px] font-medium text-ink-muted">{s.label}</dt>
                <dd className="grid gap-4">
                  <NumberTicker
                    value={s.value}
                    prefix={s.prefix}
                    suffix={s.suffix}
                    decimals={s.decimals}
                    className="font-display text-[40px] font-semibold tracking-[-1.2px] text-ink"
                  />
                  {s.trend && s.trend.length > 1 && <Sparkline points={s.trend} delay={0.15 + i * 0.12} tone={good ? "volt" : "danger"} />}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
                    {s.description && <span className="text-ink-subtle">{s.description}</span>}
                    {s.delta && (
                      <span className={cn("inline-flex items-center gap-1 font-medium", good ? "text-success" : "text-danger")}>
                        {good ? <TrendingUp className="size-3.5" aria-hidden /> : <TrendingDown className="size-3.5" aria-hidden />}
                        {s.delta}
                      </span>
                    )}
                  </div>
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}
