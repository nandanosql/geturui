"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "@/components/ui/button";

export interface SwapSlotProps {
  /** When this changes, the old child blurs out and the new one slides in. */
  value: string | number | boolean;
  children: React.ReactNode;
  /** Direction the new content travels in from. */
  direction?: "up" | "down" | "left" | "right";
  /** Spring the slot's width to fit the new content. */
  animateWidth?: boolean;
  className?: string;
}

const offsets = {
  up: { x: 0, y: "70%" },
  down: { x: 0, y: "-70%" },
  left: { x: 14, y: 0 },
  right: { x: -14, y: 0 },
} as const;

/** Animates any changing child: blur + slide crossfade keyed on `value`, with a spring on width. */
export function SwapSlot({ value, children, direction = "up", animateWidth = true, className }: SwapSlotProps) {
  const reduce = useReducedMotion();
  const [width, setWidth] = React.useState<number | "auto">("auto");
  const o = offsets[direction];

  const measure = React.useCallback((el: HTMLSpanElement | null) => {
    if (!el || !animateWidth) return;
    const ro = new ResizeObserver(() => setWidth(el.offsetWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [animateWidth]);

  return (
    <motion.span
      className={cn("relative inline-flex items-center justify-center", className)}
      initial={false}
      animate={{ width: animateWidth ? width : "auto" }}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={String(value)}
          ref={measure}
          className="inline-flex shrink-0 items-center gap-[inherit] whitespace-nowrap"
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: o.x, y: o.y, filter: "blur(8px)" }}
          animate={{ opacity: 1, x: 0, y: 0, filter: "blur(0px)" }}
          exit={
            reduce
              ? { opacity: 0 }
              : {
                  opacity: 0,
                  x: typeof o.x === "number" ? -o.x : 0,
                  y: typeof o.y === "string" ? (o.y.startsWith("-") ? "70%" : "-70%") : 0,
                  filter: "blur(8px)",
                }
          }
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}

export interface MorphLabelState {
  label: React.ReactNode;
  icon?: React.ReactNode;
}

export interface MorphLabelProps {
  /** Resting state, e.g. “Add to cart”. */
  idle: MorphLabelState;
  /** Shown after the action resolves, e.g. “Added”. */
  done: MorphLabelState;
  /** Shown while the action's promise is pending. Defaults to a spinner with the idle label. */
  pending?: MorphLabelState;
  /** Shown briefly when the action throws. */
  error?: MorphLabelState;
  /** Runs on click from the idle state. May return a promise. */
  onAction?: () => void | Promise<unknown>;
  /** Runs on click from the done state when `resetAfter` is 0 (toggle behaviour). */
  onUndo?: () => void | Promise<unknown>;
  /** ms before returning to idle; 0 keeps the done state until clicked again. */
  resetAfter?: number;
  variant?: ButtonVariant;
  /** Variant used while in the done state. */
  doneVariant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

type Phase = "idle" | "pending" | "done" | "error";

/** CTA whose label and icon swap with a blur + slide crossfade (Add to cart → Added → back) while its width springs to fit. */
export function MorphLabel({
  idle,
  done,
  pending,
  error,
  onAction,
  onUndo,
  resetAfter = 1800,
  variant = "primary",
  doneVariant = "secondary",
  size = "md",
  disabled,
  className,
  ...rest
}: MorphLabelProps) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = React.useState<Phase>("idle");
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function later(next: Phase, ms: number) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPhase(next), ms);
  }

  /** Runs `fn`; only shows the pending state when it actually returns a promise. */
  async function settle(fn: (() => void | Promise<unknown>) | undefined) {
    const result = fn?.();
    if (result instanceof Promise) {
      setPhase("pending");
      await result;
    }
  }

  async function run() {
    if (phase === "pending") return;
    if (timer.current) clearTimeout(timer.current);
    if (phase === "done") {
      if (resetAfter > 0) return;
      try {
        await settle(onUndo);
        setPhase("idle");
      } catch {
        setPhase("done");
      }
      return;
    }
    try {
      await settle(onAction);
      setPhase("done");
      if (resetAfter > 0) later("idle", resetAfter);
    } catch {
      setPhase("error");
      later("idle", 1400);
    }
  }

  const pendingState: MorphLabelState = pending ?? {
    label: idle.label,
    icon: <Loader2 className="size-4 animate-spin" aria-hidden />,
  };
  const state = phase === "idle" ? idle : phase === "pending" ? pendingState : phase === "done" ? done : (error ?? idle);
  const v = phase === "done" ? doneVariant : phase === "error" ? "danger" : variant;

  return (
    <motion.button
      type="button"
      onClick={run}
      disabled={disabled}
      aria-busy={phase === "pending" || undefined}
      aria-pressed={resetAfter === 0 ? phase === "done" : undefined}
      aria-label={rest["aria-label"]}
      whileTap={reduce ? undefined : { scale: 0.96 }}
      animate={phase === "error" && !reduce ? { x: [0, -6, 6, -3, 3, 0] } : { x: 0 }}
      transition={{ x: { duration: 0.36 }, scale: { type: "spring", stiffness: 520, damping: 26 } }}
      className={buttonClasses({ variant: v, size, className: cn("overflow-hidden", className) })}
    >
      <SwapSlot value={phase === "pending" && !pending ? "pending" : phase} className="gap-[inherit]">
        {state.icon}
        <span>{state.label}</span>
      </SwapSlot>
      <span className="sr-only" aria-live="polite">
        {phase === "done" && typeof done.label === "string" ? done.label : phase === "error" && error && typeof error.label === "string" ? error.label : ""}
      </span>
    </motion.button>
  );
}
