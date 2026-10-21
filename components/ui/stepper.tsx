"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepState = "upcoming" | "current" | "complete" | "error";

export interface StepItem {
  title: string;
  description?: string;
  /** Glyph for the "icon" marker. */
  icon?: React.ReactNode;
  /** Mark this step as failed (overrides the computed state). */
  error?: boolean;
}

export interface StepperProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  steps: StepItem[];
  /** Index of the current step (0-based). Pass steps.length when everything is done. */
  current: number;
  orientation?: "horizontal" | "vertical";
  /** "number" | "icon" | "dot" markers, or "bar" for segmented story-style bars (horizontal). */
  marker?: "number" | "icon" | "dot" | "bar";
  size?: "sm" | "md";
  /** Makes completed steps buttons that jump back. */
  onStepClick?: (index: number) => void;
  /**
   * Compact "Step 2 of 4" + progress bar. "mobile" swaps to it below the sm breakpoint.
   * Defaults to "mobile" for horizontal steppers and "never" for vertical ones.
   */
  compact?: "always" | "mobile" | "never";
  /** Accessible name for the step list. */
  label?: string;
}

const stateWord: Record<StepState, string> = { complete: "completed", current: "current step", upcoming: "not started", error: "needs attention" };

function stateOf(step: StepItem, i: number, current: number): StepState {
  if (step.error) return "error";
  if (i < current) return "complete";
  if (i === current) return "current";
  return "upcoming";
}

const markerSize = { sm: { box: "size-7 text-xs", px: 28, glyph: "size-3.5" }, md: { box: "size-9 text-sm", px: 36, glyph: "size-4" } };
const DOT_PX = 12;

/** Check that draws itself when a step completes. */
function DrawnCheck({ className, reduce }: { className: string; reduce: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <motion.path d="m5 12.5 4.5 4.5L19 7.5" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ type: "spring", stiffness: 180, damping: 22 }} />
    </svg>
  );
}

function Marker({ state, index, step, marker, size, reduce }: { state: StepState; index: number; step: StepItem; marker: "number" | "icon" | "dot"; size: "sm" | "md"; reduce: boolean }) {
  const m = markerSize[size];
  if (marker === "dot") {
    return (
      <span aria-hidden className="relative flex items-center justify-center" style={{ width: DOT_PX, height: DOT_PX }}>
        {state === "current" && !reduce && (
          <motion.span className="absolute inset-0 rounded-full bg-volt" animate={{ scale: [1, 2.4], opacity: [0.4, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }} />
        )}
        <span
          className={cn(
            "relative size-full rounded-full transition-colors duration-300",
            state === "complete" && "bg-volt",
            state === "current" && "bg-volt shadow-[0_0_0_3px_var(--color-volt-soft)]",
            state === "upcoming" && "border-2 border-border-strong bg-surface",
            state === "error" && "bg-danger",
          )}
        />
      </span>
    );
  }

  const face =
    state === "complete" ? (
      <DrawnCheck className={m.glyph} reduce={reduce} />
    ) : state === "error" ? (
      <X className={m.glyph} strokeWidth={2.75} />
    ) : marker === "icon" && step.icon ? (
      <span className={cn("inline-flex [&_svg]:size-full", m.glyph)}>{step.icon}</span>
    ) : (
      <span className="font-mono font-semibold tabular-nums">{index + 1}</span>
    );

  return (
    <span aria-hidden className={cn("relative flex shrink-0 items-center justify-center rounded-full", m.box)}>
      {state === "current" && !reduce && (
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-volt-ink"
          animate={{ scale: [1, 1.35], opacity: [0.5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <span
        className={cn(
          "relative flex size-full items-center justify-center overflow-hidden rounded-full transition-[background-color,color,box-shadow] duration-300",
          state === "complete" && "bg-volt text-on-volt",
          state === "current" && "bg-volt-soft text-volt-ink shadow-[inset_0_0_0_2px_var(--color-volt-ink)]",
          state === "upcoming" && "bg-surface text-ink-subtle shadow-[inset_0_0_0_1.5px_var(--color-border-strong)]",
          state === "error" && "bg-danger-soft text-danger shadow-[inset_0_0_0_2px_var(--color-danger)]",
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={state === "complete" ? "done" : state === "error" ? "err" : "idle"}
            className="flex items-center justify-center"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5, filter: "blur(4px)" }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
          >
            {face}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}

/** Connector track with a volt fill that springs along it when the step before completes. */
function Connector({ filled, vertical, reduce, className, style }: { filled: boolean; vertical?: boolean; reduce: boolean; className?: string; style?: React.CSSProperties }) {
  return (
    <span aria-hidden className={cn("absolute overflow-hidden rounded-full bg-border", className)} style={style}>
      <motion.span
        className={cn("absolute inset-0 rounded-full bg-volt", vertical ? "origin-top" : "origin-left")}
        initial={false}
        animate={vertical ? { scaleY: filled ? 1 : 0 } : { scaleX: filled ? 1 : 0 }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 22 }}
      />
    </span>
  );
}

/** Compact "Step 2 of 4" header with a springing progress bar — the mobile form of the stepper. */
export function StepperCompact({ steps, current, className }: { steps: StepItem[]; current: number; className?: string }) {
  const reduce = !!useReducedMotion();
  const total = steps.length;
  const at = Math.min(current, total - 1);
  const done = current >= total;
  const step = steps[at];
  const pct = total ? Math.min(1, (current + (done ? 0 : 1)) / total) : 0;
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-medium text-ink-muted">
          {done ? "All steps complete" : <>Step <span className="font-mono text-ink">{at + 1}</span> of <span className="font-mono">{total}</span></>}
        </p>
        {step?.error && <p className="text-[13px] font-medium text-danger">Needs attention</p>}
      </div>
      {!done && step && (
        <div className="relative mt-1 min-h-6 overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p
              key={at}
              className="text-base font-semibold text-ink"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(6px)" }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
            >
              {step.title}
            </motion.p>
          </AnimatePresence>
        </div>
      )}
      <div
        role="progressbar"
        aria-label="Progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={Math.min(current + (done ? 0 : 1), total)}
        aria-valuetext={done ? "All steps complete" : `Step ${at + 1} of ${total}: ${step?.title ?? ""}`}
        className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken"
      >
        <motion.div
          className={cn("h-full origin-left rounded-full", step?.error ? "bg-danger" : "bg-volt")}
          initial={false}
          animate={{ scaleX: pct }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 22 }}
        />
      </div>
    </div>
  );
}

/** Progress steps, horizontal or vertical, with number/icon/dot/bar markers, spring-filled connectors and clickable completed steps. */
export function Stepper({
  steps,
  current,
  orientation = "horizontal",
  marker = "number",
  size = "md",
  onStepClick,
  compact,
  label = "Progress",
  className,
  ...props
}: StepperProps) {
  const reduce = !!useReducedMotion();
  const vertical = orientation === "vertical";
  const mode = compact ?? (vertical ? "never" : "mobile");
  const bars = marker === "bar" && !vertical;
  const markerKind = marker === "bar" ? "dot" : marker;
  const m = markerKind === "dot" ? DOT_PX : markerSize[size].px;

  const full = (
    <ol
      aria-label={label}
      className={cn(vertical ? "flex flex-col" : "grid", mode === "mobile" && "hidden sm:grid", mode === "mobile" && vertical && "sm:flex")}
      style={vertical ? undefined : { gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`, gap: bars ? 12 : undefined }}
    >
      {steps.map((step, i) => {
        const state = stateOf(step, i, current);
        const clickable = !!onStepClick && state === "complete";
        const isLast = i === steps.length - 1;
        const text = (
          <>
            <span
              className={cn(
                "block font-semibold leading-snug transition-colors duration-300",
                size === "sm" ? "text-[13px]" : "text-sm",
                state === "upcoming" ? "text-ink-muted" : state === "error" ? "text-danger" : "text-ink",
                clickable && "group-hover/step:text-volt-ink",
              )}
            >
              {step.title}
            </span>
            {step.description && (
              <span className={cn("mt-0.5 block leading-snug text-ink-subtle", size === "sm" ? "text-xs" : "text-[13px]", state === "upcoming" && "opacity-80")}>
                {step.description}
              </span>
            )}
            <span className="sr-only">, {stateWord[state]}</span>
          </>
        );

        const body = bars ? (
          <>
            <span aria-hidden className="relative block h-1.5 overflow-hidden rounded-full bg-border">
              <motion.span
                className={cn("absolute inset-0 origin-left rounded-full", state === "error" ? "bg-danger" : "bg-volt", state === "current" && "opacity-60")}
                initial={false}
                animate={{ scaleX: state === "upcoming" ? 0 : 1 }}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 22 }}
              />
            </span>
            <span className="mt-3 block text-left">{text}</span>
          </>
        ) : vertical ? (
          <span className="flex gap-3.5 text-left">
            <span className="flex shrink-0 justify-center" style={{ width: Math.max(m, 28) }}>
              <Marker state={state} index={i} step={step} marker={markerKind} size={size} reduce={reduce} />
            </span>
            <span className={cn("min-w-0", isLast ? "pb-0" : "pb-7")} style={{ paddingTop: markerKind === "dot" ? 0 : (m - 20) / 2 }}>
              {text}
            </span>
          </span>
        ) : (
          <span className="flex flex-col items-center text-center">
            <span className="flex items-center justify-center" style={{ height: Math.max(m, 12) }}>
              <Marker state={state} index={i} step={step} marker={markerKind} size={size} reduce={reduce} />
            </span>
            <span className="mt-2.5 block px-1">{text}</span>
          </span>
        );

        const connector = isLast || bars ? null : vertical ? (
          <Connector
            vertical
            filled={i < current && !step.error}
            reduce={reduce}
            className="w-0.5"
            style={{
              left: Math.max(m, 28) / 2 - 1,
              top: (markerKind === "dot" ? DOT_PX : m) + 6,
              bottom: 6,
            }}
          />
        ) : (
          <Connector
            filled={i < current && !step.error}
            reduce={reduce}
            className="h-0.5"
            style={{
              top: Math.max(m, 12) / 2 - 1,
              left: `calc(50% + ${m / 2 + 8}px)`,
              right: `calc(-50% + ${m / 2 + 8}px)`,
            }}
          />
        );

        return (
          <li key={i} aria-current={state === "current" ? "step" : undefined} className="relative min-w-0">
            {connector}
            {clickable ? (
              <button
                type="button"
                onClick={() => onStepClick?.(i)}
                className={cn("group/step block w-full rounded-sm outline-none focus-visible:shadow-[var(--focus-ring)]", vertical ? "" : "pb-1")}
              >
                <span className="sr-only">Go back to step {i + 1}: </span>
                {body}
              </button>
            ) : (
              <div className={cn(vertical ? "" : "pb-1")}>{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );

  return (
    <div className={cn("w-full", className)} {...props}>
      {mode !== "always" && full}
      {mode !== "never" && <StepperCompact steps={steps} current={current} className={mode === "mobile" ? "sm:hidden" : undefined} />}
    </div>
  );
}
