"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { Check, Minus, Plus, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GoalRingCardProps {
  label?: string;
  /** What one step counts, e.g. "demos booked". */
  unit?: string;
  defaultValue?: number;
  goal?: number;
  /** Deadline caption, e.g. "Ends Oct 31". */
  deadline?: string;
  /** Checkpoints shown under the ring, as fractions of the goal. */
  milestones?: number[];
  onChange?: (value: number) => void;
  className?: string;
}

const focus = "outline-none focus-visible:shadow-[var(--focus-ring)]";
const R = 52;
const C = 2 * Math.PI * R;

/** Goal progress ring: the arc and percentage spring to each new value, milestones tick off, and hitting the goal swaps in a done state. */
export function GoalRingCard({
  label = "Q4 sales goal",
  unit = "demos booked",
  defaultValue = 34,
  goal = 48,
  deadline = "Ends Dec 31",
  milestones = [0.25, 0.5, 0.75, 1],
  onChange,
  className,
}: GoalRingCardProps) {
  const reduce = useReducedMotion() ?? false;
  const [value, setValue] = React.useState(defaultValue);
  const pct = Math.min(1, value / goal);
  const done = value >= goal;

  const mv = useSpring(reduce ? pct : 0, { stiffness: 90, damping: 20 });
  const offset = useTransform(mv, (v) => C * (1 - v));
  const label100 = useTransform(mv, (v) => `${Math.round(v * 100)}%`);
  React.useEffect(() => {
    if (reduce) mv.jump(pct);
    else mv.set(pct);
  }, [pct, reduce, mv]);

  function set(n: number) {
    const next = Math.max(0, Math.min(goal, n));
    setValue(next);
    onChange?.(next);
  }

  return (
    <section aria-label={label} className={cn("w-full max-w-[340px] rounded-xl border border-border bg-surface-raised p-5 shadow-sm", className)}>
      <div className="flex items-center justify-between">
        <p className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted">
          <Target aria-hidden className="size-4" />
          {label}
        </p>
        <span className="font-mono text-[11px] text-ink-subtle">{deadline}</span>
      </div>

      <div className="mt-4 flex items-center gap-5">
        <div className="relative size-[132px] shrink-0">
          <svg viewBox="0 0 132 132" className="size-full -rotate-90" role="progressbar" aria-label={`${label} progress`} aria-valuemin={0} aria-valuemax={goal} aria-valuenow={value} aria-valuetext={`${value} of ${goal} ${unit}`}>
            <circle cx="66" cy="66" r={R} fill="none" strokeWidth="12" className="stroke-surface-sunken" />
            <motion.circle cx="66" cy="66" r={R} fill="none" strokeWidth="12" strokeLinecap="round" strokeDasharray={C} style={{ strokeDashoffset: offset }} className="stroke-volt" />
            {milestones.slice(0, -1).map((m) => {
              const a = m * 2 * Math.PI;
              return <circle key={m} cx={66 + R * Math.cos(a)} cy={66 + R * Math.sin(a)} r="2" className={cn("transition-colors", pct >= m ? "fill-on-volt/40" : "fill-ink-subtle/50")} />;
            })}
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <AnimatePresence mode="popLayout" initial={false}>
              {done ? (
                <motion.span
                  key="done"
                  initial={reduce ? { opacity: 0 } : { scale: 0.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 16 }}
                  className="grid size-12 place-items-center rounded-full bg-volt text-on-volt"
                >
                  <Check aria-hidden className="size-6" strokeWidth={3} />
                </motion.span>
              ) : (
                <motion.span key="pct" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-display text-[28px] font-semibold tracking-[-0.8px] text-ink tabular-nums">
                  <motion.span>{label100}</motion.span>
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="min-w-0">
          <p className="font-display text-[28px] font-semibold leading-none tracking-[-0.8px] text-ink tabular-nums">
            {value}
            <span className="text-base font-medium text-ink-subtle"> / {goal}</span>
          </p>
          <p className="mt-1 text-xs text-ink-muted">{unit}</p>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p
              key={done ? "d" : "r"}
              initial={{ opacity: 0, filter: "blur(6px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(6px)" }}
              className={cn("mt-3 text-xs font-medium", done ? "text-volt-ink" : "text-ink")}
            >
              {done ? "Goal reached" : `${goal - value} to go`}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      <ol aria-label="Milestones" className="mt-5 grid grid-cols-4 gap-1.5">
        {milestones.map((m) => {
          const hit = pct >= m;
          return (
            <li key={m} className="text-center">
              <span className="block h-1 overflow-hidden rounded-full bg-surface-sunken">
                <motion.span className="block h-full origin-left rounded-full bg-ink" animate={{ scaleX: hit ? 1 : 0 }} transition={{ type: "spring", stiffness: 260, damping: 28 }} />
              </span>
              <span className={cn("mt-1 block font-mono text-[10.5px]", hit ? "text-ink" : "text-ink-subtle")}>
                {Math.round(m * goal)}
                <span className="sr-only">{hit ? " reached" : " not reached"}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
        <motion.button type="button" aria-label="Remove one" whileTap={reduce ? undefined : { scale: 0.92 }} onClick={() => set(value - 1)} disabled={value <= 0} className={cn("grid size-9 place-items-center rounded-full border border-border-strong/40 text-ink hover:bg-surface-hover disabled:opacity-40", focus)}>
          <Minus aria-hidden className="size-4" />
        </motion.button>
        <motion.button type="button" whileTap={reduce ? undefined : { scale: 0.96 }} onClick={() => set(value + 1)} disabled={done} className={cn("inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-volt text-[13px] font-semibold text-on-volt disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-subtle", focus)}>
          <Plus aria-hidden className="size-4" />
          Log one
        </motion.button>
      </div>
    </section>
  );
}
