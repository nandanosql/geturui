"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { ArrowDownRight, ArrowUpRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KpiSegment {
  label: string;
  value: number;
}

export interface KpiCardProps {
  label?: string;
  /** Period caption, e.g. "October 2026". */
  period?: string;
  value?: number;
  /** Value for the previous period, used for the delta. */
  previous?: number;
  /** Label for the previous period, e.g. "Sep". */
  previousLabel?: string;
  format?: "currency" | "number";
  currency?: string;
  /** Parts that add up to `value`, shown in the breakdown. */
  segments?: KpiSegment[];
  /** When true a drop is the good direction (e.g. churn). */
  invert?: boolean;
  className?: string;
}

const focus = "outline-none focus-visible:shadow-[var(--focus-ring)]";
const shades = ["bg-ink", "bg-ink/55", "bg-ink/25"];

/** Headline KPI that counts up on mount, shows its delta with direction and word, and springs open a stacked breakdown. */
export function KpiCard({
  label = "Net revenue",
  period = "October 2026",
  value = 84250,
  previous = 74960,
  previousLabel = "Sep",
  format = "currency",
  currency = "USD",
  segments = [
    { label: "Subscriptions", value: 61400 },
    { label: "Add-ons", value: 15900 },
    { label: "Services", value: 6950 },
  ],
  invert = false,
  className,
}: KpiCardProps) {
  const reduce = useReducedMotion() ?? false;
  const [open, setOpen] = React.useState(false);
  const panelId = React.useId();

  const fmt = React.useMemo(
    () => (format === "currency" ? new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }) : new Intl.NumberFormat("en-US")),
    [format, currency],
  );
  const mv = useSpring(reduce ? value : 0, { stiffness: 55, damping: 18 });
  const text = useTransform(mv, (v) => fmt.format(Math.round(v)));
  React.useEffect(() => {
    if (reduce) mv.jump(value);
    else mv.set(value);
  }, [value, reduce, mv]);

  const change = previous ? (value - previous) / previous : 0;
  const up = change >= 0;
  const good = invert ? !up : up;
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;

  return (
    <section aria-label={label} className={cn("w-full max-w-[360px] rounded-xl border border-border bg-surface-raised p-5 shadow-sm", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-ink-muted">{label}</p>
        <p className="font-mono text-[11px] text-ink-subtle">{period}</p>
      </div>
      <p className="mt-2 font-display text-[38px] font-semibold leading-none tracking-[-1.2px] text-ink tabular-nums">
        <motion.span aria-hidden>{text}</motion.span>
        <span className="sr-only">{fmt.format(value)}</span>
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <motion.span
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 24, delay: reduce ? 0 : 0.5 }}
          className={cn("inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold", good ? "bg-success/12 text-success" : "bg-danger/12 text-danger")}
        >
          {up ? <ArrowUpRight aria-hidden className="size-3.5" /> : <ArrowDownRight aria-hidden className="size-3.5" />}
          <span className="sr-only">{up ? "Up" : "Down"}</span>
          {Math.abs(change * 100).toFixed(1)}%
        </motion.span>
        <span className="text-xs text-ink-subtle">
          vs {fmt.format(previous)} in {previousLabel}
        </span>
      </div>

      <div className="mt-5 border-t border-border pt-3">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className={cn("flex w-full items-center justify-between rounded-xs py-1 text-[13px] font-medium text-ink", focus)}
        >
          {open ? "Hide breakdown" : "Show breakdown"}
          <ChevronDown aria-hidden className={cn("size-4 text-ink-muted transition-transform duration-300 ease-spring", open && "rotate-180")} />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id={panelId}
              initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
              animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
              exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="overflow-hidden"
            >
              <div className="mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full">
                {segments.map((s, i) => (
                  <motion.span
                    key={s.label}
                    className={cn("h-full origin-left first:rounded-l-full last:rounded-r-full", shades[i % shades.length])}
                    style={{ width: `${(s.value / total) * 100}%` }}
                    initial={reduce ? false : { scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ type: "spring", stiffness: 160, damping: 22, delay: reduce ? 0 : 0.08 + i * 0.08 }}
                  />
                ))}
              </div>
              <ul className="mt-3 space-y-1.5 pb-1">
                {segments.map((s, i) => (
                  <li key={s.label} className="flex items-center gap-2 text-[13px]">
                    <span aria-hidden className={cn("size-2 rounded-full", shades[i % shades.length])} />
                    <span className="flex-1 text-ink-muted">{s.label}</span>
                    <span className="font-medium tabular-nums text-ink">{fmt.format(s.value)}</span>
                    <span className="w-10 text-right font-mono text-[11px] text-ink-subtle">{Math.round((s.value / total) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
