"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export interface FunnelStage {
  label: string;
  value: number;
}

export interface FunnelChartProps {
  stages: FunnelStage[];
  /** Bar height in px. */
  barHeight?: number;
  /** Gap between bars, where drop-off is labelled. */
  gap?: number;
  valueFormatter?: (n: number) => string;
  title?: string;
  className?: string;
}

function useWidth<T extends HTMLElement>(fallback = 640) {
  const ref = React.useRef<T>(null);
  const [w, setW] = React.useState(fallback);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

const fmtPct = (n: number) => `${(n * 100).toFixed(n < 0.1 ? 1 : 0)}%`;

/** Horizontal funnel: centred bars grow in per stage, with conversion from the top and drop-off between stages. */
export function FunnelChart({
  stages,
  barHeight = 38,
  gap = 24,
  valueFormatter = (n) => n.toLocaleString("en-US"),
  title,
  className,
}: FunnelChartProps) {
  const reduce = useReducedMotion();
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = React.useState<number | null>(null);
  const refs = React.useRef<(SVGRectElement | null)[]>([]);

  const compact = width < 480;
  const L = compact ? 0 : Math.min(150, width * 0.26);
  const R = 64;
  const B = width - L - R;
  const labelRow = compact ? 18 : 0;
  const top = stages[0]?.value || 1;
  const rows = stages.map((s, i) => {
    const w = Math.max(4, (B * s.value) / top);
    const y = i * (barHeight + gap + labelRow) + labelRow;
    return { ...s, w, x: L + (B - w) / 2, y, conv: s.value / top, step: i ? s.value / (stages[i - 1].value || 1) : 1 };
  });
  const height = rows.length ? rows[rows.length - 1].y + barHeight + 2 : 0;

  const focusRow = (i: number) => refs.current[(i + rows.length) % rows.length]?.focus();
  const tip = active !== null ? rows[active] : null;

  return (
    <figure className={cn("w-full rounded-lg border border-border bg-surface-raised p-4 shadow-sm sm:p-5", className)}>
      {title && <figcaption className="mb-4 text-[14.5px] font-semibold text-ink">{title}</figcaption>}
      <div ref={wrapRef} className="relative" onPointerLeave={() => setActive(null)}>
        <svg width={width} height={height} className="block overflow-visible" role="group" aria-label={title ?? "Funnel chart"}>
          {rows.slice(0, -1).map((r, i) => {
            const n = rows[i + 1];
            const y0 = r.y + barHeight;
            const y1 = n.y;
            const drop = 1 - n.step;
            return (
              <g key={`c-${r.label}`}>
                <motion.polygon
                  points={`${r.x},${y0} ${r.x + r.w},${y0} ${n.x + n.w},${y1} ${n.x},${y1}`}
                  className="fill-volt-soft"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: active === null || active === i || active === i + 1 ? 1 : 0.4 }}
                  transition={{ duration: 0.4, delay: reduce ? 0 : 0.25 + i * 0.08 }}
                />
                <motion.text
                  x={width - 2}
                  y={(y0 + y1 - labelRow) / 2 + labelRow / 2}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-danger text-[11px] tabular-nums"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: reduce ? 0 : 0.6 + i * 0.08 }}
                >
                  ↓ {fmtPct(drop)} drop
                </motion.text>
              </g>
            );
          })}

          {rows.map((r, i) => {
            const on = active === null || active === i;
            const inside = r.w > 70;
            return (
              <g key={r.label}>
                {compact ? (
                  <text x={0} y={r.y - 6} className="fill-ink text-[12px] font-medium">
                    {r.label} <tspan className="fill-ink-subtle font-normal">· {valueFormatter(r.value)}</tspan>
                  </text>
                ) : (
                  <>
                    <text x={0} y={r.y + barHeight / 2 - 7} dy="0.32em" className="fill-ink text-[12.5px] font-medium">
                      {r.label}
                    </text>
                    <text x={0} y={r.y + barHeight / 2 + 9} dy="0.32em" className="fill-ink-subtle text-[11.5px] tabular-nums">
                      {valueFormatter(r.value)}
                    </text>
                  </>
                )}
                <motion.rect
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  y={r.y}
                  height={barHeight}
                  rx={8}
                  style={{ fill: "var(--volt)" }}
                  tabIndex={0}
                  role="img"
                  aria-label={`${r.label}: ${valueFormatter(r.value)}, ${fmtPct(r.conv)} of ${rows[0].label}${i ? `, ${fmtPct(r.step)} from ${rows[i - 1].label}` : ""}`}
                  initial={{ width: 0, x: L + B / 2 }}
                  animate={{ width: r.w, x: r.x, opacity: on ? 1 - i * (0.4 / Math.max(1, rows.length - 1)) : 0.3 }}
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 20, delay: i * 0.08 }}
                  onPointerEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
                      e.preventDefault();
                      focusRow(i + 1);
                    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
                      e.preventDefault();
                      focusRow(i - 1);
                    }
                  }}
                  className="cursor-pointer outline-none [&:focus-visible]:stroke-volt-ink [&:focus-visible]:[stroke-width:2]"
                />
                {inside && (
                  <motion.text
                    x={L + B / 2}
                    y={r.y + barHeight / 2}
                    dy="0.32em"
                    textAnchor="middle"
                    pointerEvents="none"
                    className="fill-on-volt text-[12px] font-semibold tabular-nums"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: reduce ? 0 : 0.35 + i * 0.08 }}
                  >
                    {valueFormatter(r.value)}
                  </motion.text>
                )}
                <text x={width - 2} y={r.y + barHeight / 2} dy="0.32em" textAnchor="end" className="fill-ink text-[13px] font-semibold tabular-nums">
                  {fmtPct(r.conv)}
                </text>
              </g>
            );
          })}
        </svg>

        <AnimatePresence>
          {tip && active !== null && (
            <motion.div
              key="tip"
              aria-hidden
              initial={{ opacity: 0, y: 4, top: tip.y + barHeight + 6 }}
              animate={{ opacity: 1, y: 0, top: tip.y + barHeight + 6 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ type: "spring", stiffness: 500, damping: 36 }}
              style={{ left: L + B / 2, x: "-50%" }}
              className="pointer-events-none absolute z-10 min-w-48 rounded-sm border border-border bg-surface-raised px-3 py-2 text-xs shadow-md"
            >
              <p className="mb-1 font-semibold text-ink">{tip.label}</p>
              <p className="flex justify-between gap-4 text-ink-muted">
                Count <span className="font-mono tabular-nums text-ink">{valueFormatter(tip.value)}</span>
              </p>
              <p className="flex justify-between gap-4 text-ink-muted">
                Of {rows[0].label.toLowerCase()} <span className="font-mono tabular-nums text-ink">{fmtPct(tip.conv)}</span>
              </p>
              {active > 0 && (
                <p className="flex justify-between gap-4 text-ink-muted">
                  From previous <span className="font-mono tabular-nums text-ink">{fmtPct(tip.step)}</span>
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </figure>
  );
}
