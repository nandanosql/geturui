"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export type CheckboxSize = "sm" | "md" | "lg";

const box: Record<CheckboxSize, string> = { sm: "size-4 rounded-[5px]", md: "size-5 rounded-[6px]", lg: "size-6 rounded-[7px]" };
const text: Record<CheckboxSize, string> = { sm: "text-[13px] leading-4", md: "text-sm leading-5", lg: "text-[15px] leading-6" };

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "onChange" | "type"> {
  /** 16 / 20 / 24 px box. @default "md" */
  size?: CheckboxSize;
  /** Shows a dash: some, not all, children are checked. */
  indeterminate?: boolean;
  label?: React.ReactNode;
  /** Supporting text under the label. */
  hint?: React.ReactNode;
  /** Marks the box invalid; a string is announced as the error. */
  error?: boolean | string;
  onCheckedChange?: (checked: boolean) => void;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  wrapperClassName?: string;
}

/** Native checkbox under a spring-drawn tick: the box pops on press, the check draws its stroke, indeterminate morphs to a dash. */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { size = "md", indeterminate, label, hint, error, checked, defaultChecked, onCheckedChange, onChange, disabled, className, wrapperClassName, id, ...props },
  ref,
) {
  const auto = React.useId();
  const inputId = id ?? `cb${auto.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const inner = React.useRef<HTMLInputElement>(null);
  React.useImperativeHandle(ref, () => inner.current as HTMLInputElement);
  const [own, setOwn] = React.useState(Boolean(defaultChecked));
  const isOn = checked ?? own;
  const reduce = useReducedMotion();
  React.useEffect(() => {
    if (inner.current) inner.current.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);
  const invalid = Boolean(error);
  const describedBy = hint || typeof error === "string" ? `${inputId}-desc` : undefined;
  const filled = isOn || indeterminate;

  const control = (
    <span className={cn("relative inline-grid shrink-0 place-items-center", box[size])}>
      <input
        ref={inner}
        id={inputId}
        type="checkbox"
        checked={isOn}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(e) => {
          if (checked === undefined) setOwn(e.target.checked);
          onCheckedChange?.(e.target.checked);
          onChange?.(e);
        }}
        className="peer absolute inset-0 m-0 cursor-pointer appearance-none rounded-[inherit] opacity-0 disabled:cursor-not-allowed"
        {...props}
      />
      <motion.span
        aria-hidden
        animate={{ scale: 1 }}
        whileTap={reduce ? undefined : { scale: 0.86 }}
        className={cn(
          "pointer-events-none grid size-full place-items-center rounded-[inherit] border transition-[background-color,border-color,box-shadow] duration-150",
          "peer-focus-visible:shadow-[var(--focus-ring)]",
          filled ? "border-volt bg-volt text-on-volt" : invalid ? "border-danger bg-surface-sunken" : "border-border-strong bg-surface-sunken peer-hover:border-ink-subtle",
          disabled && "opacity-45",
          className,
        )}
      >
        <svg viewBox="0 0 16 16" className="size-[78%]" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <motion.path
            d={indeterminate ? "M4 8h8" : "M3.5 8.5l3 3 6-7"}
            initial={false}
            animate={{ pathLength: filled ? 1 : 0, opacity: filled ? 1 : 0 }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 30 }}
          />
        </svg>
      </motion.span>
    </span>
  );

  if (!label && !hint) return <span className={wrapperClassName}>{control}</span>;
  return (
    <div className={cn("flex items-start gap-2.5", disabled && "cursor-not-allowed", wrapperClassName)}>
      <span className={cn("flex items-center", size === "sm" ? "h-4" : size === "md" ? "h-5" : "h-6")}>{control}</span>
      <span className="grid gap-0.5">
        {label && (
          <label htmlFor={inputId} className={cn("cursor-pointer font-medium text-ink", text[size], disabled && "cursor-not-allowed opacity-45")}>
            {label}
          </label>
        )}
        {(hint || typeof error === "string") && (
          <span id={describedBy} className={cn("text-[13px] leading-5", typeof error === "string" ? "text-danger" : "text-ink-muted")}>
            {typeof error === "string" ? error : hint}
          </span>
        )}
      </span>
    </div>
  );
});

export interface CheckboxGroupOption {
  value: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  disabled?: boolean;
}

export interface CheckboxGroupProps {
  /** Group heading, rendered as the fieldset legend. */
  label: React.ReactNode;
  options: CheckboxGroupOption[];
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  size?: CheckboxSize;
  /** Adds a parent "Select all" box that turns indeterminate on partial selection. */
  selectAll?: React.ReactNode;
  /** Lay options out in a row on wide screens. */
  orientation?: "vertical" | "horizontal";
  hint?: React.ReactNode;
  error?: string;
  className?: string;
}

/** Fieldset of checkboxes with an optional select-all parent that tracks partial selection. */
export function CheckboxGroup({
  label,
  options,
  value,
  defaultValue = [],
  onValueChange,
  size = "md",
  selectAll,
  orientation = "vertical",
  hint,
  error,
  className,
}: CheckboxGroupProps) {
  const [own, setOwn] = React.useState<string[]>(defaultValue);
  const selected = value ?? own;
  const set = (next: string[]) => {
    if (value === undefined) setOwn(next);
    onValueChange?.(next);
  };
  const enabled = options.filter((o) => !o.disabled).map((o) => o.value);
  const all = enabled.length > 0 && enabled.every((v) => selected.includes(v));
  const some = !all && enabled.some((v) => selected.includes(v));
  return (
    <fieldset className={cn("m-0 grid min-w-0 gap-3 border-0 p-0", className)} aria-invalid={error ? true : undefined}>
      <legend className="mb-3 p-0 text-[13px] font-medium leading-[18px] text-ink">{label}</legend>
      {selectAll && (
        <Checkbox
          size={size}
          label={selectAll}
          checked={all}
          indeterminate={some}
          onCheckedChange={(on) => set(on ? Array.from(new Set([...selected, ...enabled])) : selected.filter((v) => !enabled.includes(v)))}
          wrapperClassName="border-b border-border pb-3"
        />
      )}
      <div className={cn("grid gap-3", orientation === "horizontal" && "sm:flex sm:flex-wrap sm:gap-x-6")}>
        {options.map((o) => (
          <Checkbox
            key={o.value}
            size={size}
            label={o.label}
            hint={o.hint}
            disabled={o.disabled}
            error={Boolean(error)}
            checked={selected.includes(o.value)}
            onCheckedChange={(on) => set(on ? [...selected, o.value] : selected.filter((v) => v !== o.value))}
          />
        ))}
      </div>
      {(error || hint) && <p className={cn("m-0 text-xs font-medium leading-4", error ? "text-danger" : "text-ink-subtle")}>{error || hint}</p>}
    </fieldset>
  );
}
