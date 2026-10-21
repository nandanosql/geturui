"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { Field, fieldWellClasses, type FieldSize } from "@/components/ui/field";
import { MONTH_NAMES, compareDays, daysInMonth, startOfDay, toISODate } from "@/components/ui/calendar";

type SegKey = "month" | "day" | "year";
type Segs = Record<SegKey, number | null>;

export interface DateFieldProps {
  value?: Date | null;
  defaultValue?: Date | null;
  /** Called with a full date once every segment is filled, and with null when one is cleared. */
  onValueChange?: (date: Date | null) => void;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  size?: FieldSize;
  /** Dates before this are clamped up when committed. */
  min?: Date;
  /** Dates after this are clamped down when committed. */
  max?: Date;
  /** Segment order. @default "mdy" */
  order?: "mdy" | "dmy" | "ymd";
  /** Leading glyph. Pass null to hide. */
  icon?: React.ReactNode;
  /** Right side of the well, e.g. a calendar button. */
  trailing?: React.ReactNode;
  /** Submits the value as YYYY-MM-DD under this name. */
  name?: string;
  /** Accessible name when there is no visible label. */
  "aria-label"?: string;
  /** Render only the well, without label and hint (for use inside other controls). */
  bare?: boolean;
  className?: string;
}

const EMPTY: Segs = { month: null, day: null, year: null };
const toSegs = (d: Date | null | undefined): Segs => (d ? { month: d.getMonth() + 1, day: d.getDate(), year: d.getFullYear() } : EMPTY);
const META: Record<SegKey, { label: string; placeholder: string; min: number; width: string }> = {
  month: { label: "Month", placeholder: "mm", min: 1, width: "min-w-[2.1ch]" },
  day: { label: "Day", placeholder: "dd", min: 1, width: "min-w-[2.1ch]" },
  year: { label: "Year", placeholder: "yyyy", min: 1, width: "min-w-[4.2ch]" },
};

function maxOf(seg: SegKey, s: Segs) {
  if (seg === "month") return 12;
  if (seg === "year") return 9999;
  return s.month ? daysInMonth(s.year ?? 2000, s.month - 1) : 31;
}

/** Typed date input in month, day and year segments: arrows step a segment with a rolling digit, a volt pill slides to the focused one. */
export function DateField({
  value,
  defaultValue,
  onValueChange,
  label,
  hint,
  error,
  required,
  disabled,
  size = "md",
  min,
  max,
  order = "mdy",
  icon,
  trailing,
  name,
  bare,
  className,
  ...rest
}: DateFieldProps) {
  const reduce = useReducedMotion();
  const uid = React.useId();
  const [segs, setSegs] = React.useState<Segs>(() => toSegs(value !== undefined ? value : defaultValue));
  const [focused, setFocused] = React.useState<SegKey | null>(null);
  const [roll, setRoll] = React.useState(1);
  const typed = React.useRef("");
  const wellRef = React.useRef<HTMLDivElement>(null);

  const order3: SegKey[] =
    order === "dmy" ? ["day", "month", "year"] : order === "ymd" ? ["year", "month", "day"] : ["month", "day", "year"];
  const sep = order === "ymd" ? "-" : "/";

  const build = (s: Segs): Date | null => {
    if (!s.month || !s.day || !s.year || s.year < 1000) return null;
    let d = new Date(s.year, s.month - 1, Math.min(s.day, daysInMonth(s.year, s.month - 1)));
    if (min && compareDays(d, min) < 0) d = startOfDay(min);
    if (max && compareDays(d, max) > 0) d = startOfDay(max);
    return d;
  };

  // Follow a controlled value without clobbering a half-typed entry.
  const valueKey = value === undefined ? undefined : value ? toISODate(value) : "";
  const [prevKey, setPrevKey] = React.useState(valueKey);
  if (valueKey !== prevKey) {
    setPrevKey(valueKey);
    const shown = build(segs);
    // Skip echoes of our own change (including null while a segment is half-typed).
    if (valueKey !== undefined && valueKey !== (shown ? toISODate(shown) : "")) setSegs(toSegs(value));
  }

  const update = (next: Segs) => {
    const before = build(segs);
    const after = build(next);
    setSegs(after ? toSegs(after) : next);
    const k = (d: Date | null) => (d ? toISODate(d) : "");
    if (k(before) !== k(after)) onValueChange?.(after);
  };

  const focusSeg = (seg: SegKey | undefined) => {
    if (!seg) return;
    wellRef.current?.querySelector<HTMLElement>(`[data-seg="${seg}"]`)?.focus();
  };
  const neighbour = (seg: SegKey, step: 1 | -1) => order3[order3.indexOf(seg) + step];

  const onKeyDown = (seg: SegKey) => (e: React.KeyboardEvent) => {
    const cur = segs[seg];
    const hi = maxOf(seg, segs);
    const lo = META[seg].min;
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const step = e.key === "ArrowUp" ? 1 : -1;
      typed.current = "";
      setRoll(step);
      // Empty segments start from the clock; this only runs in an event, never during render.
      const now = new Date();
      const start = seg === "year" ? now.getFullYear() : seg === "month" ? now.getMonth() + 1 : now.getDate();
      const nextVal =
        cur === null
          ? Math.min(start, hi)
          : seg === "year"
            ? Math.max(1000, cur + step)
            : ((cur - lo + step + (hi - lo + 1)) % (hi - lo + 1)) + lo;
      update({ ...segs, [seg]: nextVal });
      return;
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      focusSeg(neighbour(seg, e.key === "ArrowRight" ? 1 : -1));
      return;
    }
    if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      setRoll(e.key === "Home" ? -1 : 1);
      update({ ...segs, [seg]: e.key === "Home" ? (seg === "year" ? 1000 : lo) : seg === "year" ? 9999 : hi });
      return;
    }
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      if (typed.current.length > 1) {
        typed.current = typed.current.slice(0, -1);
        update({ ...segs, [seg]: Number(typed.current) });
      } else if (cur !== null) {
        typed.current = "";
        update({ ...segs, [seg]: null });
      } else focusSeg(neighbour(seg, -1));
      return;
    }
    if (e.key === "/" || e.key === "-" || e.key === ".") {
      e.preventDefault();
      focusSeg(neighbour(seg, 1));
      return;
    }
    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      const digit = Number(e.key);
      setRoll(1);
      if (seg === "year") {
        const buf = (typed.current + e.key).slice(-4);
        typed.current = buf.length === 4 ? "" : buf;
        update({ ...segs, year: Number(buf) });
        if (buf.length === 4) focusSeg(neighbour(seg, 1));
        return;
      }
      const limit = seg === "month" ? 12 : 31;
      const combined = Number(typed.current + e.key);
      if (typed.current && combined <= limit && combined >= 1) {
        typed.current = "";
        update({ ...segs, [seg]: combined });
        focusSeg(neighbour(seg, 1));
      } else if (digit * 10 > limit) {
        typed.current = "";
        update({ ...segs, [seg]: Math.max(digit, 1) });
        if (digit > 0) focusSeg(neighbour(seg, 1));
      } else {
        typed.current = e.key;
        update({ ...segs, [seg]: digit === 0 ? segs[seg] : digit });
      }
    }
  };

  const describe = (seg: SegKey, v: number | null) => {
    if (v === null) return "Empty";
    return seg === "month" ? MONTH_NAMES[v - 1] : String(v);
  };
  const show = (seg: SegKey, v: number | null) =>
    v === null ? META[seg].placeholder : seg === "year" ? String(v) : String(v).padStart(2, "0");
  const current = build(segs);

  const well = (ids?: { id: string; labelId: string; describedBy?: string; invalid: boolean }) => (
    <div
      ref={wellRef}
      role="group"
      id={ids?.id}
      aria-labelledby={ids && label ? ids.labelId : undefined}
      aria-label={ids && label ? undefined : rest["aria-label"]}
      aria-describedby={ids?.describedBy}
      aria-disabled={disabled || undefined}
      onMouseDown={(e) => {
        if (disabled || (e.target as HTMLElement).closest("[data-seg],button")) return;
        e.preventDefault();
        focusSeg(order3.find((s) => segs[s] === null) ?? order3[0]);
      }}
      className={fieldWellClasses({
        size,
        invalid: ids?.invalid ?? Boolean(error),
        disabled,
        className: cn("cursor-text", bare && className),
      })}
    >
      {icon !== null && (icon ?? <CalendarDays aria-hidden className="size-4 shrink-0" />)}
      <span className="flex flex-1 items-center font-mono text-ink">
        {order3.map((seg, i) => (
          <React.Fragment key={seg}>
            {i > 0 && (
              <span aria-hidden className="px-0.5 text-ink-subtle">
                {sep}
              </span>
            )}
            <span
              role="spinbutton"
              data-seg={seg}
              tabIndex={disabled ? -1 : 0}
              aria-label={META[seg].label}
              aria-valuemin={seg === "year" ? 1000 : META[seg].min}
              aria-valuemax={maxOf(seg, segs)}
              aria-valuenow={segs[seg] ?? undefined}
              aria-valuetext={describe(seg, segs[seg])}
              aria-required={required || undefined}
              aria-invalid={(ids?.invalid ?? Boolean(error)) || undefined}
              onKeyDown={onKeyDown(seg)}
              onFocus={() => {
                typed.current = "";
                setFocused(seg);
              }}
              onBlur={() => setFocused((f) => (f === seg ? null : f))}
              className={cn(
                "relative inline-flex justify-center rounded-[6px] px-0.5 py-px text-center tabular-nums caret-transparent outline-none focus-visible:shadow-none",
                META[seg].width,
                segs[seg] === null && "text-ink-subtle",
              )}
            >
              {focused === seg && (
                <motion.span
                  aria-hidden
                  layoutId={reduce ? undefined : `${uid}-pill`}
                  transition={{ type: "spring", stiffness: 520, damping: 36 }}
                  className="absolute inset-0 rounded-[6px] bg-volt-soft ring-1 ring-volt-ink/40"
                />
              )}
              <span aria-hidden className="relative inline-grid overflow-hidden">
                <AnimatePresence mode="popLayout" initial={false} custom={roll}>
                  <motion.span
                    key={show(seg, segs[seg])}
                    custom={roll}
                    initial={reduce ? { opacity: 0 } : { y: roll * 10, opacity: 0, filter: "blur(3px)" }}
                    animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                    exit={reduce ? { opacity: 0 } : { y: roll * -10, opacity: 0, filter: "blur(3px)" }}
                    transition={{ type: "spring", stiffness: 520, damping: 34 }}
                    className={cn("block", focused === seg && segs[seg] !== null && "text-ink")}
                  >
                    {show(seg, segs[seg])}
                  </motion.span>
                </AnimatePresence>
              </span>
            </span>
          </React.Fragment>
        ))}
      </span>
      {trailing}
      {name && <input type="hidden" name={name} value={current ? toISODate(current) : ""} />}
    </div>
  );

  if (bare) return well();
  return (
    <Field label={label} hint={hint} error={error} required={required} disabled={disabled} className={className}>
      {(ids) => well(ids)}
    </Field>
  );
}
