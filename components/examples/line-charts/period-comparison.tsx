"use client";

import * as React from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComparisonPeriod {
  /** Tab label, e.g. "Month". */
  key: string;
  /** Point labels, same length as the series. Every period should use the same point count so lines can morph. */
  labels: string[];
  current: number[];
  previous: number[];
  /** Wording for the comparison, e.g. "last month". */
  previousLabel: string;
}

export interface PeriodComparisonChartProps {
  title?: string;
  periods?: ComparisonPeriod[];
  defaultPeriod?: string;
  formatValue?: (n: number) => string;
  className?: string;
}

const cum = (xs: number[]) => xs.reduce<number[]>((acc, x) => [...acc, (acc[acc.length - 1] ?? 0) + x], []);
const PERIODS: ComparisonPeriod[] = [
  { key: "Week", previousLabel: "last week", labels: ["Mon 9a", "Mon 6p", "Tue 9a", "Tue 6p", "Wed 9a", "Wed 6p", "Thu 9a", "Thu 6p", "Fri 9a", "Fri 6p", "Sat", "Sun"], current: cum([1.2, 1.6, 1.4, 1.9, 1.5, 2.1, 1.7, 2.4, 1.9, 2.2, 1.1, 0.9]), previous: cum([1.1, 1.3, 1.5, 1.4, 1.6, 1.7, 1.5, 1.9, 1.8, 2.0, 1.2, 1.0]) },
  { key: "Month", previousLabel: "last month", labels: ["Sep 1", "Sep 4", "Sep 6", "Sep 9", "Sep 11", "Sep 14", "Sep 16", "Sep 19", "Sep 21", "Sep 24", "Sep 26", "Sep 29"], current: cum([5.2, 6.1, 5.8, 7.4, 6.6, 8.1, 7.2, 7.9, 6.8, 8.6, 7.7, 6.9]), previous: cum([5.6, 5.9, 6.2, 6.4, 6.0, 6.9, 6.5, 7.0, 6.3, 7.1, 6.8, 6.1]) },
  { key: "Quarter", previousLabel: "last quarter", labels: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "W11", "W12"], current: cum([17.4, 18.2, 16.9, 19.6, 21.3, 20.1, 22.4, 21.8, 23.5, 24.2, 22.9, 25.7]), previous: cum([18.1, 18.6, 19.0, 18.4, 19.7, 20.3, 19.9, 20.8, 21.2, 20.6, 21.9, 22.4]) },
];

function niceTop(max: number, count = 4) {
  const raw = Math.max(max, 1e-6) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  return Array.from({ length: count + 1 }, (_, i) => i * step);
}

function smooth(pts: [number, number][], move = true) {
  const f = (n: number) => n.toFixed(2);
  return pts
    .map((p, i) => {
      if (i === 0) return `${move ? "M" : "L"}${f(p[0])},${f(p[1])}`;
      const a = pts[i - 2] ?? pts[i - 1];
      const b = pts[i - 1];
      const c = pts[i + 1] ?? p;
      return `C${f(b[0] + (p[0] - a[0]) / 6)},${f(b[1] + (p[1] - a[1]) / 6)} ${f(p[0] - (c[0] - b[0]) / 6)},${f(p[1] - (c[1] - b[1]) / 6)} ${f(p[0])},${f(p[1])}`;
    })
    .join("");
}

/** This period against the last: solid volt vs dashed neutral, the gap between them shaded, period tabs that morph both lines with a spring. */
export function PeriodComparisonChart({ title = "Cumulative bookings", periods = PERIODS, defaultPeriod = "Month", formatValue = (n) => `$${n.toFixed(1)}k`, className }: PeriodComparisonChartProps) {
  const reduce = useReducedMotion() ?? false;
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [key, setKey] = React.useState(defaultPeriod);
  const [active, setActive] = React.useState<number | null>(null);
  const p = periods.find((x) => x.key === key) ?? periods[0];
  const n = p.labels.length;

  const ticks = niceTop(Math.max(...p.current, ...p.previous));
  const top = ticks[ticks.length - 1] || 1;
  const xp = (i: number) => (n > 1 ? (i / (n - 1)) * 100 : 50);
  const yp = (v: number) => (1 - v / top) * 100;
  const cur = p.current.map((v, i) => [xp(i), yp(v)] as [number, number]);
  const prev = p.previous.map((v, i) => [xp(i), yp(v)] as [number, number]);
  const dCur = smooth(cur);
  const dPrev = smooth(prev);
  const dGap = `${dCur}${smooth([...prev].reverse(), false)}Z`;
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 180, damping: 28 };

  const total = p.current[n - 1] ?? 0;
  const before = p.previous[n - 1] ?? 0;
  const delta = before ? (total - before) / before : 0;
  const up = delta >= 0;

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    setActive(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left) / r.width) * (n - 1)))));
  }
  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      setActive((a) => Math.max(0, Math.min(n - 1, (a ?? n - 1) + (e.key === "ArrowRight" ? 1 : -1))));
    } else if (e.key === "Escape") setActive(null);
  }

  const a = active ?? null;
  const aCur = a !== null ? p.current[a] ?? 0 : 0;
  const aPrev = a !== null ? p.previous[a] ?? 0 : 0;

  return (
    <figure className={cn("@container w-full rounded-xl border border-border bg-surface-raised p-4 shadow-sm sm:p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <figcaption>
          <p className="text-[13px] font-medium text-ink-muted">{title}</p>
          <p className="mt-1 font-display text-[30px] font-semibold leading-none tracking-[-0.8px] tabular-nums text-ink">{formatValue(total)}</p>
          <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-[12px]">
            <span className={cn("inline-flex items-center gap-1 font-semibold", up ? "text-success" : "text-danger")}>
              {up ? <TrendingUp aria-hidden className="size-3.5" /> : <TrendingDown aria-hidden className="size-3.5" />}
              {up ? "Ahead" : "Behind"} {Math.abs(delta * 100).toFixed(1)}%
            </span>
            <span className="text-ink-subtle">
              vs {formatValue(before)} {p.previousLabel}
            </span>
          </p>
        </figcaption>
        <div role="group" aria-label="Period" className="flex rounded-full bg-surface p-0.5">
          {periods.map((x) => (
            <button
              key={x.key}
              type="button"
              aria-pressed={x.key === p.key}
              onClick={() => setKey(x.key)}
              className={cn("relative h-7 rounded-full px-3 text-[12px] font-medium outline-none focus-visible:shadow-[var(--focus-ring)]", x.key === p.key ? "text-ink" : "text-ink-subtle hover:text-ink")}
            >
              {x.key === p.key && <motion.span layoutId={`${uid}-tab`} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }} className="absolute inset-0 rounded-full bg-surface-raised shadow-sm" />}
              <span className="relative">{x.key}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-2">
        <div aria-hidden className="relative h-48 @md:h-56">
          {ticks.map((t, i) => (
            <span key={i} className="absolute right-0 -translate-y-1/2 font-mono text-[10.5px] tabular-nums text-ink-subtle" style={{ top: `${(1 - i / (ticks.length - 1)) * 100}%` }}>
              {t ? formatValue(t).replace(".0k", "k") : "0"}
            </span>
          ))}
        </div>
        <div
          ref={ref}
          tabIndex={0}
          role="group"
          aria-label={`${title} chart. Use left and right arrow keys to compare each point.`}
          onPointerMove={onMove}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive((v) => v ?? n - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={onKey}
          className="relative h-48 touch-none rounded-xs outline-none focus-visible:shadow-[var(--focus-ring)] @md:h-56"
        >
          <svg role="img" aria-label={`${title} this ${p.key.toLowerCase()}: ${formatValue(total)}, ${up ? "up" : "down"} ${Math.abs(delta * 100).toFixed(1)}% on ${p.previousLabel} (${formatValue(before)}).`} viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
            <defs>
              <clipPath id={`${uid}-reveal`}>
                <motion.rect x={-2} y={-10} height={120} initial={{ width: reduce ? 104 : 0 }} animate={{ width: inView || reduce ? 104 : 0 }} transition={{ duration: reduce ? 0 : 1.2, ease: [0.65, 0, 0.35, 1] }} />
              </clipPath>
            </defs>
            {ticks.map((_, i) => (
              <line key={i} x1={0} x2={100} y1={(i / (ticks.length - 1)) * 100} y2={(i / (ticks.length - 1)) * 100} className="stroke-border" strokeDasharray={i === ticks.length - 1 ? undefined : "2 4"} vectorEffect="non-scaling-stroke" />
            ))}
            <g clipPath={`url(#${uid}-reveal)`}>
              <motion.path initial={false} animate={{ d: dGap }} transition={spring} style={{ fill: "var(--volt-soft)" }} />
              <motion.path initial={false} animate={{ d: dPrev }} transition={spring} fill="none" className="stroke-ink-subtle" strokeWidth={1.75} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
              <motion.path initial={false} animate={{ d: dCur }} transition={spring} fill="none" style={{ stroke: "var(--volt-ink)" }} strokeWidth={2.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </g>
            {a !== null && <line x1={xp(a)} x2={xp(a)} y1={0} y2={100} className="stroke-ink-subtle" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
          </svg>

          {a !== null && (
            <>
              <motion.span aria-hidden initial={false} animate={{ left: `${xp(a)}%`, top: `${yp(aPrev)}%` }} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 38 }} className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink-subtle bg-surface-raised" />
              <motion.span aria-hidden initial={false} animate={{ left: `${xp(a)}%`, top: `${yp(aCur)}%` }} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 38 }} className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface-raised bg-volt-ink" />
            </>
          )}
          <AnimatePresence>
            {a !== null && (
              <motion.div
                key="tip"
                aria-hidden
                initial={{ opacity: 0, scale: 0.96, left: `${xp(a)}%` }}
                animate={{ opacity: 1, scale: 1, left: `${xp(a)}%` }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 36 }}
                style={{ x: xp(a) > 55 ? "calc(-100% - 12px)" : "12px" }}
                className="pointer-events-none absolute top-1 z-10 min-w-40 rounded-sm border border-border bg-surface-raised px-2.5 py-2 text-xs shadow-md"
              >
                <p className="mb-1 font-medium text-ink-muted">{p.labels[a]}</p>
                <p className="flex justify-between gap-4">
                  <span className="text-ink-muted">This {p.key.toLowerCase()}</span>
                  <span className="font-mono font-semibold tabular-nums text-ink">{formatValue(aCur)}</span>
                </p>
                <p className="flex justify-between gap-4">
                  <span className="text-ink-subtle">Previous</span>
                  <span className="font-mono tabular-nums text-ink-muted">{formatValue(aPrev)}</span>
                </p>
                <p className={cn("mt-1 border-t border-border pt-1 text-right font-mono font-semibold tabular-nums", aCur >= aPrev ? "text-success" : "text-danger")}>
                  {aCur >= aPrev ? "+" : "−"}
                  {formatValue(Math.abs(aCur - aPrev))}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div />
        <div aria-hidden className="relative mt-2 h-4">
          {p.labels.map((l, i) =>
            i % 3 === 0 || i === n - 1 ? (
              <span key={i} className={cn("absolute whitespace-nowrap font-mono text-[10.5px] text-ink-subtle", i === 0 ? "" : i === n - 1 ? "-translate-x-full" : "-translate-x-1/2", i === n - 1 && "hidden @md:block")} style={{ left: `${xp(i)}%` }}>
                {l}
              </span>
            ) : null,
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-[12px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-[3px] w-4 rounded-full bg-volt-ink" />
          This {p.key.toLowerCase()}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="w-4 border-t-2 border-dashed border-ink-subtle" />
          {p.previousLabel.charAt(0).toUpperCase() + p.previousLabel.slice(1)}
        </span>
      </div>
      <p className="sr-only" aria-live="polite">
        {a !== null ? `${p.labels[a]}: ${formatValue(aCur)} this ${p.key.toLowerCase()}, ${formatValue(aPrev)} ${p.previousLabel}.` : ""}
      </p>
    </figure>
  );
}
