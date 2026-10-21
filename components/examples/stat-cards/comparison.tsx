"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComparisonMetric {
  key: string;
  label: string;
  current: number;
  previous: number;
  /** Prefix such as "$". */
  prefix?: string;
  suffix?: string;
  /** A drop is good (e.g. refund rate). */
  invert?: boolean;
}

export interface ComparisonStatCardProps {
  title?: string;
  currentLabel?: string;
  previousLabel?: string;
  metrics?: ComparisonMetric[];
  defaultKey?: string;
  className?: string;
}

const DEFAULT_METRICS: ComparisonMetric[] = [
  { key: "revenue", label: "Revenue", current: 48210, previous: 39870, prefix: "$" },
  { key: "orders", label: "Orders", current: 1284, previous: 1342 },
  { key: "aov", label: "Avg. order", current: 37.55, previous: 29.71, prefix: "$" },
  { key: "refunds", label: "Refunds", current: 1.8, previous: 2.6, suffix: "%", invert: true },
];

const focus = "outline-none focus-visible:shadow-[var(--focus-ring)]";

function format(m: ComparisonMetric, n: number) {
  const digits = n % 1 ? 2 : 0;
  return `${m.prefix ?? ""}${n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}${m.suffix ?? ""}`;
}

/** Two-period comparison: pick a metric and both bars spring to their new lengths while the delta crossfades. */
export function ComparisonStatCard({
  title = "This month vs last",
  currentLabel = "Oct 1 – 31",
  previousLabel = "Sep 1 – 30",
  metrics = DEFAULT_METRICS,
  defaultKey,
  className,
}: ComparisonStatCardProps) {
  const reduce = useReducedMotion() ?? false;
  const baseId = React.useId();
  const [key, setKey] = React.useState(defaultKey ?? metrics[0]?.key);
  const m = metrics.find((x) => x.key === key) ?? metrics[0];
  const max = Math.max(m.current, m.previous) || 1;
  const change = m.previous ? (m.current - m.previous) / m.previous : 0;
  const up = change >= 0;
  const good = m.invert ? !up : up;
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 170, damping: 22 };

  const rows = [
    { label: currentLabel, value: m.current, bar: "bg-volt", text: "text-ink" },
    { label: previousLabel, value: m.previous, bar: "bg-ink-subtle/45", text: "text-ink-muted" },
  ];

  return (
    <section aria-label={title} className={cn("w-full max-w-[400px] rounded-xl border border-border bg-surface-raised p-5 shadow-sm", className)}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[13px] font-medium text-ink-muted">{title}</h3>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={m.key}
            initial={{ opacity: 0, filter: "blur(6px)", scale: 0.9 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            exit={{ opacity: 0, filter: "blur(6px)", scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className={cn("inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold", good ? "bg-success/12 text-success" : "bg-danger/12 text-danger")}
          >
            {up ? <ArrowUpRight aria-hidden className="size-3.5" /> : <ArrowDownRight aria-hidden className="size-3.5" />}
            {up ? "+" : "−"}
            {Math.abs(change * 100).toFixed(1)}%<span className="sr-only">{good ? ", better" : ", worse"}</span>
          </motion.span>
        </AnimatePresence>
      </div>

      <div role="tablist" aria-label="Metric" className="mt-3 flex gap-1 overflow-x-auto [scrollbar-width:none]">
        {metrics.map((x) => {
          const on = x.key === m.key;
          return (
            <button
              key={x.key}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={`${baseId}-panel`}
              onClick={() => setKey(x.key)}
              onKeyDown={(e) => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                const i = metrics.findIndex((y) => y.key === m.key);
                const next = metrics[(i + (e.key === "ArrowRight" ? 1 : -1) + metrics.length) % metrics.length];
                setKey(next.key);
                (e.currentTarget.parentElement?.querySelectorAll("button")[metrics.indexOf(next)] as HTMLButtonElement | undefined)?.focus();
              }}
              tabIndex={on ? 0 : -1}
              className={cn("relative h-8 shrink-0 rounded-full px-3 text-[12.5px] font-medium transition-colors", on ? "text-bg" : "text-ink-muted hover:text-ink", focus)}
            >
              {on && <motion.span layoutId={`${baseId}-m`} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }} className="absolute inset-0 rounded-full bg-ink" />}
              <span className="relative">{x.label}</span>
            </button>
          );
        })}
      </div>

      <div id={`${baseId}-panel`} role="tabpanel" aria-label={m.label} className="mt-5 space-y-4">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs text-ink-subtle">{r.label}</span>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={`${m.key}-${r.value}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className={cn("font-display text-xl font-semibold tracking-[-0.4px] tabular-nums", r.text)}
                >
                  {format(m, r.value)}
                </motion.span>
              </AnimatePresence>
            </div>
            <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-surface-sunken">
              <motion.div className={cn("h-full origin-left rounded-full", r.bar)} initial={reduce ? false : { scaleX: 0 }} animate={{ scaleX: r.value / max }} transition={spring} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-ink-subtle">
        {m.label} {up ? "rose" : "fell"} by {format(m, Math.abs(Math.round((m.current - m.previous) * 100) / 100))} against the previous period.
      </p>
    </section>
  );
}
