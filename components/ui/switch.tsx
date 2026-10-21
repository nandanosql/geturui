"use client";

import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

/** Toggle with a spring-driven thumb that stretches while pressed. */
export function Switch({ checked, defaultChecked = false, onCheckedChange, label, disabled, className, ...rest }: SwitchProps) {
  const [inner, setInner] = React.useState(defaultChecked);
  const [pressed, setPressed] = React.useState(false);
  const on = checked ?? inner;

  function toggle() {
    if (checked === undefined) setInner(!on);
    onCheckedChange?.(!on);
  }

  const control = (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label ? undefined : rest["aria-label"]}
      disabled={disabled}
      onClick={toggle}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      className={cn(
        "relative flex h-6 w-[42px] shrink-0 items-center rounded-full border p-[2px] outline-none transition-colors duration-200",
        "focus-visible:shadow-[var(--focus-ring)] disabled:opacity-45",
        on ? "justify-end border-volt bg-volt" : "justify-start border-border-strong bg-surface-sunken",
        !label && className,
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 640, damping: 30 }}
        animate={{ width: pressed ? 22 : 18 }}
        className={cn("block h-[18px] rounded-full", on ? "bg-on-volt" : "bg-ink-muted")}
      />
    </button>
  );

  if (!label) return control;
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-3 text-sm font-medium text-ink", className)}>
      {control}
      {label}
    </label>
  );
}
