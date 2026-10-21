"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type FieldSize = "sm" | "md" | "lg";

const wellSizes: Record<FieldSize, string> = {
  sm: "min-h-8 px-2.5 text-[13px] gap-1.5 rounded-[9px]",
  md: "min-h-10 px-3 text-sm gap-2 rounded-[10px]",
  lg: "min-h-12 px-3.5 text-[15px] gap-2.5 rounded-xs",
};

/**
 * Class string for the sunken "well" every text-like control sits in (Input, Textarea, Select trigger).
 * Heights match Button: sm 32 · md 40 · lg 48.
 */
export function fieldWellClasses({
  size = "md",
  invalid,
  disabled,
  className,
}: {
  size?: FieldSize;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return cn(
    "flex w-full items-center border bg-surface-sunken text-ink-subtle transition-[border-color,box-shadow,background-color] duration-150",
    "focus-within:border-volt-ink focus-within:shadow-[0_0_0_3px_var(--volt-soft)]",
    invalid ? "border-danger focus-within:border-danger focus-within:shadow-[0_0_0_3px_var(--danger-soft)]" : "border-border-strong hover:border-ink-subtle",
    disabled && "pointer-events-none opacity-45",
    wellSizes[size],
    className,
  );
}

export interface FieldIds {
  /** id for the control itself. */
  id: string;
  /** id of the label element. */
  labelId: string;
  /** id of the hint/error line, set only when one is shown. */
  describedBy?: string;
  invalid: boolean;
}

export interface FieldProps {
  label?: React.ReactNode;
  /** Helper text under the control. Replaced by `error` when both are set. */
  hint?: React.ReactNode;
  /** Error message. Any truthy value marks the control invalid; `true` shows no message. */
  error?: React.ReactNode;
  /** Adds a required marker after the label. */
  required?: boolean;
  /** Right-aligned slot on the label row: "Optional", a counter, a link. */
  labelAside?: React.ReactNode;
  /** Use an existing id for the control. */
  id?: string;
  disabled?: boolean;
  /** Shake once when the field turns invalid. @default true */
  shakeOnError?: boolean;
  className?: string;
  /** The control. A function receives the ids and aria wiring to spread on it. */
  children: React.ReactNode | ((ids: FieldIds) => React.ReactNode);
}

/** Label, control and hint/error line with ids wired for screen readers; errors shake once and swap in with a blur. */
export function Field({ label, hint, error, required, labelAside, id, disabled, shakeOnError = true, className, children }: FieldProps) {
  const auto = React.useId();
  const controlId = id ?? `f${auto.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const invalid = Boolean(error);
  const message = typeof error === "boolean" ? hint : error || hint;
  const ids: FieldIds = {
    id: controlId,
    labelId: `${controlId}-label`,
    describedBy: message ? `${controlId}-msg` : undefined,
    invalid,
  };
  const reduce = useReducedMotion();
  return (
    <div className={cn("grid gap-1.5", disabled && "cursor-not-allowed", className)}>
      {(label || labelAside) && (
        <div className="flex items-baseline justify-between gap-3">
          {label && (
            <label id={ids.labelId} htmlFor={controlId} className="text-[13px] font-medium leading-[18px] text-ink">
              {label}
              {required && (
                <span aria-hidden className="ml-0.5 text-volt-ink">
                  *
                </span>
              )}
            </label>
          )}
          {labelAside && <span className="text-xs leading-4 text-ink-subtle">{labelAside}</span>}
        </div>
      )}
      <motion.div
        animate={invalid && shakeOnError && !reduce ? { x: [0, -4, 4, -2, 2, 0] } : { x: 0 }}
        transition={{ duration: 0.36 }}
      >
        {typeof children === "function" ? children(ids) : children}
      </motion.div>
      <AnimatePresence initial={false} mode="popLayout">
        {message && (
          <motion.p
            key={invalid && typeof error !== "boolean" ? "error" : "hint"}
            id={ids.describedBy}
            initial={reduce ? { opacity: 0 } : { opacity: 0, filter: "blur(4px)", y: -2 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            exit={{ opacity: 0, filter: "blur(4px)" }}
            transition={{ duration: 0.18 }}
            className={cn(
              "flex items-center gap-1 text-xs font-medium leading-4",
              invalid && typeof error !== "boolean" ? "text-danger" : "text-ink-subtle",
            )}
          >
            {invalid && typeof error !== "boolean" && <AlertCircle aria-hidden className="size-3.5 shrink-0" />}
            {message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
