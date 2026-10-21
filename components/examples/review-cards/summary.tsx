"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { Star, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RatingSummaryCardProps {
  /** Review counts per star, index 0 = 5 stars … index 4 = 1 star. */
  counts?: [number, number, number, number, number];
  title?: string;
  /** Short line under the title, e.g. the product name. */
  subtitle?: string;
  /** Initially selected star filter (1–5), or null for all. */
  defaultFilter?: number | null;
  onFilterChange?: (stars: number | null) => void;
  onWriteReview?: () => void;
  className?: string;
}

const focus = "outline-none focus-visible:shadow-[var(--focus-ring)]";

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("relative inline-flex", className)} aria-hidden>
      <span className="flex gap-0.5 text-ink-subtle/40">
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} className="size-4" fill="currentColor" strokeWidth={0} />
        ))}
      </span>
      <span className="absolute inset-0 flex gap-0.5 overflow-hidden text-volt-ink" style={{ width: `${(value / 5) * 100}%` }}>
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} className="size-4 shrink-0" fill="currentColor" strokeWidth={0} />
        ))}
      </span>
    </span>
  );
}

/** Rating summary: the average counts up, the star histogram grows in, and every bar filters the review list below it. */
export function RatingSummaryCard({
  counts = [1284, 412, 96, 31, 18],
  title = "Customer reviews",
  subtitle = "Halden Desk Lamp · Oak",
  defaultFilter = null,
  onFilterChange,
  onWriteReview,
  className,
}: RatingSummaryCardProps) {
  const reduce = useReducedMotion() ?? false;
  const [filter, setFilter] = React.useState<number | null>(defaultFilter);
  const total = counts.reduce((a, b) => a + b, 0);
  const average = total ? counts.reduce((sum, c, i) => sum + c * (5 - i), 0) / total : 0;
  const max = Math.max(...counts, 1);
  const recommend = total ? Math.round(((counts[0] + counts[1]) / total) * 100) : 0;

  const mv = useSpring(reduce ? average : 0, { stiffness: 60, damping: 18 });
  const shown = useTransform(mv, (v) => v.toFixed(1));
  React.useEffect(() => {
    if (reduce) mv.jump(average);
    else mv.set(average);
  }, [average, reduce, mv]);

  function choose(next: number | null) {
    setFilter(next);
    onFilterChange?.(next);
  }

  return (
    <section aria-label={title} className={cn("w-full max-w-[380px] rounded-xl border border-border bg-surface-raised p-5 shadow-sm", className)}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
          <p className="text-xs text-ink-subtle">{subtitle}</p>
        </div>
        <span className="rounded-full bg-volt-soft px-2.5 py-1 text-[11px] font-medium text-volt-ink">{recommend}% recommend</span>
      </header>

      <div className="mt-4 flex items-end gap-3">
        <p className="font-display text-[44px] font-semibold leading-none tracking-[-1.5px] text-ink tabular-nums">
          <motion.span aria-hidden>{shown}</motion.span>
          <span className="sr-only">{average.toFixed(1)} out of 5</span>
        </p>
        <div className="pb-1">
          <Stars value={average} />
          <p className="mt-1 text-xs text-ink-muted">Based on {total.toLocaleString("en-US")} reviews</p>
        </div>
      </div>

      <div role="group" aria-label="Filter reviews by rating" className="mt-5 space-y-1">
        {counts.map((count, i) => {
          const stars = 5 - i;
          const on = filter === stars;
          const dim = filter !== null && !on;
          const pct = total ? Math.round((count / total) * 100) : 0;
          return (
            <motion.button
              key={stars}
              type="button"
              aria-pressed={on}
              aria-label={`${stars} star, ${count} reviews, ${pct}%`}
              whileTap={reduce ? undefined : { scale: 0.98 }}
              onClick={() => choose(on ? null : stars)}
              className={cn("group flex w-full items-center gap-3 rounded-sm px-2 py-1.5 transition-colors hover:bg-surface-hover", on && "bg-surface-hover", focus)}
            >
              <span className={cn("flex w-7 items-center gap-0.5 text-xs font-medium tabular-nums transition-opacity", dim ? "text-ink-subtle" : "text-ink")}>
                {stars}
                <Star aria-hidden className="size-3" fill="currentColor" strokeWidth={0} />
              </span>
              <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                <motion.span
                  className={cn("absolute inset-y-0 left-0 origin-left rounded-full transition-colors", on ? "bg-volt" : dim ? "bg-ink-subtle/35" : "bg-ink/75")}
                  style={{ width: `${(count / max) * 100}%` }}
                  initial={reduce ? false : { scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ type: "spring", stiffness: 120, damping: 20, delay: reduce ? 0 : 0.1 + i * 0.07 }}
                />
              </span>
              <span className={cn("w-10 text-right font-mono text-[11px] tabular-nums", dim ? "text-ink-subtle" : "text-ink-muted")}>{pct}%</span>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-4 flex min-h-9 items-center justify-between gap-3 border-t border-border pt-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {filter ? (
            <motion.button
              key="chip"
              type="button"
              aria-label={`Clear ${filter}-star filter`}
              onClick={() => choose(null)}
              initial={{ opacity: 0, filter: "blur(8px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(8px)" }}
              className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border border-border-strong px-3 text-xs text-ink", focus)}
            >
              {filter}-star · {counts[5 - filter].toLocaleString("en-US")}
              <X aria-hidden className="size-3.5 text-ink-muted" />
            </motion.button>
          ) : (
            <motion.p
              key="all"
              initial={{ opacity: 0, filter: "blur(8px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(8px)" }}
              className="text-xs text-ink-subtle"
            >
              Showing all ratings
            </motion.p>
          )}
        </AnimatePresence>
        <motion.button
          type="button"
          whileTap={reduce ? undefined : { scale: 0.96 }}
          onClick={onWriteReview}
          className={cn("h-9 shrink-0 rounded-full bg-volt px-4 text-[13px] font-semibold text-on-volt", focus)}
        >
          Write a review
        </motion.button>
      </div>
      <p aria-live="polite" className="sr-only">
        {filter ? `Showing ${filter}-star reviews` : "Showing all reviews"}
      </p>
    </section>
  );
}
