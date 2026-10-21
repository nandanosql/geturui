"use client";

import * as React from "react";
import { motion, useReducedMotion, type Transition } from "motion/react";
import { cn } from "@/lib/utils";
import { Field, fieldWellClasses, type FieldSize } from "@/components/ui/field";

const pad: Record<FieldSize, string> = {
  sm: "px-2.5 py-1.5 text-[13px] leading-5",
  md: "px-3 py-2 text-sm leading-[22px]",
  lg: "px-3.5 py-2.5 text-[15px] leading-6",
};

const grow: Transition = { type: "spring", stiffness: 420, damping: 36, mass: 0.7 };
const SHAKE = { x: [0, -3, 3, -2, 2, 0] };
const STILL = { x: 0 };
/** Tallest a manual drag may make the field, in px. */
const MANUAL_MAX = 640;

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "size" | "rows"> {
  /** Text size and padding; matches Input and Button heights for one row. @default "md" */
  size?: FieldSize;
  label?: React.ReactNode;
  /** Helper text under the field. Replaced by `error` when both are set. */
  hint?: React.ReactNode;
  /** Error message; any truthy value marks the field invalid. */
  error?: React.ReactNode;
  /** Right side of the label row. Shown next to the character counter when both exist. */
  labelAside?: React.ReactNode;
  /** Grow with the content between minRows and maxRows. @default true */
  autoGrow?: boolean;
  /** @default 3 */
  minRows?: number;
  /** Rows before the field starts scrolling. @default 8 */
  maxRows?: number;
  /** Show the counter in the label row. On by default when maxLength is set. */
  showCount?: boolean;
  /** Fraction of maxLength where the counter turns to a warning. @default 0.8 */
  warnAt?: number;
  /** Adds a drag (and arrow-key) handle in the corner to make the field taller. */
  resizable?: boolean;
  /** Row of controls inside the well, under the text: formatting buttons, a send button. */
  toolbar?: React.ReactNode;
  onValueChange?: (value: string) => void;
  wrapperClassName?: string;
  wellClassName?: string;
}

const useIsoLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

/** Multi-line field on the sunken well: grows with a spring, counts characters toward a limit and can carry a toolbar. */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    size = "md",
    label,
    hint,
    error,
    labelAside,
    autoGrow = true,
    minRows = 3,
    maxRows = 8,
    showCount,
    warnAt = 0.8,
    resizable,
    toolbar,
    onValueChange,
    onChange,
    value,
    defaultValue,
    maxLength,
    disabled,
    readOnly,
    required,
    id,
    className,
    wrapperClassName,
    wellClassName,
    placeholder,
    ...props
  },
  ref,
) {
  const reduce = useReducedMotion();
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const controlId = id ?? `ta${uid}`;
  const [own, setOwn] = React.useState(() => (defaultValue === undefined ? "" : String(defaultValue)));
  const text = value === undefined ? own : String(value ?? "");

  const box = React.useRef<HTMLDivElement>(null);
  const mirror = React.useRef<HTMLTextAreaElement>(null);
  const [metrics, setMetrics] = React.useState<{ content: number; min: number; max: number } | null>(null);
  const [manual, setManual] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const drag = React.useRef<{ y: number; h: number } | null>(null);

  const measure = React.useCallback(() => {
    const m = mirror.current;
    if (!m) return;
    const cs = window.getComputedStyle(m);
    const line = parseFloat(cs.lineHeight) || 20;
    const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const min = Math.round(minRows * line + padY);
    const max = Math.round(Math.max(minRows, maxRows) * line + padY);
    const content = m.scrollHeight;
    setMetrics((prev) => (prev && prev.content === content && prev.min === min && prev.max === max ? prev : { content, min, max }));
  }, [minRows, maxRows]);

  useIsoLayoutEffect(() => {
    measure();
  }, [text, measure, size]);

  React.useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const auto = metrics ? (autoGrow ? Math.min(Math.max(metrics.content, metrics.min), metrics.max) : metrics.min) : null;
  const height = auto === null ? null : Math.min(MANUAL_MAX, Math.max(auto, manual));
  const scrolls = metrics !== null && height !== null && metrics.content > height + 1;

  const count = text.length;
  const counting = maxLength !== undefined && maxLength > 0 && (showCount ?? true);
  const ratio = counting ? Math.min(1, count / (maxLength as number)) : 0;
  const tone: "idle" | "warning" | "danger" = !counting ? "idle" : count >= (maxLength as number) ? "danger" : ratio >= warnAt ? "warning" : "idle";

  const onPointerDown = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (disabled || height === null) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, h: height };
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (!drag.current || !metrics) return;
    setManual(Math.min(MANUAL_MAX, Math.max(metrics.min, drag.current.h + e.clientY - drag.current.y)));
  };
  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };
  const onHandleKey = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (!metrics || height === null) return;
    const step = Math.round((metrics.max - metrics.min) / Math.max(1, maxRows - minRows)) || 22;
    if (e.key === "ArrowDown") setManual(Math.min(MANUAL_MAX, height + step));
    else if (e.key === "ArrowUp") setManual(Math.max(metrics.min, height - step));
    else if (e.key === "Home") setManual(0);
    else return;
    e.preventDefault();
  };

  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      id={controlId}
      disabled={disabled}
      className={wrapperClassName}
      labelAside={
        counting || labelAside ? (
          <span className="inline-flex items-center gap-3">
            {labelAside}
            {counting && <Counter id={`${controlId}-count`} count={count} max={maxLength as number} ratio={ratio} tone={tone} reduce={Boolean(reduce)} />}
          </span>
        ) : undefined
      }
    >
      {({ id: fieldId, describedBy, invalid }) => (
        <div
          className={fieldWellClasses({
            size,
            invalid,
            disabled,
            className: cn("relative min-h-0 flex-col items-stretch gap-0 overflow-hidden px-0", readOnly && "border-dashed bg-surface", wellClassName),
          })}
        >
          <motion.div
            ref={box}
            className="relative"
            initial={false}
            animate={{ height: height ?? "auto" }}
            transition={dragging || reduce ? { duration: 0 } : grow}
          >
            <textarea
              ref={ref}
              id={fieldId}
              value={text}
              rows={height === null ? minRows : undefined}
              maxLength={maxLength}
              disabled={disabled}
              readOnly={readOnly}
              required={required}
              placeholder={placeholder}
              aria-invalid={invalid || undefined}
              aria-describedby={[describedBy, counting ? `${fieldId}-count` : null].filter(Boolean).join(" ") || undefined}
              onChange={(e) => {
                if (value === undefined) setOwn(e.target.value);
                onValueChange?.(e.target.value);
                onChange?.(e);
              }}
              className={cn(
                "block w-full resize-none bg-transparent text-ink outline-none placeholder:text-ink-subtle disabled:cursor-not-allowed",
                height !== null && "h-full",
                scrolls ? "overflow-y-auto" : "overflow-y-hidden",
                resizable && "pr-6",
                pad[size],
                className,
              )}
              {...props}
            />
            <textarea
              ref={mirror}
              aria-hidden
              tabIndex={-1}
              readOnly
              value={text}
              rows={1}
              className={cn(
                "pointer-events-none invisible absolute inset-x-0 top-0 block h-0 w-full resize-none overflow-hidden",
                resizable && "pr-6",
                pad[size],
                className,
              )}
            />
            {resizable && (
              <span
                role="separator"
                tabIndex={disabled ? -1 : 0}
                aria-label="Resize text area"
                aria-orientation="horizontal"
                aria-valuemin={metrics?.min}
                aria-valuemax={MANUAL_MAX}
                aria-valuenow={height === null ? undefined : Math.round(height)}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onKeyDown={onHandleKey}
                className={cn(
                  "absolute bottom-0.5 right-0.5 grid size-5 cursor-ns-resize touch-none place-items-center rounded-[5px] text-ink-subtle outline-none transition-colors",
                  "hover:bg-surface-hover hover:text-ink focus-visible:shadow-[var(--focus-ring)]",
                  dragging && "bg-surface-hover text-volt-ink",
                )}
              >
                <svg aria-hidden viewBox="0 0 10 10" className="size-2.5" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round">
                  <path d="M9 3L3 9M9 6.5L6.5 9" />
                </svg>
              </span>
            )}
          </motion.div>
          {toolbar && <div className="flex items-center gap-1 border-t border-border px-1.5 py-1.5">{toolbar}</div>}
        </div>
      )}
    </Field>
  );
});

function Counter({
  id,
  count,
  max,
  ratio,
  tone,
  reduce,
}: {
  id: string;
  count: number;
  max: number;
  ratio: number;
  tone: "idle" | "warning" | "danger";
  reduce: boolean;
}) {
  const r = 6;
  const circ = Math.round(2 * Math.PI * r * 100) / 100;
  const color = tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-ink-subtle";
  return (
    <>
      <motion.span
        key={tone === "danger" ? "cap" : "ok"}
        animate={tone === "danger" && !reduce ? SHAKE : STILL}
        transition={{ duration: 0.36 }}
        className={cn("inline-flex items-center gap-1.5 font-mono tabular-nums transition-colors duration-200", color)}
      >
        <svg aria-hidden viewBox="0 0 16 16" className={cn("size-3.5 -rotate-90", tone === "idle" && "text-volt-ink")}>
          <circle cx="8" cy="8" r={r} fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
          <motion.circle
            cx="8"
            cy="8"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={false}
            animate={{ strokeDashoffset: Math.round(circ * (1 - ratio) * 100) / 100 }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
          />
        </svg>
        <span aria-hidden>
          {count}/{max}
        </span>
      </motion.span>
      <span id={id} className="sr-only">
        {count} of {max} characters used
      </span>
      <span className="sr-only" aria-live="polite">
        {tone === "danger" ? "Character limit reached" : tone === "warning" ? "Approaching the character limit" : ""}
      </span>
    </>
  );
}
