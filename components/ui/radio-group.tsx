"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion, type Transition } from "motion/react";
import { AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type RadioSize = "sm" | "md" | "lg";
export type RadioVariant = "default" | "card";
export type RadioCardIndicator = "radio" | "check" | "none";

const ringSize: Record<RadioSize, string> = { sm: "size-4", md: "size-5", lg: "size-6" };
const dotSize: Record<RadioSize, string> = { sm: "size-1.5", md: "size-2", lg: "size-2.5" };
const lineBox: Record<RadioSize, string> = { sm: "h-4", md: "h-5", lg: "h-6" };
const labelText: Record<RadioSize, string> = { sm: "text-[13px] leading-4", md: "text-sm leading-5", lg: "text-[15px] leading-6" };
const hintText: Record<RadioSize, string> = { sm: "text-xs leading-4", md: "text-[13px] leading-5", lg: "text-sm leading-5" };
const listGap: Record<RadioSize, string> = { sm: "gap-2.5", md: "gap-3", lg: "gap-4" };
const cardPad: Record<RadioSize, string> = { sm: "p-3 gap-2.5", md: "p-4 gap-3", lg: "p-5 gap-3.5" };
const cardMedia: Record<RadioSize, string> = { sm: "size-8 rounded-[9px]", md: "size-10 rounded-sm", lg: "size-11 rounded-sm" };

const glide: Transition = { type: "spring", stiffness: 520, damping: 34, mass: 0.8 };
const soft: Transition = { type: "spring", stiffness: 340, damping: 30 };

interface RadioContextValue {
  name: string;
  value: string | null;
  select: (value: string) => void;
  size: RadioSize;
  variant: RadioVariant;
  indicator: RadioCardIndicator;
  disabled: boolean;
  required: boolean;
  invalid: boolean;
  /** Prefix for the shared layoutIds (dot / card ring). */
  layoutKey: string;
  /** True when the new selection should glide in from a previous one. */
  glides: boolean;
}

const RadioContext = React.createContext<RadioContextValue | null>(null);

export interface RadioIndicatorProps {
  checked: boolean;
  size?: RadioSize;
  disabled?: boolean;
  invalid?: boolean;
  /** Shared layoutId so the filled disc glides between indicators. */
  layoutId?: string;
  /** Spring in from a smaller scale on mount instead of appearing. @default true */
  popIn?: boolean;
  className?: string;
}

/**
 * Visual-only radio circle. Place it right after a `peer` radio input to inherit focus and hover styles;
 * reuse it inside table rows or custom cards.
 */
export function RadioIndicator({ checked, size = "md", disabled, invalid, layoutId, popIn = true, className }: RadioIndicatorProps) {
  const reduce = useReducedMotion();
  return (
    <>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-full border transition-[border-color,box-shadow,transform] duration-200 ease-spring",
          "peer-focus-visible:shadow-[var(--focus-ring)] group-active/radio:scale-[0.9]",
          checked ? "border-volt" : invalid ? "border-danger bg-surface-sunken" : "border-border-strong bg-surface-sunken peer-hover:border-ink-subtle",
          disabled && !checked && "bg-surface-hover",
          className,
        )}
      />
      {checked && (
        <motion.span
          aria-hidden
          layoutId={reduce ? undefined : layoutId}
          initial={popIn ? (reduce ? { opacity: 0 } : { scale: 0.3, opacity: 0 }) : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={reduce ? { duration: 0.12 } : glide}
          className="pointer-events-none absolute inset-0 grid place-items-center rounded-full bg-volt"
        >
          <span className={cn("rounded-full bg-on-volt", dotSize[size])} />
        </motion.span>
      )}
    </>
  );
}

export interface RadioGroupProps {
  /** Visible group label; also names the radiogroup. Use `aria-label` when there is none. */
  label?: React.ReactNode;
  "aria-label"?: string;
  /** Helper text under the options. Replaced by `error` when both are set. */
  hint?: React.ReactNode;
  /** Error message; any truthy value marks every radio invalid. */
  error?: React.ReactNode;
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string) => void;
  /** Form field name. Generated when omitted. */
  name?: string;
  /** 16 / 20 / 24 px indicator; card padding scales too. @default "md" */
  size?: RadioSize;
  /** "card" renders each option as a selectable tile with a gliding volt ring. @default "default" */
  variant?: RadioVariant;
  /** Card mode only: the mark in the corner of each card. @default "check" */
  indicator?: RadioCardIndicator;
  /** Options in a column, or a wrapping row (cards: a responsive grid). @default "vertical" */
  orientation?: "vertical" | "horizontal";
  disabled?: boolean;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Single-choice group with roving focus: arrows move and select, and the selected dot glides between options on a spring. */
export function RadioGroup({
  label,
  "aria-label": ariaLabel,
  hint,
  error,
  value,
  defaultValue = null,
  onValueChange,
  name,
  size = "md",
  variant = "default",
  indicator = "check",
  orientation = "vertical",
  disabled = false,
  required = false,
  className,
  children,
}: RadioGroupProps) {
  const auto = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [own, setOwn] = React.useState<string | null>(defaultValue);
  const current = value === undefined ? own : value;
  // Remember the previous selection so the new indicator knows whether to glide or pop in.
  const [last, setLast] = React.useState<string | null>(current);
  const [glides, setGlides] = React.useState(false);
  if (last !== current) {
    setGlides(last !== null);
    setLast(current);
  }

  const root = React.useRef<HTMLDivElement>(null);
  const invalid = Boolean(error);
  const message = typeof error === "boolean" ? hint : error || hint;
  const labelId = `rg${auto}-label`;
  const msgId = message ? `rg${auto}-msg` : undefined;

  const select = React.useCallback(
    (next: string) => {
      if (value === undefined) setOwn(next);
      onValueChange?.(next);
    },
    [value, onValueChange],
  );

  // Roving tabindex: one tab stop on the checked radio, or the first enabled one.
  React.useLayoutEffect(() => {
    const inputs = radios(root.current);
    const enabled = inputs.filter((i) => !i.disabled);
    const stop = enabled.find((i) => i.checked) ?? enabled[0];
    inputs.forEach((i) => {
      i.tabIndex = i === stop ? 0 : -1;
    });
  });

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (!(target instanceof HTMLInputElement) || target.type !== "radio") return;
    const enabled = radios(root.current).filter((i) => !i.disabled);
    const at = enabled.indexOf(target);
    if (at < 0) return;
    let next: HTMLInputElement | undefined;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = enabled[(at + 1) % enabled.length];
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = enabled[(at - 1 + enabled.length) % enabled.length];
    else if (e.key === "Home") next = enabled[0];
    else if (e.key === "End") next = enabled[enabled.length - 1];
    if (!next) return;
    e.preventDefault();
    next.focus();
    select(next.value);
  };

  const ctx: RadioContextValue = {
    name: name ?? `rg${auto}`,
    value: current,
    select,
    size,
    variant,
    indicator,
    disabled,
    required,
    invalid,
    layoutKey: `rg${auto}`,
    glides,
  };

  const reduce = useReducedMotion();
  return (
    <div className={cn("grid min-w-0 gap-2.5", className)}>
      {label && (
        <span id={labelId} className="text-[13px] font-medium leading-[18px] text-ink">
          {label}
          {required && (
            <span aria-hidden className="ml-0.5 text-volt-ink">
              *
            </span>
          )}
        </span>
      )}
      <RadioContext.Provider value={ctx}>
        <div
          ref={root}
          role="radiogroup"
          aria-labelledby={label ? labelId : undefined}
          aria-label={label ? undefined : ariaLabel}
          aria-describedby={msgId}
          aria-invalid={invalid || undefined}
          aria-required={required || undefined}
          aria-disabled={disabled || undefined}
          aria-orientation={orientation}
          onKeyDown={onKeyDown}
          className={cn(
            variant === "card"
              ? cn("grid gap-3", orientation === "horizontal" && "sm:grid-cols-[repeat(auto-fit,minmax(190px,1fr))]")
              : orientation === "horizontal"
                ? "flex flex-wrap gap-x-6 gap-y-3"
                : cn("grid", listGap[size]),
          )}
        >
          {children}
        </div>
      </RadioContext.Provider>
      <AnimatePresence initial={false} mode="popLayout">
        {message && (
          <motion.p
            key={invalid && typeof error !== "boolean" ? "error" : "hint"}
            id={msgId}
            initial={reduce ? { opacity: 0 } : { opacity: 0, filter: "blur(4px)", y: -2 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            exit={{ opacity: 0, filter: "blur(4px)" }}
            transition={{ duration: 0.18 }}
            className={cn(
              "m-0 flex items-center gap-1 text-xs font-medium leading-4",
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

function radios(root: HTMLElement | null): HTMLInputElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
}

export interface RadioProps {
  value: string;
  /** Option label (card mode: the card title). */
  label?: React.ReactNode;
  /** Supporting line (card mode: the description). Linked with aria-describedby. */
  hint?: React.ReactNode;
  disabled?: boolean;
  /** Accessible name when there is no visible label. */
  "aria-label"?: string;
  /** Card mode: leading icon, avatar or logo tile. */
  icon?: React.ReactNode;
  /** Card mode: inline text after the title, such as a handle or "per seat". */
  meta?: React.ReactNode;
  /** Card mode: large figure under the title, such as a price. */
  price?: React.ReactNode;
  /** Card mode: small pill under the description. */
  badge?: React.ReactNode;
  /** Card mode: actions rendered below the card body, outside the click target. */
  footer?: React.ReactNode;
  className?: string;
}

/** One option inside a RadioGroup: a native radio under a drawn indicator, or a selectable card in card mode. */
export function Radio({ value, label, hint, disabled: own, "aria-label": ariaLabel, icon, meta, price, badge, footer, className }: RadioProps) {
  const ctx = React.useContext(RadioContext);
  if (!ctx) throw new Error("Radio must be rendered inside a RadioGroup.");
  const reduce = useReducedMotion();
  const auto = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = `r${auto}`;
  const checked = ctx.value === value;
  const disabled = ctx.disabled || Boolean(own);
  const labelId = label ? `${id}-label` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;

  const input = (
    <input
      id={id}
      type="radio"
      name={ctx.name}
      value={value}
      checked={checked}
      disabled={disabled}
      required={ctx.required}
      aria-labelledby={labelId}
      aria-label={labelId ? undefined : ariaLabel}
      aria-describedby={hintId}
      onChange={() => ctx.select(value)}
      className={cn(
        ctx.variant === "card"
          ? "peer absolute size-px overflow-hidden opacity-0"
          : "peer absolute inset-0 m-0 cursor-[inherit] appearance-none rounded-full opacity-0",
      )}
    />
  );

  if (ctx.variant === "card") {
    return (
      <motion.div
        animate={{ y: checked && !reduce ? -2 : 0 }}
        transition={soft}
        className={cn(
          "relative flex flex-col rounded-md border bg-surface transition-[border-color,background-color,box-shadow] duration-200",
          "has-[input:focus-visible]:shadow-[var(--focus-ring)]",
          checked ? "border-transparent bg-surface-raised shadow-md" : ctx.invalid ? "border-danger" : "border-border hover:border-border-strong hover:bg-surface-hover",
          disabled && "opacity-45 hover:border-border hover:bg-surface",
          className,
        )}
      >
        <label htmlFor={id} className={cn("relative flex flex-1 items-start", cardPad[ctx.size], disabled ? "cursor-not-allowed" : "cursor-pointer")}>
          {input}
          {icon && (
            <span
              aria-hidden
              className={cn(
                "grid shrink-0 place-items-center border transition-colors duration-200",
                cardMedia[ctx.size],
                checked ? "border-volt-ink/40 bg-volt-soft text-volt-ink" : "border-border bg-surface-raised text-ink-muted",
              )}
            >
              {icon}
            </span>
          )}
          <span className={cn("grid min-w-0 flex-1 gap-1", ctx.indicator !== "none" && "pr-7")}>
            <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              {label && (
                <span id={labelId} className={cn("font-medium text-ink", labelText[ctx.size])}>
                  {label}
                </span>
              )}
              {meta && <span className="text-[13px] leading-5 text-ink-subtle">{meta}</span>}
            </span>
            {price && <span className="font-display text-2xl font-semibold leading-8 tracking-[-0.5px] text-ink">{price}</span>}
            {hint && (
              <span id={hintId} className={cn("text-ink-muted", hintText[ctx.size])}>
                {hint}
              </span>
            )}
            {badge && <span className="mt-1 flex">{badge}</span>}
          </span>
          {ctx.indicator !== "none" && (
            <span className={cn("absolute", ctx.size === "sm" ? "right-3 top-3" : "right-4 top-4")}>
              {ctx.indicator === "radio" ? (
                <span className={cn("relative inline-grid", ringSize.sm)}>
                  <RadioIndicator checked={checked} size="sm" disabled={disabled} invalid={ctx.invalid} />
                </span>
              ) : (
                <CheckMark checked={checked} invalid={ctx.invalid} />
              )}
            </span>
          )}
        </label>
        {footer && <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-4 py-2.5 text-[13px] text-ink-muted">{footer}</div>}
        {checked && (
          <motion.span
            aria-hidden
            layoutId={reduce ? undefined : `${ctx.layoutKey}-ring`}
            initial={ctx.glides || reduce ? false : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={soft}
            className="pointer-events-none absolute -inset-px rounded-[inherit] border-2 border-volt-ink shadow-[0_0_0_4px_var(--volt-soft)]"
          />
        )}
      </motion.div>
    );
  }

  return (
    <label
      htmlFor={id}
      className={cn("group/radio flex items-start gap-2.5", disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer", className)}
    >
      <span className={cn("flex shrink-0 items-center", lineBox[ctx.size])}>
        <span className={cn("relative inline-grid", ringSize[ctx.size])}>
          {input}
          <RadioIndicator
            checked={checked}
            size={ctx.size}
            disabled={disabled}
            invalid={ctx.invalid}
            layoutId={`${ctx.layoutKey}-dot`}
            popIn={!ctx.glides}
          />
        </span>
      </span>
      {(label || hint) && (
        <span className="grid min-w-0 gap-0.5">
          {label && (
            <span id={labelId} className={cn("font-medium text-ink", labelText[ctx.size])}>
              {label}
            </span>
          )}
          {hint && (
            <span id={hintId} className={cn("text-ink-muted", hintText[ctx.size])}>
              {hint}
            </span>
          )}
        </span>
      )}
    </label>
  );
}

function CheckMark({ checked, invalid }: { checked: boolean; invalid: boolean }) {
  const reduce = useReducedMotion();
  return (
    <span
      aria-hidden
      className={cn(
        "relative grid size-5 place-items-center rounded-full border transition-[background-color,border-color] duration-200",
        checked ? "border-volt bg-volt text-on-volt" : invalid ? "border-danger bg-surface-sunken" : "border-border-strong bg-surface-sunken",
      )}
    >
      <AnimatePresence initial={false}>
        {checked && (
          <motion.span
            initial={reduce ? { opacity: 0 } : { scale: 0.2, opacity: 0, rotate: -30 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={reduce ? { duration: 0.12 } : glide}
            className="grid place-items-center"
          >
            <Check className="size-3" strokeWidth={3} />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
