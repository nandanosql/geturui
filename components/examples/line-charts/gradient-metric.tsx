"use client";

import * as React from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GradientMetricChartProps {
  title?: string;
  /** One value per label, oldest first. */
  values?: number[];
  labels?: string[];
  formatValue?: (n: number) => string;
  /** Caption under the headline value. */
  caption?: string;
  className?: string;
}

const VALUES = [212, 198, 226, 241, 233, 219, 186, 204, 247, 262, 258, 241, 275, 289, 301, 284, 268, 296, 312, 334, 327, 309, 341, 358, 412, 376, 352, 369, 388, 394];
const LABELS = VALUES.map((_, i) => {
  const d = new Date(Date.UTC(2026, 8, 3 + i));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
});

function domain(min: number, max: number, count = 4) {
  const raw = Math.max(max - min, 1) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  return { lo, hi, ticks: Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step) };
}

function smooth(pts: [number, number][]) {
  const f = (n: number) => n.toFixed(2);
  return pts
    .map((p, i) => {
      if (i === 0) return `M${f(p[0])},${f(p[1])}`;
      const a = pts[i - 2] ?? pts[i - 1];
      const b = pts[i - 1];
      const c = pts[i + 1] ?? p;
      return `C${f(b[0] + (p[0] - a[0]) / 6)},${f(b[1] + (p[1] - a[1]) / 6)} ${f(p[0] - (c[0] - b[0]) / 6)},${f(p[1] - (c[1] - b[1]) / 6)} ${f(p[0])},${f(p[1])}`;
    })
    .join("");
}

/** Single-metric line with a volt gradient, labelled peak and low markers, an average guide and a crosshair readout on hover or arrow keys. */
export function GradientMetricChart({
  title = "Daily signups",
  values = VALUES,
  labels = LABELS,
  formatValue = (n) => Math.round(n).toLocaleString("en-US"),
  caption = "Last 30 days",
  className,
}: GradientMetricChartProps) {
  const reduce = useReducedMotion() ?? false;
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [active, setActive] = React.useState<number | null>(null);

  const n = values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const { lo, hi, ticks } = domain(min, max);
  const avg = values.reduce((a, b) => a + b, 0) / Math.max(n, 1);
  const iMin = values.indexOf(min);
  const iMax = values.indexOf(max);
  const xp = (i: number) => (n > 1 ? (i / (n - 1)) * 100 : 50);
  const yp = (v: number) => (1 - (v - lo) / (hi - lo || 1)) * 100;
  const pts = values.map((v, i) => [xp(i), yp(v)] as [number, number]);
  const line = smooth(pts);
  const last = values[n - 1] ?? 0;
  const change = values[0] ? (last - values[0]) / values[0] : 0;

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    setActive(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left) / r.width) * (n - 1)))));
  }
  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      setActive((a) => Math.max(0, Math.min(n - 1, (a ?? n - 1) + (e.key === "ArrowRight" ? 1 : -1))));
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      setActive(e.key === "Home" ? 0 : n - 1);
    } else if (e.key === "Escape") setActive(null);
  }

  const marker = (i: number, kind: "Peak" | "Low") => (
    <motion.div
      key={kind}
      aria-hidden
      initial={{ opacity: 0, y: kind === "Peak" ? 6 : -6 }}
      animate={inView ? { opacity: active === null ? 1 : 0.35, y: 0 } : undefined}
      transition={{ delay: reduce ? 0 : 1.1, type: "spring", stiffness: 320, damping: 26 }}
      className="pointer-events-none absolute"
      style={{ left: `${xp(i)}%`, top: `${yp(values[i] ?? 0)}%` }}
    >
      <span className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface-raised bg-ink" />
      <span
        className={cn(
          "absolute whitespace-nowrap rounded-full border border-border bg-surface-raised px-2 py-0.5 text-[11px] shadow-sm",
          kind === "Peak" ? "bottom-2.5" : "top-2.5",
          xp(i) > 75 ? "right-0 translate-x-3" : xp(i) < 25 ? "left-0 -translate-x-3" : "-translate-x-1/2",
        )}
      >
        <span className="text-ink-subtle">{kind} </span>
        <span className="font-mono font-semibold tabular-nums text-ink">{formatValue(values[i] ?? 0)}</span>
        <span className="text-ink-subtle"> · {labels[i]}</span>
      </span>
    </motion.div>
  );

  return (
    <figure className={cn("@container w-full rounded-xl border border-border bg-surface-raised p-4 shadow-sm sm:p-5", className)}>
      <figcaption className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-ink-muted">{title}</p>
          <p className="mt-1 font-display text-[32px] font-semibold leading-none tracking-[-0.8px] tabular-nums text-ink">{formatValue(active === null ? last : values[active] ?? 0)}</p>
          <p className="mt-1.5 text-[12px] text-ink-subtle">{active === null ? caption : labels[active]}</p>
        </div>
        <p className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold tabular-nums", change >= 0 ? "bg-volt-soft text-success" : "bg-surface text-danger")}>
          {change >= 0 ? <ArrowUp aria-hidden className="size-3.5" /> : <ArrowDown aria-hidden className="size-3.5" />}
          {change >= 0 ? "Up" : "Down"} {Math.abs(change * 100).toFixed(1)}%
          <span className="font-normal text-ink-subtle">over period</span>
        </p>
      </figcaption>

      <div className="mt-8 grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-2">
        <div aria-hidden className="relative h-48 @md:h-56">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2 font-mono text-[10.5px] tabular-nums text-ink-subtle" style={{ top: `${yp(t)}%` }}>
              {formatValue(t)}
            </span>
          ))}
        </div>
        <div
          ref={ref}
          tabIndex={0}
          role="group"
          aria-label={`${title} chart. Use left and right arrow keys to read each day.`}
          onPointerMove={onMove}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive((a) => a ?? n - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={onKey}
          className="relative h-48 touch-none rounded-xs outline-none focus-visible:shadow-[var(--focus-ring)] @md:h-56"
        >
          <svg
            role="img"
            aria-label={`${title}, ${caption}: from ${formatValue(values[0] ?? 0)} to ${formatValue(last)}. Peak ${formatValue(max)} on ${labels[iMax]}, low ${formatValue(min)} on ${labels[iMin]}, average ${formatValue(avg)}.`}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
          >
            <defs>
              <linearGradient id={`${uid}-fill`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" style={{ stopColor: "var(--volt-ink)", stopOpacity: 0.3 }} />
                <stop offset="100%" style={{ stopColor: "var(--volt-ink)", stopOpacity: 0 }} />
              </linearGradient>
              <clipPath id={`${uid}-reveal`}>
                <motion.rect x={-2} y={-10} height={120} initial={{ width: reduce ? 104 : 0 }} animate={{ width: inView || reduce ? 104 : 0 }} transition={{ duration: reduce ? 0 : 1.3, ease: [0.65, 0, 0.35, 1] }} />
              </clipPath>
            </defs>
            {ticks.map((t, i) => (
              <line key={t} x1={0} x2={100} y1={yp(t)} y2={yp(t)} className="stroke-border" strokeDasharray={i === 0 ? undefined : "2 4"} vectorEffect="non-scaling-stroke" />
            ))}
            <line x1={0} x2={100} y1={yp(avg)} y2={yp(avg)} className="stroke-ink-subtle" strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
            <g clipPath={`url(#${uid}-reveal)`}>
              <path d={`${line}L100,100L0,100Z`} fill={`url(#${uid}-fill)`} />
              <path d={line} fill="none" style={{ stroke: "var(--volt-ink)" }} strokeWidth={2.25} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </g>
            {active !== null && <line x1={xp(active)} x2={xp(active)} y1={0} y2={100} className="stroke-ink-subtle" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
          </svg>

          <span aria-hidden className="absolute right-1 -translate-y-full pb-0.5 font-mono text-[10.5px] text-ink-muted" style={{ top: `${yp(avg)}%` }}>
            Avg {formatValue(avg)}
          </span>
          {marker(iMax, "Peak")}
          {marker(iMin, "Low")}

          <motion.span
            aria-hidden
            initial={{ opacity: 0, scale: 0 }}
            animate={inView ? { opacity: 1, scale: 1 } : undefined}
            transition={{ delay: reduce ? 0 : 1.2, type: "spring", stiffness: 400, damping: 20 }}
            className="pointer-events-none absolute -ml-1.5 -mt-1.5 size-3 rounded-full bg-volt-ink ring-4 ring-volt-soft"
            style={{ left: "100%", top: `${yp(last)}%` }}
          />
          <AnimatePresence>
            {active !== null && (
              <motion.span
                key="dot"
                aria-hidden
                initial={{ opacity: 0, left: `${xp(active)}%`, top: `${yp(values[active] ?? 0)}%` }}
                animate={{ opacity: 1, left: `${xp(active)}%`, top: `${yp(values[active] ?? 0)}%` }}
                exit={{ opacity: 0 }}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 38 }}
                className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface-raised bg-volt-ink shadow-sm"
              />
            )}
          </AnimatePresence>
        </div>
        <div />
        <div aria-hidden className="mt-2 flex justify-between font-mono text-[10.5px] text-ink-subtle">
          <span>{labels[0]}</span>
          <span className="hidden @md:inline">{labels[Math.floor((n - 1) / 2)]}</span>
          <span>{labels[n - 1]}</span>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {active !== null ? `${labels[active]}: ${formatValue(values[active] ?? 0)}` : ""}
      </p>
    </figure>
  );
}
