"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * Date math. Everything works on local calendar days (midnight), never on the
 * clock, so the same props render the same grid on the server and the client.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

export type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** The same calendar day at local midnight. */
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
/** First day of the month containing `d`. */
export const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
export const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
/** Adds months, clamping the day so Jan 31 + 1 month is Feb 28/29. */
export const addMonths = (d: Date, n: number) => {
  const y = d.getFullYear();
  const m = d.getMonth() + n;
  return new Date(y, m, Math.min(d.getDate(), daysInMonth(y, m)));
};
/** Negative when `a` is an earlier day than `b`, 0 on the same day. */
export const compareDays = (a: Date, b: Date) =>
  a.getFullYear() - b.getFullYear() || a.getMonth() - b.getMonth() || a.getDate() - b.getDate();
export const isSameDay = (a?: Date | null, b?: Date | null) => !!a && !!b && compareDays(a, b) === 0;
export const isSameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
/** Whole days from `a` to `b` (DST safe). */
export const daysBetween = (a: Date, b: Date) => Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000);
export const monthsBetween = (a: Date, b: Date) => (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth();
/** YYYY-MM-DD in local time. */
export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** Parses YYYY-MM-DD as a local day; null when malformed. */
export function parseISODate(s: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? "");
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getMonth() === Number(m[2]) - 1 ? d : null;
}

/** "Oct 5" · "Oct 5, 2026" · "Monday, October 5, 2026". Locale-free, so it never mismatches on hydration. */
export function formatDate(d: Date, style: "short" | "medium" | "long" = "medium") {
  if (style === "long") return `${WEEKDAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  const s = `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
  return style === "short" ? s : `${s}, ${d.getFullYear()}`;
}

/** "Oct 1 – 7, 2026", "Sep 28 – Oct 4, 2026" or "Dec 29, 2026 – Jan 4, 2027". */
export function formatRange(r: DateRange) {
  const { start, end } = r;
  if (!start) return "";
  if (!end) return `${formatDate(start)} – …`;
  if (isSameDay(start, end)) return formatDate(start);
  if (start.getFullYear() !== end.getFullYear()) return `${formatDate(start)} – ${formatDate(end)}`;
  if (isSameMonth(start, end)) return `${formatDate(start, "short")} – ${end.getDate()}, ${end.getFullYear()}`;
  return `${formatDate(start, "short")} – ${formatDate(end)}`;
}

const subscribeNever = () => () => {};
const readToday = () => toISODate(new Date());

/**
 * Today as a local day, hydration safe: returns the passed date, otherwise null during SSR and the
 * first client render, then the real day. Pass a fixed date in demos and tests.
 */
export function useToday(today?: Date | null): Date | null {
  const key = React.useSyncExternalStore(subscribeNever, readToday, () => "");
  if (today) return startOfDay(today);
  return parseISODate(key);
}

/** Six fixed weeks covering `month`, so every page has the same height. */
export function monthMatrix(month: Date, weekStartsOn: WeekStart = 0): Date[][] {
  const first = startOfMonth(month);
  const lead = (first.getDay() - weekStartsOn + 7) % 7;
  const start = addDays(first, -lead);
  return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, i) => addDays(start, w * 7 + i)));
}

/* ──────────────────────────────────────────────────────────────────────────── */

interface CalendarBaseProps {
  /** The day marked as today. Omit to read the clock after hydration. */
  today?: Date;
  /** Earliest selectable day. */
  min?: Date;
  /** Latest selectable day. */
  max?: Date;
  /** Days that cannot be picked. */
  disabledDates?: Date[];
  /** Return true to disable a day (weekends, booked nights). */
  isDateDisabled?: (date: Date) => boolean;
  /** Days that get a small dot (deadlines, events). */
  highlightedDates?: Date[];
  /** 0 = Sunday … 6 = Saturday. @default 0 */
  weekStartsOn?: WeekStart;
  /** Months shown side by side. @default 1 */
  numberOfMonths?: 1 | 2;
  /** Show adjacent-month days in the grid. @default true for one month */
  showOutsideDays?: boolean;
  /** Controlled first visible month. */
  month?: Date;
  /** First visible month on mount. Falls back to the selection, then today. */
  defaultMonth?: Date;
  onMonthChange?: (month: Date) => void;
  /** Rendered under the grid (Today button, legend). */
  footer?: React.ReactNode;
  /** Accessible name for the calendar group. @default "Calendar" */
  "aria-label"?: string;
  className?: string;
}

export interface CalendarSingleProps extends CalendarBaseProps {
  mode?: "single";
  value?: Date | null;
  defaultValue?: Date | null;
  onValueChange?: (date: Date | null) => void;
}

export interface CalendarRangeProps extends CalendarBaseProps {
  mode: "range";
  value?: DateRange;
  defaultValue?: DateRange;
  onValueChange?: (range: DateRange) => void;
}

export type CalendarProps = CalendarSingleProps | CalendarRangeProps;

const EMPTY: DateRange = { start: null, end: null };
const spring = { type: "spring", stiffness: 380, damping: 34 } as const;

/**
 * Month grid for one date or a range. Months slide with a blur in the direction of travel, the range band
 * sweeps from the start day, and the grid follows the APG date-grid keyboard pattern.
 */
export function Calendar(props: CalendarProps) {
  const {
    today: todayProp,
    min,
    max,
    disabledDates,
    isDateDisabled,
    highlightedDates,
    weekStartsOn = 0,
    numberOfMonths = 1,
    month: monthProp,
    defaultMonth,
    onMonthChange,
    footer,
    className,
  } = props;
  const showOutsideDays = props.showOutsideDays ?? numberOfMonths === 1;
  const isRange = props.mode === "range";
  const reduce = useReducedMotion();
  const uid = React.useId();
  const today = useToday(todayProp);
  const rootRef = React.useRef<HTMLDivElement>(null);

  // ── selection ──
  const [own, setOwn] = React.useState<DateRange>(() => {
    if (props.mode === "range") return props.defaultValue ?? EMPTY;
    return { start: props.defaultValue ?? null, end: null };
  });
  let selected: DateRange;
  if (props.mode === "range") selected = props.value ?? own;
  else selected = { start: props.value !== undefined ? props.value : own.start, end: null };

  const commit = (next: DateRange) => {
    if (props.mode === "range") {
      if (props.value === undefined) setOwn(next);
      props.onValueChange?.(next);
    } else {
      if (props.value === undefined) setOwn(next);
      props.onValueChange?.(next.start);
    }
  };

  // ── visible month ──
  const anchor = defaultMonth ?? selected.start ?? todayProp ?? null;
  const [ownMonth, setOwnMonth] = React.useState<Date | null>(anchor ? startOfMonth(anchor) : null);
  if (ownMonth === null && monthProp === undefined && today) setOwnMonth(startOfMonth(today));
  const month = monthProp ? startOfMonth(monthProp) : ownMonth;
  const [dir, setDir] = React.useState(1);
  const months = month ? Array.from({ length: numberOfMonths }, (_, i) => addMonths(month, i)) : [];
  const lastMonth = months[months.length - 1];

  const goToMonth = (next: Date) => {
    const m = startOfMonth(next);
    if (month && isSameMonth(m, month)) return;
    setDir(month && compareDays(m, month) < 0 ? -1 : 1);
    if (monthProp === undefined) setOwnMonth(m);
    onMonthChange?.(m);
  };

  // ── disabled / highlighted lookups ──
  const disabledSet = React.useMemo(() => new Set((disabledDates ?? []).map(toISODate)), [disabledDates]);
  const highlightSet = React.useMemo(() => new Set((highlightedDates ?? []).map(toISODate)), [highlightedDates]);
  const isDisabled = (d: Date) =>
    (!!min && compareDays(d, min) < 0) || (!!max && compareDays(d, max) > 0) || disabledSet.has(toISODate(d)) || !!isDateDisabled?.(d);

  const canPrev = !!month && (!min || compareDays(addDays(month, -1), min) >= 0);
  const canNext = !!lastMonth && (!max || compareDays(addMonths(lastMonth, 1), max) <= 0);

  // ── roving focus ──
  const [focusDate, setFocusDate] = React.useState<Date | null>(null);
  const inView = (d: Date | null | undefined): d is Date => !!d && months.some((m) => isSameMonth(m, d));
  const activeDate = inView(focusDate) ? focusDate : inView(selected.start) ? selected.start : inView(today) ? today : (months[0] ?? null);
  const pendingFocus = React.useRef(false);
  const pageKey = month ? toISODate(month) : "none";

  React.useEffect(() => {
    if (!pendingFocus.current || !activeDate) return;
    pendingFocus.current = false;
    rootRef.current?.querySelector<HTMLElement>(`[data-page="${pageKey}"] [data-date="${toISODate(activeDate)}"]`)?.focus();
  });

  // ── range preview ──
  const [hover, setHover] = React.useState<Date | null>(null);
  const picking = isRange && !!selected.start && !selected.end;
  const previewEnd = picking ? hover : null;
  let bandStart: Date | null = null;
  let bandEnd: Date | null = null;
  if (isRange && selected.start) {
    const other = selected.end ?? previewEnd ?? selected.start;
    [bandStart, bandEnd] = compareDays(selected.start, other) <= 0 ? [selected.start, other] : [other, selected.start];
  }

  const select = (d: Date) => {
    if (isDisabled(d)) return;
    setFocusDate(d);
    if (!isRange) {
      commit({ start: d, end: null });
      return;
    }
    if (!selected.start || selected.end) commit({ start: d, end: null });
    else commit(compareDays(d, selected.start) < 0 ? { start: d, end: selected.start } : { start: selected.start, end: d });
    setHover(null);
  };

  const moveFocus = (next: Date) => {
    if (min && compareDays(next, min) < 0) next = startOfDay(min);
    if (max && compareDays(next, max) > 0) next = startOfDay(max);
    if (month && lastMonth) {
      if (compareDays(next, month) < 0) goToMonth(startOfMonth(next));
      else if (compareDays(next, addMonths(lastMonth, 1)) >= 0) goToMonth(addMonths(startOfMonth(next), -(numberOfMonths - 1)));
    }
    setFocusDate(next);
    if (picking) setHover(next);
    pendingFocus.current = true;
  };

  const onGridKeyDown = (e: React.KeyboardEvent) => {
    if (!activeDate) return;
    const d = activeDate;
    const dow = (d.getDay() - weekStartsOn + 7) % 7;
    const map: Record<string, () => Date> = {
      ArrowLeft: () => addDays(d, -1),
      ArrowRight: () => addDays(d, 1),
      ArrowUp: () => addDays(d, -7),
      ArrowDown: () => addDays(d, 7),
      Home: () => addDays(d, -dow),
      End: () => addDays(d, 6 - dow),
      PageUp: () => addMonths(d, e.shiftKey ? -12 : -1),
      PageDown: () => addMonths(d, e.shiftKey ? 12 : 1),
    };
    if (map[e.key]) {
      e.preventDefault();
      moveFocus(map[e.key]());
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      select(d);
    }
  };

  const weekdays = Array.from({ length: 7 }, (_, i) => (weekStartsOn + i) % 7);

  const variants: Variants = {
    enter: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * 28, filter: "blur(6px)" }),
    center: { opacity: 1, x: 0, filter: "blur(0px)" },
    exit: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * -28, filter: "blur(6px)" }),
  };

  const navBtn =
    "grid size-8 place-items-center rounded-full text-ink-muted transition-colors duration-150 hover:bg-surface-hover hover:text-ink disabled:pointer-events-none disabled:opacity-35 outline-none focus-visible:shadow-[var(--focus-ring)]";

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label={props["aria-label"] ?? "Calendar"}
      className={cn("relative inline-grid w-max max-w-full gap-3 text-ink", className)}
    >
      <p className="sr-only" aria-live="polite">
        {months.map((m) => `${MONTH_NAMES[m.getMonth()]} ${m.getFullYear()}`).join(" and ")}
      </p>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-8 items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          disabled={!canPrev}
          onClick={() => month && goToMonth(addMonths(month, -1))}
          className={cn(navBtn, "pointer-events-auto", numberOfMonths === 1 && "ml-auto")}
        >
          <ChevronLeft aria-hidden className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Next month"
          disabled={!canNext}
          onClick={() => month && goToMonth(addMonths(month, 1))}
          className={cn(navBtn, "pointer-events-auto")}
        >
          <ChevronRight aria-hidden className="size-4" />
        </button>
      </div>

      <div className="relative overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={pageKey}
            data-page={pageKey}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={reduce ? { duration: 0.15 } : spring}
            className="flex flex-col gap-6 sm:flex-row"
          >
            {month === null && <div aria-hidden className="h-[296px] w-[280px]" />}
            {months.map((m, mi) => {
              const titleId = `${uid}-m${mi}`;
              return (
                <div key={toISODate(m)} className="grid w-[280px] gap-2">
                  <h2
                    id={titleId}
                    className={cn(
                      "flex h-8 items-center font-display text-sm font-semibold tracking-[-0.1px]",
                      numberOfMonths === 1 ? "pl-2" : "justify-center",
                    )}
                  >
                    {MONTH_NAMES[m.getMonth()]} {m.getFullYear()}
                  </h2>
                  <table
                    role="grid"
                    aria-labelledby={titleId}
                    className="w-full border-collapse"
                    onKeyDown={onGridKeyDown}
                    onPointerLeave={() => setHover(null)}
                  >
                    <thead>
                      <tr>
                        {weekdays.map((w) => (
                          <th
                            key={w}
                            scope="col"
                            abbr={WEEKDAY_NAMES[w]}
                            className="h-8 p-0 text-center text-[11px] font-medium uppercase tracking-[0.4px] text-ink-subtle"
                          >
                            {WEEKDAY_NAMES[w].slice(0, 2)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {monthMatrix(m, weekStartsOn).map((week, wi) => (
                        <tr key={wi}>
                          {week.map((d, di) => {
                            const outside = !isSameMonth(d, m);
                            if (outside && !showOutsideDays) return <td key={di} role="gridcell" aria-hidden className="h-9 p-0" />;
                            const disabled = isDisabled(d);
                            const isToday = isSameDay(d, today);
                            const isStart = isSameDay(d, selected.start);
                            const isEnd = isRange && isSameDay(d, selected.end ?? previewEnd);
                            const endpoint = isStart || (isRange && isEnd);
                            const inBand = !!bandStart && !!bandEnd && compareDays(d, bandStart) >= 0 && compareDays(d, bandEnd) <= 0;
                            const bandFirst = inBand && isSameDay(d, bandStart);
                            const bandLast = inBand && isSameDay(d, bandEnd);
                            const single = bandFirst && bandLast;
                            const isActive = !outside && isSameDay(d, activeDate);
                            const selectedCell = isRange ? inBand && !!selected.end : isStart;
                            const delay =
                              previewEnd || reduce || !bandStart ? 0 : Math.min(Math.max(daysBetween(bandStart, d), 0) * 0.014, 0.28);
                            return (
                              <td
                                key={di}
                                role="gridcell"
                                data-date={outside ? undefined : toISODate(d)}
                                tabIndex={outside ? undefined : isActive ? 0 : -1}
                                aria-selected={selectedCell || (isRange && endpoint) || undefined}
                                aria-disabled={disabled || undefined}
                                aria-current={isToday ? "date" : undefined}
                                onClick={() => (outside ? !disabled && goToMonth(d) : select(d))}
                                onPointerEnter={() => picking && setHover(d)}
                                onFocus={() => !outside && setFocusDate(d)}
                                className={cn(
                                  "group relative h-9 p-0 text-center outline-none focus-visible:shadow-none",
                                  disabled ? "cursor-not-allowed" : "cursor-pointer",
                                )}
                              >
                                <AnimatePresence>
                                  {inBand && !single && (
                                    <motion.span
                                      aria-hidden
                                      initial={{ scaleX: 0, opacity: 0 }}
                                      animate={{ scaleX: 1, opacity: 1 }}
                                      exit={{ opacity: 0, transition: { duration: 0.12 } }}
                                      transition={{ ...spring, delay }}
                                      style={{ originX: bandFirst ? 1 : 0 }}
                                      className={cn(
                                        "absolute inset-y-0.5 bg-volt-soft",
                                        bandFirst ? "left-1/2 right-0" : bandLast ? "left-0 right-1/2" : "inset-x-0",
                                        !bandFirst && (di === 0 || (!showOutsideDays && d.getDate() === 1)) && "rounded-l-full",
                                        !bandLast && (di === 6 || (!showOutsideDays && d.getDate() === daysInMonth(d.getFullYear(), d.getMonth()))) && "rounded-r-full",
                                        previewEnd && "opacity-70",
                                      )}
                                    />
                                  )}
                                </AnimatePresence>
                                <motion.span
                                  whileTap={disabled || reduce ? undefined : { scale: 0.88 }}
                                  transition={{ type: "spring", stiffness: 520, damping: 28 }}
                                  className={cn(
                                    "relative z-[1] mx-auto grid size-9 place-items-center rounded-full text-[13px] tabular-nums transition-colors duration-150",
                                    "group-focus-visible:shadow-[var(--focus-ring)]",
                                    endpoint
                                      ? "font-semibold text-on-volt"
                                      : outside
                                        ? disabled
                                          ? "text-ink-subtle/45"
                                          : "text-ink-subtle hover:bg-surface-hover"
                                        : inBand
                                          ? "text-ink hover:bg-surface-hover"
                                          : disabled
                                            ? "text-ink-subtle/45"
                                            : isToday
                                              ? "font-semibold text-volt-ink hover:bg-surface-hover"
                                              : "text-ink hover:bg-surface-hover",
                                  )}
                                >
                                  {endpoint && (
                                    <motion.span
                                      aria-hidden
                                      layoutId={reduce ? undefined : `${uid}-${isStart ? "start" : "end"}`}
                                      transition={spring}
                                      className={cn("absolute inset-0 rounded-full bg-volt", previewEnd && !isStart && "opacity-70")}
                                    />
                                  )}
                                  <span aria-hidden className="relative">
                                    {d.getDate()}
                                  </span>
                                  {(isToday || highlightSet.has(toISODate(d))) && (
                                    <span
                                      aria-hidden
                                      className={cn(
                                        "absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full",
                                        endpoint ? "bg-on-volt" : isToday ? "bg-volt-ink" : "bg-ember-ink",
                                      )}
                                    />
                                  )}
                                </motion.span>
                                <span className="sr-only">
                                  {formatDate(d, "long")}
                                  {highlightSet.has(toISODate(d)) ? ", has events" : ""}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
      {footer}
    </div>
  );
}
