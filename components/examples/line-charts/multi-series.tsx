"use client";

import * as React from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export interface LineSeries {
  id: string;
  label: string;
  /** One value per label, oldest first. */
  values: number[];
}

export interface MultiSeriesLineChartProps {
  title?: string;
  subtitle?: string;
  /** X-axis labels, one per point. */
  labels?: string[];
  /** First series is the primary (volt); the rest render in neutral tones. */
  series?: LineSeries[];
  formatValue?: (n: number) => string;
  /** Formats the y-axis ticks. */
  formatTick?: (n: number) => string;
  className?: string;
}

const LABELS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
const SERIES: LineSeries[] = [
  { id: "web", label: "Web app", values: [18.2, 19.4, 21.1, 20.6, 22.8, 24.9, 26.3, 25.8, 28.4, 30.1, 31.7, 34.2] },
  { id: "ios", label: "iOS", values: [9.1, 9.8, 10.4, 11.9, 12.2, 13.6, 14.1, 15.8, 16.3, 17.9, 18.4, 19.6] },
  { id: "android", label: "Android", values: [6.4, 6.9, 7.2, 7.1, 8.0, 8.6, 9.3, 9.1, 10.2, 10.8, 11.6, 12.1] },
];
const STYLES = [
  { stroke: "var(--volt-ink)", width: 2.25, dash: undefined },
  { stroke: "var(--ink-muted)", width: 1.75, dash: undefined },
  { stroke: "var(--ink-subtle)", width: 1.75, dash: "5 4" },
  { stroke: "var(--ink-subtle)", width: 1.5, dash: "1.5 3.5" },
];

function niceTicks(max: number, count = 4) {
  const raw = Math.max(max, 1e-6) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  return Array.from({ length: count + 1 }, (_, i) => i * step);
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

/** Multi-series line chart: legend toggles rescale the axis with a spring morph, and a crosshair reads every visible series on hover or arrow keys. */
export function MultiSeriesLineChart({
  title = "Weekly active users",
  subtitle = "By platform, in thousands",
  labels = LABELS,
  series = SERIES,
  formatValue = (n) => `${n.toFixed(1)}k`,
  formatTick = (n) => (n ? `${n}k` : "0"),
  className,
}: MultiSeriesLineChartProps) {
  const reduce = useReducedMotion() ?? false;
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const [active, setActive] = React.useState<number | null>(null);

  const n = labels.length;
  const visible = series.filter((s) => !hidden.has(s.id));
  const ticks = niceTicks(Math.max(...visible.flatMap((s) => s.values), 0));
  const top = ticks[ticks.length - 1] || 1;
  const xp = (i: number) => (n > 1 ? (i / (n - 1)) * 100 : 50);
  const yp = (v: number) => (1 - v / top) * 100;
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 200, damping: 30 };

  const toggle = (id: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (series.length - next.size > 1) next.add(id);
      return next;
    });

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    setActive(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left) / r.width) * (n - 1)))));
  }
  function onKey(e: React.KeyboardEvent) {
    const map: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };
    if (e.key in map) {
      e.preventDefault();
      setActive((a) => Math.max(0, Math.min(n - 1, (a ?? n - 1) + map[e.key])));
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      setActive(e.key === "Home" ? 0 : n - 1);
    } else if (e.key === "Escape") setActive(null);
  }

  const summary = `${title}. ${series.map((s) => `${s.label} from ${formatValue(s.values[0] ?? 0)} to ${formatValue(s.values[n - 1] ?? 0)}`).join("; ")}.`;

  return (
    <figure className={cn("@container w-full rounded-xl border border-border bg-surface-raised p-4 shadow-sm sm:p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <figcaption>
          <p className="text-[15px] font-semibold text-ink">{title}</p>
          <p className="text-[12.5px] text-ink-subtle">{subtitle}</p>
        </figcaption>
        <ul className="flex flex-wrap gap-1.5" aria-label="Toggle series">
          {series.map((s, i) => {
            const on = !hidden.has(s.id);
            const st = STYLES[i % STYLES.length];
            return (
              <li key={s.id}>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  aria-pressed={on}
                  onClick={() => toggle(s.id)}
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium outline-none transition-colors focus-visible:shadow-[var(--focus-ring)]",
                    on ? "border-border-strong/40 bg-surface text-ink" : "border-dashed border-border text-ink-subtle",
                  )}
                >
                  <svg aria-hidden width="14" height="4" className="overflow-visible">
                    <line x1="0" x2="14" y1="2" y2="2" style={{ stroke: st.stroke, opacity: on ? 1 : 0.35 }} strokeWidth={2.5} strokeDasharray={st.dash} strokeLinecap="round" />
                  </svg>
                  {s.label}
                </motion.button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-5 grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-2">
        <div aria-hidden className="relative h-52 @md:h-60">
          {ticks.map((t) => (
            <motion.span key={t} layout="position" className="absolute right-0 -translate-y-1/2 font-mono text-[10.5px] tabular-nums text-ink-subtle" style={{ top: `${yp(t)}%` }}>
              {formatTick(t)}
            </motion.span>
          ))}
        </div>
        <div
          ref={ref}
          tabIndex={0}
          role="group"
          aria-label={`${title} chart. Use left and right arrow keys to read each month.`}
          onPointerMove={onMove}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive((a) => a ?? n - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={onKey}
          className="relative h-52 touch-none rounded-xs outline-none focus-visible:shadow-[var(--focus-ring)] @md:h-60"
        >
          <svg role="img" aria-label={summary} viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
            <defs>
              <clipPath id={`${uid}-reveal`}>
                <motion.rect x={-2} y={-10} height={120} initial={{ width: reduce ? 104 : 0 }} animate={{ width: inView ? 104 : reduce ? 104 : 0 }} transition={{ duration: reduce ? 0 : 1.2, ease: [0.65, 0, 0.35, 1] }} />
              </clipPath>
            </defs>
            {ticks.map((t, i) => (
              <motion.line key={t} initial={false} animate={{ y1: yp(t), y2: yp(t) }} transition={spring} x1={0} x2={100} className="stroke-border" strokeDasharray={i === 0 ? undefined : "2 4"} vectorEffect="non-scaling-stroke" />
            ))}
            <g clipPath={`url(#${uid}-reveal)`}>
              {series.map((s, i) => {
                const st = STYLES[i % STYLES.length];
                const d = smooth(s.values.map((v, k) => [xp(k), yp(v)]));
                return (
                  <motion.path
                    key={s.id}
                    initial={false}
                    animate={{ d, opacity: hidden.has(s.id) ? 0 : 1 }}
                    transition={{ d: spring, opacity: { duration: 0.2 } }}
                    fill="none"
                    style={{ stroke: st.stroke }}
                    strokeWidth={st.width}
                    strokeDasharray={st.dash}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </g>
            {active !== null && <line x1={xp(active)} x2={xp(active)} y1={0} y2={100} className="stroke-ink-subtle" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
          </svg>

          {active !== null &&
            series.map((s, i) =>
              hidden.has(s.id) ? null : (
                <motion.span
                  key={s.id}
                  aria-hidden
                  initial={false}
                  animate={{ left: `${xp(active)}%`, top: `${yp(s.values[active] ?? 0)}%` }}
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 38 }}
                  className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface-raised"
                  style={{ background: STYLES[i % STYLES.length].stroke }}
                />
              ),
            )}

          <AnimatePresence>
            {active !== null && (
              <motion.div
                key="tip"
                aria-hidden
                initial={{ opacity: 0, scale: 0.96, left: `${xp(active)}%` }}
                animate={{ opacity: 1, scale: 1, left: `${xp(active)}%` }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 36 }}
                style={{ x: xp(active) > 55 ? "calc(-100% - 12px)" : "12px" }}
                className="pointer-events-none absolute top-1 z-10 min-w-36 rounded-sm border border-border bg-surface-raised px-2.5 py-2 text-xs shadow-md"
              >
                <p className="mb-1 font-medium text-ink-muted">{labels[active]}</p>
                {series.map((s, i) =>
                  hidden.has(s.id) ? null : (
                    <p key={s.id} className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-1.5 text-ink-muted">
                        <span className="size-1.5 rounded-full" style={{ background: STYLES[i % STYLES.length].stroke }} />
                        {s.label}
                      </span>
                      <span className="font-mono font-semibold tabular-nums text-ink">{formatValue(s.values[active] ?? 0)}</span>
                    </p>
                  ),
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div />
        <div aria-hidden className="relative mt-2 h-4">
          {labels.map((l, i) => (
            <span
              key={l + i}
              className={cn("absolute font-mono text-[10.5px] text-ink-subtle", i === 0 ? "" : i === n - 1 ? "-translate-x-full" : "-translate-x-1/2", (i % 2 === 1 || i === n - 2) && i !== n - 1 && "hidden @md:block")}
              style={{ left: `${xp(i)}%` }}
            >
              {l}
            </span>
          ))}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {active !== null ? `${labels[active]}: ${visible.map((s) => `${s.label} ${formatValue(s.values[active] ?? 0)}`).join(", ")}` : ""}
      </p>
    </figure>
  );
}
