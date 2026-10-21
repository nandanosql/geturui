"use client";

import * as React from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { NumberTicker } from "@/components/ui/number-ticker";

export interface DonutDatum {
  label: string;
  value: number;
  color?: string;
}

export interface DonutChartProps {
  data: DonutDatum[];
  /** Diameter in px. */
  size?: number;
  /** Ring thickness in px. */
  thickness?: number;
  /** Caption under the centre total. */
  totalLabel?: string;
  prefix?: string;
  suffix?: string;
  valueFormatter?: (n: number) => string;
  title?: string;
  className?: string;
}

const PALETTE = ["var(--volt)", "var(--info)", "var(--ember)", "var(--success)", "var(--warning)", "var(--ink-subtle)"];
const GAP = 0.006;

/** Donut whose arcs sweep in; hovering a segment or legend item expands it and swaps the centre total for that segment. */
export function DonutChart({
  data,
  size = 220,
  thickness = 26,
  totalLabel = "Total",
  prefix = "",
  suffix = "",
  valueFormatter,
  title,
  className,
}: DonutChartProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const [active, setActive] = React.useState<string | null>(null);

  const fmt = valueFormatter ?? ((n: number) => `${prefix}${n.toLocaleString("en-US")}${suffix}`);
  const colored = data.map((d, i) => ({ ...d, color: d.color ?? PALETTE[i % PALETTE.length] }));
  const total = colored.reduce((a, d) => a + (hidden.has(d.label) ? 0 : Math.max(0, d.value)), 0);
  const visibleCount = colored.filter((d) => !hidden.has(d.label) && d.value > 0).length;

  const fracs = colored.map((d) => (hidden.has(d.label) || !total ? 0 : Math.max(0, d.value) / total));
  const arcs = colored.map((d, i) => {
    const frac = fracs[i];
    const start = fracs.slice(0, i).reduce((x, y) => x + y, 0);
    const gap = visibleCount > 1 && frac > 0 ? Math.min(GAP, frac / 3) : 0;
    return { ...d, frac, start: start + gap / 2, len: Math.max(0, frac - gap) };
  });

  const r = (size - thickness - 12) / 2;
  const c = size / 2;
  const act = arcs.find((a) => a.label === active && a.frac > 0) ?? null;

  const toggle = (label: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else if (data.length - next.size > 1) next.add(label);
      return next;
    });

  return (
    <figure className={cn("flex w-full flex-col items-center gap-5 rounded-lg border border-border bg-surface-raised p-4 shadow-sm sm:flex-row sm:p-6", className)}>
      <div ref={ref} className="relative shrink-0" style={{ width: size, height: size }} onPointerLeave={() => setActive(null)}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${title ?? "Donut chart"}: ${arcs.filter((a) => a.frac > 0).map((a) => `${a.label} ${(a.frac * 100).toFixed(1)}%`).join(", ")}`}>
          <circle cx={c} cy={c} r={r} fill="none" className="stroke-surface-sunken" strokeWidth={thickness} />
          <g transform={`rotate(-90 ${c} ${c})`}>
            {arcs.map((a, i) => {
              const on = active === a.label;
              const dim = active !== null && !on;
              return (
                <motion.circle
                  key={a.label}
                  cx={c}
                  cy={c}
                  r={r}
                  fill="none"
                  style={{ stroke: a.color }}
                  strokeLinecap="butt"
                  initial={{ pathLength: 0, pathOffset: 0, strokeWidth: thickness, opacity: 1 }}
                  animate={
                    inView
                      ? { pathLength: a.len, pathOffset: a.start, strokeWidth: on ? thickness + 10 : thickness, opacity: dim ? 0.35 : 1 }
                      : undefined
                  }
                  transition={{
                    pathLength: reduce ? { duration: 0 } : { type: "spring", stiffness: 90, damping: 20, delay: hidden.size ? 0 : i * 0.08 },
                    pathOffset: reduce ? { duration: 0 } : { type: "spring", stiffness: 90, damping: 20, delay: hidden.size ? 0 : i * 0.08 },
                    strokeWidth: { type: "spring", stiffness: 500, damping: 28 },
                    opacity: { duration: 0.2 },
                  }}
                  onPointerEnter={() => a.frac > 0 && setActive(a.label)}
                  className="cursor-pointer"
                />
              );
            })}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={act ? act.label : "total"}
              initial={{ opacity: 0, filter: "blur(8px)", scale: 0.94 }}
              animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
              exit={{ opacity: 0, filter: "blur(8px)", scale: 0.94 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className="col-start-1 row-start-1 flex flex-col items-center"
              aria-live="polite"
            >
              {act ? (
                <>
                  <span className="font-display text-[26px] font-semibold tracking-[-0.5px] text-ink tabular-nums">{(act.frac * 100).toFixed(1)}%</span>
                  <span className="mt-1 max-w-[120px] truncate text-[12px] text-ink-muted">{act.label}</span>
                  <span className="text-[11.5px] tabular-nums text-ink-subtle">{fmt(act.value)}</span>
                </>
              ) : (
                <>
                  <NumberTicker value={total} prefix={prefix} suffix={suffix} className="font-display text-[28px] font-semibold tracking-[-0.6px] text-ink" />
                  <span className="mt-1.5 text-[12px] text-ink-muted">{totalLabel}</span>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="w-full min-w-0 flex-1">
        {title && <figcaption className="mb-3 text-[14.5px] font-semibold text-ink">{title}</figcaption>}
        <ul className="space-y-1" aria-label="Segments">
          {arcs.map((a) => {
            const on = !hidden.has(a.label);
            return (
              <li key={a.label}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(a.label)}
                  onPointerEnter={() => on && setActive(a.label)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => on && setActive(a.label)}
                  onBlur={() => setActive(null)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-left text-[13px] outline-none transition-colors focus-visible:shadow-[var(--focus-ring)]",
                    active === a.label ? "bg-surface-hover" : "hover:bg-surface-hover",
                    !on && "opacity-55",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn("size-2.5 shrink-0 rounded-[3px] transition-transform duration-300 ease-[var(--ease-spring)]", !on && "scale-50")}
                    style={{ background: a.color }}
                  />
                  <span className={cn("min-w-0 flex-1 truncate", on ? "text-ink" : "text-ink-subtle line-through")}>{a.label}</span>
                  <span className="font-mono text-[12px] tabular-nums text-ink-subtle">{fmt(a.value)}</span>
                  <span className="w-12 text-right font-mono text-[12px] font-medium tabular-nums text-ink">{on ? `${(a.frac * 100).toFixed(1)}%` : "—"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </figure>
  );
}
