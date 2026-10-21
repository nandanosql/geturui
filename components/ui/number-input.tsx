"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown, ChevronUp, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Field, fieldWellClasses, type FieldSize } from "@/components/ui/field";

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "value" | "defaultValue" | "onChange" | "type" | "min" | "max" | "step"> {
  value?: number | null;
  defaultValue?: number | null;
  /** Called with the new value (null when the field is emptied). */
  onValueChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  /** Amount per arrow press or stepper tap; its decimals set the precision. @default 1 */
  step?: number;
  /** Amount for PageUp/PageDown and Shift+Arrow. @default step × 10 */
  largeStep?: number;
  /** @default "md" */
  size?: FieldSize;
  /** Steppers on both sides, or stacked chevrons on the right. @default "horizontal" */
  orientation?: "horizontal" | "vertical";
  /** Unit shown after the value, e.g. "seats" or "%". */
  unit?: string;
  /** Locale for formatting. Fixed by default so server and client render the same. @default "en-US" */
  locale?: string;
  formatOptions?: Intl.NumberFormatOptions;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  labelAside?: React.ReactNode;
  wrapperClassName?: string;
  /** Accessible names for the steppers. */
  incrementLabel?: string;
  decrementLabel?: string;
}

const stepperSize: Record<FieldSize, string> = { sm: "size-6", md: "size-8", lg: "size-10" };
const iconSize: Record<FieldSize, string> = { sm: "size-3.5", md: "size-4", lg: "size-[18px]" };

function decimalsOf(n: number) {
  const s = String(n);
  if (s.includes("e-")) return Number(s.split("e-")[1]);
  return (s.split(".")[1] ?? "").length;
}

/** One rolling digit column: a 0–9 strip that springs to the current digit. */
function DigitColumn({ digit, reduce }: { digit: number; reduce: boolean }) {
  return (
    <span className="relative inline-flex h-[1.25em] flex-col overflow-hidden leading-[1.25em]">
      <span className="invisible">0</span>
      <motion.span
        aria-hidden
        className="absolute inset-x-0 top-0 flex flex-col"
        initial={false}
        animate={{ y: `${-digit * 1.25}em` }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 30 }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <span key={n} className="block h-[1.25em] text-center">
            {n}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

function RollingNumber({ text, reduce }: { text: string; reduce: boolean }) {
  const chars = text.split("");
  return (
    <span className="inline-flex items-center tabular-nums" aria-hidden>
      <AnimatePresence initial={false} mode="popLayout">
        {chars.map((c, i) => {
          const fromRight = chars.length - i;
          const isDigit = c >= "0" && c <= "9";
          return (
            <motion.span
              key={isDigit ? `d${fromRight}` : `s${fromRight}${c}`}
              layout={reduce ? false : "position"}
              initial={reduce ? { opacity: 0 } : { opacity: 0, filter: "blur(4px)", y: "-0.4em" }}
              animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, filter: "blur(4px)", y: "0.4em" }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="inline-flex"
            >
              {isDigit ? <DigitColumn digit={Number(c)} reduce={reduce} /> : <span className="whitespace-pre">{c}</span>}
            </motion.span>
          );
        })}
      </AnimatePresence>
    </span>
  );
}

/**
 * Number field with steppers, min/max/step, arrow/Page/Home/End keys and press-and-hold repeat that speeds up;
 * digits roll to their new value on a spring.
 */
export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  {
    value,
    defaultValue = null,
    onValueChange,
    min,
    max,
    step = 1,
    largeStep,
    size = "md",
    orientation = "horizontal",
    unit,
    locale = "en-US",
    formatOptions,
    label,
    hint,
    error,
    labelAside,
    required,
    disabled,
    readOnly,
    id,
    className,
    wrapperClassName,
    incrementLabel = "Increase",
    decrementLabel = "Decrease",
    onKeyDown,
    onBlur,
    ...props
  },
  ref,
) {
  const reduce = useReducedMotion() ?? false;
  const [inner, setInner] = React.useState<number | null>(defaultValue);
  const current = value !== undefined ? value : inner;
  const [draft, setDraft] = React.useState<string | null>(null);
  const valueRef = React.useRef(current);
  const repeat = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const big = largeStep ?? step * 10;
  const decimals = decimalsOf(step);

  React.useEffect(() => {
    valueRef.current = current;
  }, [current]);
  React.useEffect(
    () => () => {
      if (repeat.current) clearTimeout(repeat.current);
    },
    [],
  );

  const format = React.useMemo(
    () => new Intl.NumberFormat(locale, formatOptions ?? { minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
    [locale, formatOptions, decimals],
  );
  const formatted = current === null ? "" : format.format(current);

  const clamp = React.useCallback(
    (n: number) => {
      const rounded = Number(n.toFixed(Math.min(decimals, 20)));
      return Math.min(max ?? Infinity, Math.max(min ?? -Infinity, rounded));
    },
    [min, max, decimals],
  );

  const commitValue = React.useCallback(
    (next: number | null) => {
      valueRef.current = next;
      if (value === undefined) setInner(next);
      onValueChange?.(next);
    },
    [value, onValueChange],
  );

  /** Steps from the latest value; returns false when it hits a bound so hold-to-repeat can stop. */
  const stepBy = React.useCallback(
    (amount: number) => {
      const base = valueRef.current ?? (amount > 0 ? (min ?? 0) - amount : (max ?? 0) - amount);
      const next = clamp(base + amount);
      setDraft(null);
      if (next === valueRef.current) return false;
      commitValue(next);
      return !(next === max || next === min);
    },
    [clamp, commitValue, min, max],
  );

  const stopRepeat = () => {
    if (repeat.current) clearTimeout(repeat.current);
    repeat.current = null;
  };

  const startRepeat = (amount: number) => {
    stopRepeat();
    if (!stepBy(amount)) return;
    let count = 0;
    const tick = () => {
      count++;
      if (!stepBy(amount)) return stopRepeat();
      repeat.current = setTimeout(tick, count > 10 ? 35 : count > 4 ? 60 : 100);
    };
    repeat.current = setTimeout(tick, 420);
  };

  function commitDraft() {
    if (draft === null) return;
    const cleaned = draft.replace(/[^\d.\-]/g, "");
    setDraft(null);
    if (cleaned === "" || cleaned === "-" || cleaned === ".") return commitValue(null);
    const n = Number(cleaned);
    if (Number.isFinite(n)) commitValue(clamp(n));
  }

  const atMin = current !== null && min !== undefined && current <= min;
  const atMax = current !== null && max !== undefined && current >= max;
  const inert = disabled || readOnly;

  const stepper = (dir: 1 | -1, kind: "h" | "v", controls: string) => {
    const blocked = inert || (dir > 0 ? atMax : atMin);
    const Icon = kind === "h" ? (dir > 0 ? Plus : Minus) : dir > 0 ? ChevronUp : ChevronDown;
    return (
      <motion.button
        type="button"
        tabIndex={-1}
        aria-label={dir > 0 ? incrementLabel : decrementLabel}
        aria-controls={controls}
        disabled={blocked}
        whileTap={blocked || reduce ? undefined : { scale: 0.88 }}
        transition={{ type: "spring", stiffness: 600, damping: 26 }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault(); // keep focus where it is
          (e.currentTarget as HTMLButtonElement).setPointerCapture?.(e.pointerId);
          startRepeat(dir * step);
        }}
        onPointerUp={stopRepeat}
        onPointerCancel={stopRepeat}
        onLostPointerCapture={stopRepeat}
        onClick={(e) => {
          // Screen reader / keyboard activation has no pointerdown.
          if (e.detail === 0) stepBy(dir * step);
        }}
        className={cn(
          "grid shrink-0 place-items-center text-ink-muted outline-none transition-colors hover:bg-surface-hover hover:text-ink disabled:pointer-events-none disabled:opacity-35",
          kind === "h" ? cn(stepperSize[size], "rounded-[7px]") : "min-h-0 w-7 flex-1",
        )}
      >
        <Icon className={kind === "h" ? iconSize[size] : "size-3.5"} aria-hidden />
      </motion.button>
    );
  };

  const centered = orientation === "horizontal";

  return (
    <Field label={label} hint={hint} error={error} required={required} labelAside={labelAside} id={id} disabled={disabled} className={wrapperClassName}>
      {(ids) => (
        <div
          className={fieldWellClasses({
            size,
            invalid: ids.invalid,
            disabled,
            className: cn(centered ? "px-1" : "pr-0", className),
          })}
        >
          {centered && stepper(-1, "h", ids.id)}
          <div className="relative flex min-w-0 flex-1 self-stretch">
            <input
              ref={ref}
              id={ids.id}
              type="text"
              inputMode={decimals > 0 ? "decimal" : "numeric"}
              role="spinbutton"
              autoComplete="off"
              aria-valuenow={current ?? undefined}
              aria-valuemin={min}
              aria-valuemax={max}
              aria-valuetext={current === null ? undefined : unit ? `${formatted} ${unit}` : formatted}
              aria-invalid={ids.invalid || undefined}
              aria-describedby={ids.describedBy}
              required={required}
              disabled={disabled}
              readOnly={readOnly}
              value={draft ?? formatted}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={(e) => {
                commitDraft();
                onBlur?.(e);
              }}
              onKeyDown={(e) => {
                onKeyDown?.(e);
                if (e.defaultPrevented || inert) return;
                const k = e.key;
                if (k === "ArrowUp" || k === "ArrowDown") {
                  e.preventDefault();
                  if (draft !== null) commitDraft();
                  stepBy((k === "ArrowUp" ? 1 : -1) * (e.shiftKey ? big : step));
                } else if (k === "PageUp" || k === "PageDown") {
                  e.preventDefault();
                  stepBy((k === "PageUp" ? 1 : -1) * big);
                } else if (k === "Home" && min !== undefined) {
                  e.preventDefault();
                  setDraft(null);
                  commitValue(min);
                } else if (k === "End" && max !== undefined) {
                  e.preventDefault();
                  setDraft(null);
                  commitValue(max);
                } else if (k === "Enter") {
                  commitDraft();
                } else if (k === "Escape" && draft !== null) {
                  e.preventDefault();
                  setDraft(null);
                }
              }}
              {...props}
              className={cn(
                "w-full min-w-0 self-stretch bg-transparent tabular-nums text-ink outline-none focus-visible:shadow-none placeholder:text-ink-subtle disabled:cursor-not-allowed",
                centered ? "text-center" : "text-left",
                draft === null && current !== null && "text-transparent caret-transparent selection:bg-transparent",
              )}
            />
            {draft === null && current !== null && (
              <span
                className={cn(
                  "pointer-events-none absolute inset-0 flex items-center gap-1 text-ink",
                  centered ? "justify-center" : "justify-start",
                )}
              >
                <RollingNumber text={formatted} reduce={reduce} />
                {unit && <span className="text-ink-subtle">{unit}</span>}
              </span>
            )}
          </div>
          {centered && stepper(1, "h", ids.id)}
          {!centered && (
            <div className="ml-2 flex w-7 flex-col self-stretch overflow-hidden rounded-r-[inherit] border-l border-border-strong">
              {stepper(1, "v", ids.id)}
              <span aria-hidden className="h-px bg-border-strong" />
              {stepper(-1, "v", ids.id)}
            </div>
          )}
        </div>
      )}
    </Field>
  );
});
