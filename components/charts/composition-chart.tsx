"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AreaChart, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs } from "@/components/ui/tabs";

export interface CompositionSeries {
  key: string;
  label: string;
  /** Any CSS colour; defaults to the token palette. */
  color?: string;
}

export interface CompositionDatum {
  /** Period label, e.g. "Mar". */
  label: string;
  values: Record<string, number>;
}

export interface CompositionChartProps {
  data: CompositionDatum[];
  series: CompositionSeries[];
  mode?: "bar" | "area";
  defaultMode?: "bar" | "area";
  onModeChange?: (mode: "bar" | "area") => void;
  /** Plot height in px (excluding legend and axis). */
  height?: number;
  /** Formats raw values in the tooltip. */
  valueFormatter?: (n: number) => string;
  title?: string;
  className?: string;
}

const PALETTE = ["var(--volt)", "var(--info)", "var(--ember)", "var(--success)", "var(--warning)", "var(--ink-subtle)"];
const M = { top: 8, right: 8, bottom: 26, left: 38 };

function useWidth<T extends HTMLElement>(fallback = 640) {
  const ref = React.useRef<T>(null);
  const [w, setW] = React.useState(fallback);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

const pct = (n: number) => `${(n * 100).toFixed(n > 0 && n < 0.1 ? 1 : 0)}%`;

/** 100% stacked bars or areas showing each series' share per period; toggles between the two, with a per-period tooltip and a legend that hides series. */
export function CompositionChart({
  data,
  series,
  mode,
  defaultMode = "bar",
  onModeChange,
  height = 240,
  valueFormatter = (n) => n.toLocaleString("en-US"),
  title,
  className,
}: CompositionChartProps) {
  const reduce = useReducedMotion();
  const [innerMode, setInnerMode] = React.useState(defaultMode);
  const view = mode ?? innerMode;
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const [active, setActive] = React.useState<number | null>(null);
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const gid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");

  const colored = series.map((s, i) => ({ ...s, color: s.color ?? PALETTE[i % PALETTE.length] }));
  const visible = colored.filter((s) => !hidden.has(s.key));

  const iw = width - M.left - M.right;
  const ih = height;
  const n = data.length;
  const band = iw / Math.max(1, n);
  const barW = Math.min(44, band * 0.62);

  // stacked shares per period: stacks[period][seriesKey] = [y0, y1] in 0..1
  const stacks = data.map((d) => {
    const total = visible.reduce((a, s) => a + Math.max(0, d.values[s.key] ?? 0), 0) || 1;
    let acc = 0;
    const out: Record<string, [number, number]> = {};
    for (const s of colored) {
      const v = hidden.has(s.key) ? 0 : Math.max(0, d.values[s.key] ?? 0) / total;
      out[s.key] = [acc, acc + v];
      acc += v;
    }
    return { total, out };
  });

  const y = (v: number) => ih - v * ih;
  const cx = (i: number) => band * i + band / 2;

  const areaPath = (key: string) => {
    if (!n) return "";
    const top = data.map((_, i) => `${i === 0 ? "M" : "L"}${cx(i).toFixed(2)},${y(stacks[i].out[key][1]).toFixed(2)}`);
    const bottom = data
      .map((_, i) => n - 1 - i)
      .map((i) => `L${cx(i).toFixed(2)},${y(stacks[i].out[key][0]).toFixed(2)}`);
    return `${top.join("")}${bottom.join("")}Z`;
  };

  const setView = (v: string) => {
    const m = v as "bar" | "area";
    if (mode === undefined) setInnerMode(m);
    onModeChange?.(m);
  };

  const toggle = (key: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else if (series.length - next.size > 1) next.add(key);
      return next;
    });

  const springT = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 180, damping: 26 };
  const tip = active !== null ? data[active] : null;
  const tipLeft = active !== null ? M.left + cx(active) : 0;

  return (
    <figure className={cn("w-full rounded-lg border border-border bg-surface-raised p-4 shadow-sm sm:p-5", className)}>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        {title && <figcaption className="mr-auto text-[14.5px] font-semibold text-ink">{title}</figcaption>}
        <Tabs
          size="sm"
          aria-label="Chart type"
          value={view}
          onValueChange={setView}
          className={cn(!title && "mr-auto")}
          items={[
            { value: "bar", label: "Bars", icon: <BarChart3 aria-hidden className="size-3.5" /> },
            { value: "area", label: "Area", icon: <AreaChart aria-hidden className="size-3.5" /> },
          ]}
        />
      </div>

      <div ref={wrapRef} className="relative" onPointerLeave={() => setActive(null)}>
        <svg width={width} height={ih + M.top + M.bottom} className="block overflow-visible" role="group" aria-label={title ?? "Composition chart"}>
          <defs>
            <clipPath id={`${gid}-reveal`}>
              <motion.rect
                x={0}
                y={-10}
                height={ih + 20}
                initial={{ width: reduce ? iw + 20 : 0 }}
                animate={{ width: iw + 20 }}
                transition={{ duration: reduce ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
            </clipPath>
          </defs>
          <g transform={`translate(${M.left},${M.top})`}>
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
              <g key={t}>
                <line x1={0} x2={iw} y1={y(t)} y2={y(t)} className="stroke-border" strokeDasharray={t === 0 ? undefined : "3 4"} />
                <text x={-8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-subtle text-[10.5px] tabular-nums">
                  {t * 100}%
                </text>
              </g>
            ))}

            {active !== null && (
              <rect x={band * active} y={0} width={band} height={ih} className="fill-surface-hover" rx={6} pointerEvents="none" />
            )}

            <AnimatePresence mode="wait" initial={false}>
              {view === "bar" ? (
                <motion.g key="bars" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                  {data.map((d, i) =>
                    colored.map((s, k) => {
                      const [a, b] = stacks[i].out[s.key];
                      const h = Math.max(0, (b - a) * ih);
                      return (
                        <motion.rect
                          key={`${d.label}-${s.key}`}
                          x={cx(i) - barW / 2}
                          width={barW}
                          rx={h > 4 ? 3 : 0}
                          style={{ fill: s.color }}
                          stroke="var(--surface-raised)"
                          strokeWidth={h > 2 ? 1.5 : 0}
                          initial={{ y: ih, height: 0 }}
                          animate={{ y: y(b), height: h, opacity: active === null || active === i ? 1 : 0.45 }}
                          transition={reduce ? { duration: 0 } : { ...springT, delay: (i * 0.04 + k * 0.03) }}
                        />
                      );
                    }),
                  )}
                </motion.g>
              ) : (
                <motion.g
                  key="area"
                  clipPath={`url(#${gid}-reveal)`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  {colored.map((s) => (
                    <motion.path
                      key={s.key}
                      initial={false}
                      animate={{ d: areaPath(s.key) }}
                      transition={springT}
                      style={{ fill: s.color }}
                      fillOpacity={0.88}
                      stroke="var(--surface-raised)"
                      strokeWidth={1.25}
                    />
                  ))}
                  {active !== null && <line x1={cx(active)} x2={cx(active)} y1={0} y2={ih} className="stroke-ink" strokeOpacity={0.5} />}
                </motion.g>
              )}
            </AnimatePresence>

            {data.map((d, i) => (
              <text key={d.label} x={cx(i)} y={ih + 18} textAnchor="middle" className={cn("text-[11px]", active === i ? "fill-ink" : "fill-ink-subtle")}>
                {d.label}
              </text>
            ))}

            {data.map((d, i) => (
              <rect
                key={`hit-${d.label}`}
                x={band * i}
                y={0}
                width={band}
                height={ih}
                fill="transparent"
                tabIndex={0}
                role="img"
                aria-label={`${d.label}: ${visible.map((s) => `${s.label} ${pct(stacks[i].out[s.key][1] - stacks[i].out[s.key][0])}`).join(", ")}`}
                onPointerEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                    e.preventDefault();
                    const next = (e.currentTarget.parentNode?.querySelectorAll<SVGRectElement>("rect[tabindex]") ?? [])[
                      (i + (e.key === "ArrowRight" ? 1 : -1) + n) % n
                    ];
                    next?.focus();
                  } else if (e.key === "Escape") {
                    (e.currentTarget as SVGRectElement).blur();
                  }
                }}
                className="cursor-crosshair outline-none"
              />
            ))}
          </g>
        </svg>

        <AnimatePresence>
          {tip && active !== null && (
            <motion.div
              key="tip"
              aria-hidden
              initial={{ opacity: 0, scale: 0.96, left: tipLeft }}
              animate={{ opacity: 1, scale: 1, left: tipLeft }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.1 } }}
              transition={{ type: "spring", stiffness: 500, damping: 36 }}
              style={{ x: tipLeft > width * 0.6 ? "calc(-100% - 14px)" : "14px" }}
              className="pointer-events-none absolute top-1 z-10 min-w-44 rounded-sm border border-border bg-surface-raised px-3 py-2 text-xs shadow-md"
            >
              <p className="mb-1.5 font-semibold text-ink">{tip.label}</p>
              <ul className="space-y-1">
                {[...visible].reverse().map((s) => {
                  const [a, b] = stacks[active].out[s.key];
                  return (
                    <li key={s.key} className="flex items-center gap-2">
                      <span className="size-2 rounded-[3px]" style={{ background: s.color }} />
                      <span className="flex-1 text-ink-muted">{s.label}</span>
                      <span className="font-mono tabular-nums text-ink-subtle">{valueFormatter(tip.values[s.key] ?? 0)}</span>
                      <span className="w-10 text-right font-mono font-medium tabular-nums text-ink">{pct(b - a)}</span>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Series">
        {colored.map((s) => {
          const on = !hidden.has(s.key);
          return (
            <li key={s.key}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(s.key)}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium outline-none transition-[color,border-color,opacity] focus-visible:shadow-[var(--focus-ring)]",
                  on ? "border-border text-ink" : "border-dashed border-border text-ink-subtle opacity-70",
                )}
              >
                <span
                  aria-hidden
                  className="size-2.5 rounded-[3px] transition-transform duration-300 ease-[var(--ease-spring)]"
                  style={{ background: s.color, transform: on ? "scale(1)" : "scale(0.5)" }}
                />
                {s.label}
              </button>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
