"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover } from "@/components/ui/popover";
import { Field, fieldWellClasses, type FieldSize } from "@/components/ui/field";
import { DateField } from "@/components/ui/date-field";
import {
  Calendar,
  addDays,
  addMonths,
  compareDays,
  daysBetween,
  formatDate,
  formatRange,
  isSameDay,
  startOfMonth,
  useToday,
  type DateRange,
  type WeekStart,
} from "@/components/ui/calendar";

export { DateField, type DateFieldProps } from "@/components/ui/date-field";
export type { DateRange } from "@/components/ui/calendar";

/** A named range, computed from today so it stays deterministic. */
export interface DatePreset {
  id: string;
  label: string;
  range: (today: Date) => DateRange;
}

/** Today, Yesterday, Last 7 / 30 / 90 days, This month, Last month, Year to date. */
export const defaultRangePresets: DatePreset[] = [
  { id: "today", label: "Today", range: (t) => ({ start: t, end: t }) },
  { id: "yesterday", label: "Yesterday", range: (t) => ({ start: addDays(t, -1), end: addDays(t, -1) }) },
  { id: "7d", label: "Last 7 days", range: (t) => ({ start: addDays(t, -6), end: t }) },
  { id: "30d", label: "Last 30 days", range: (t) => ({ start: addDays(t, -29), end: t }) },
  { id: "90d", label: "Last 90 days", range: (t) => ({ start: addDays(t, -89), end: t }) },
  { id: "month", label: "This month", range: (t) => ({ start: startOfMonth(t), end: t }) },
  {
    id: "last-month",
    label: "Last month",
    range: (t) => ({ start: addMonths(startOfMonth(t), -1), end: addDays(startOfMonth(t), -1) }),
  },
  { id: "ytd", label: "Year to date", range: (t) => ({ start: new Date(t.getFullYear(), 0, 1), end: t }) },
];

interface PickerBaseProps {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  /** Trigger height: 32 / 40 / 48. @default "md" */
  size?: FieldSize;
  placeholder?: string;
  /** The day treated as today (marker, presets, Today button). Omit to read the clock after hydration. */
  today?: Date;
  min?: Date;
  max?: Date;
  disabledDates?: Date[];
  isDateDisabled?: (date: Date) => boolean;
  highlightedDates?: Date[];
  /** @default 0 (Sunday) */
  weekStartsOn?: WeekStart;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Panel alignment under the trigger. @default "start" */
  align?: "start" | "center" | "end";
  className?: string;
}

export interface DatePickerProps extends PickerBaseProps {
  value?: Date | null;
  defaultValue?: Date | null;
  onValueChange?: (date: Date | null) => void;
  /** Require Apply to commit. When false, picking a day commits and closes. @default true */
  confirm?: boolean;
}

export interface DateRangePickerProps extends PickerBaseProps {
  value?: DateRange;
  defaultValue?: DateRange;
  onValueChange?: (range: DateRange) => void;
  /** Quick ranges in a side column. Pass false to hide. @default defaultRangePresets */
  presets?: DatePreset[] | false;
  /** Months shown. Defaults to 2 from 640px up, 1 below. */
  numberOfMonths?: 1 | 2;
}

const EMPTY: DateRange = { start: null, end: null };
const subscribeWide = (cb: () => void) => {
  const mq = window.matchMedia("(min-width: 640px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const useWide = () =>
  React.useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia("(min-width: 640px)").matches,
    () => false,
  );

function useOpen(open: boolean | undefined, defaultOpen: boolean | undefined, onOpenChange?: (v: boolean) => void) {
  const [own, setOwn] = React.useState(Boolean(defaultOpen));
  const isOpen = open ?? own;
  const set = (v: boolean) => {
    if (open === undefined) setOwn(v);
    onOpenChange?.(v);
  };
  return [isOpen, set] as const;
}

interface TriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size: FieldSize;
  invalid: boolean;
  open: boolean;
  text: string | null;
  placeholder: string;
  valueId: string;
}

/** Sunken-well trigger button. Popover clones it to add onClick and aria-expanded. */
const Trigger = React.forwardRef<HTMLButtonElement, TriggerProps>(function Trigger(
  { size, invalid, open, text, placeholder, valueId, disabled, className, ...props },
  ref,
) {
  const reduce = useReducedMotion();
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      className={fieldWellClasses({
        size,
        invalid,
        disabled,
        className: cn(
          "w-full cursor-pointer text-left outline-none focus-visible:border-volt-ink focus-visible:shadow-[0_0_0_3px_var(--volt-soft)]",
          open && "border-volt-ink",
          className,
        ),
      })}
      {...props}
    >
      <CalendarDays aria-hidden className="size-4 shrink-0" />
      <span id={valueId} className={cn("min-w-0 flex-1 truncate tabular-nums", text ? "text-ink" : "text-ink-subtle")}>
        {text ?? placeholder}
      </span>
      <motion.span
        aria-hidden
        animate={{ rotate: open && !reduce ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 28 }}
        className="grid"
      >
        <ChevronDown className="size-4" />
      </motion.span>
    </button>
  );
});

/** Single-date picker: a sunken trigger opens a calendar with a typed date field, Today shortcut and Apply/Cancel. */
export function DatePicker({
  value,
  defaultValue = null,
  onValueChange,
  label,
  hint,
  error,
  required,
  disabled,
  size = "md",
  placeholder = "Select a date",
  today: todayProp,
  min,
  max,
  disabledDates,
  isDateDisabled,
  highlightedDates,
  weekStartsOn,
  open,
  defaultOpen,
  onOpenChange,
  confirm = true,
  align = "start",
  className,
}: DatePickerProps) {
  const today = useToday(todayProp);
  const valueId = React.useId();
  const [own, setOwn] = React.useState<Date | null>(defaultValue);
  const current = value !== undefined ? value : own;
  const [draft, setDraft] = React.useState<Date | null>(current);
  const [month, setMonth] = React.useState<Date | undefined>(current ?? todayProp ?? undefined);
  const [isOpen, setOpen] = useOpen(open, defaultOpen, onOpenChange);

  const commit = (d: Date | null) => {
    if (value === undefined) setOwn(d);
    onValueChange?.(d);
  };
  const handleOpen = (v: boolean) => {
    if (v) {
      setDraft(current);
      setMonth(current ?? today ?? undefined);
    }
    setOpen(v);
  };

  return (
    <Field label={label} hint={hint} error={error} required={required} disabled={disabled} className={className}>
      {(ids) => (
        <div className="grid">
          <Popover
            open={isOpen}
            onOpenChange={handleOpen}
            align={align}
            label="Choose a date"
            className="w-max max-w-[calc(100vw-16px)] p-0"
            trigger={
              <Trigger
                id={ids.id}
                size={size}
                invalid={ids.invalid}
                open={isOpen}
                disabled={disabled}
                text={current ? formatDate(current) : null}
                placeholder={placeholder}
                valueId={valueId}
                aria-labelledby={label ? `${ids.labelId} ${valueId}` : undefined}
                aria-describedby={ids.describedBy}
                aria-invalid={ids.invalid || undefined}
              />
            }
          >
            {({ close }) => (
              <div className="grid w-min gap-3 p-4">
                <div className="flex items-center gap-2">
                  <DateField
                    bare
                    size="sm"
                    aria-label="Date"
                    value={draft}
                    min={min}
                    max={max}
                    onValueChange={(d) => {
                      setDraft(d);
                      if (d) setMonth(d);
                    }}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!today}
                    onClick={() => {
                      if (!today) return;
                      setDraft(today);
                      setMonth(today);
                    }}
                  >
                    Today
                  </Button>
                </div>
                <Calendar
                  value={draft}
                  onValueChange={(d) => {
                    setDraft(d);
                    if (!confirm) {
                      commit(d);
                      close();
                    }
                  }}
                  month={month}
                  onMonthChange={setMonth}
                  today={todayProp}
                  min={min}
                  max={max}
                  disabledDates={disabledDates}
                  isDateDisabled={isDateDisabled}
                  highlightedDates={highlightedDates}
                  weekStartsOn={weekStartsOn}
                />
                {confirm && (
                  <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
                    <Button size="sm" variant="ghost" onClick={close}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={isSameDay(draft, current) || (!draft && !current)}
                      onClick={() => {
                        commit(draft);
                        close();
                      }}
                    >
                      Apply
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Popover>
        </div>
      )}
    </Field>
  );
}

/** Range picker: presets column, one or two months with a sweeping range band, typed start/end fields and Apply/Cancel. */
export function DateRangePicker({
  value,
  defaultValue = EMPTY,
  onValueChange,
  label,
  hint,
  error,
  required,
  disabled,
  size = "md",
  placeholder = "Select dates",
  today: todayProp,
  min,
  max,
  disabledDates,
  isDateDisabled,
  highlightedDates,
  weekStartsOn,
  open,
  defaultOpen,
  onOpenChange,
  align = "start",
  presets = defaultRangePresets,
  numberOfMonths,
  className,
}: DateRangePickerProps) {
  const reduce = useReducedMotion();
  const uid = React.useId();
  const valueId = React.useId();
  const today = useToday(todayProp);
  const wide = useWide();
  const months = numberOfMonths ?? (wide ? 2 : 1);
  const [own, setOwn] = React.useState<DateRange>(defaultValue);
  const current = value ?? own;
  const [draft, setDraft] = React.useState<DateRange>(current);
  const [month, setMonth] = React.useState<Date | undefined>(current.start ?? todayProp ?? undefined);
  const [isOpen, setOpen] = useOpen(open, defaultOpen, onOpenChange);

  const monthFor = (r: DateRange) => {
    const anchor = r.end ?? r.start ?? today;
    return anchor ? addMonths(startOfMonth(anchor), -(months - 1)) : undefined;
  };
  const handleOpen = (v: boolean) => {
    if (v) {
      setDraft(current);
      setMonth(monthFor(current));
    }
    setOpen(v);
  };
  const commit = (r: DateRange) => {
    if (value === undefined) setOwn(r);
    onValueChange?.(r);
  };

  const sameRange = (a: DateRange, b: DateRange) =>
    (a.start ? !!b.start && isSameDay(a.start, b.start) : !b.start) && (a.end ? !!b.end && isSameDay(a.end, b.end) : !b.end);
  const activePreset = presets && today ? presets.find((p) => sameRange(p.range(today), draft))?.id : undefined;
  const length = draft.start && draft.end ? daysBetween(draft.start, draft.end) + 1 : 0;
  const complete = !!draft.start && !!draft.end;

  return (
    <Field label={label} hint={hint} error={error} required={required} disabled={disabled} className={className}>
      {(ids) => (
        <div className="grid">
          <Popover
            open={isOpen}
            onOpenChange={handleOpen}
            align={align}
            label="Choose a date range"
            className="w-max max-w-[calc(100vw-16px)] overflow-hidden p-0"
            trigger={
              <Trigger
                id={ids.id}
                size={size}
                invalid={ids.invalid}
                open={isOpen}
                disabled={disabled}
                text={current.start ? formatRange(current) : null}
                placeholder={placeholder}
                valueId={valueId}
                aria-labelledby={label ? `${ids.labelId} ${valueId}` : undefined}
                aria-describedby={ids.describedBy}
                aria-invalid={ids.invalid || undefined}
              />
            }
          >
            {({ close }) => (
              <div className="flex flex-col sm:flex-row">
                {presets && presets.length > 0 && (
                  <div
                    role="group"
                    aria-label="Quick ranges"
                    className="flex gap-1 overflow-x-auto border-b border-border p-2 sm:w-40 sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-r sm:p-3"
                  >
                    {presets.map((p) => {
                      const active = activePreset === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          aria-pressed={active}
                          disabled={!today}
                          onClick={() => {
                            if (!today) return;
                            const r = p.range(today);
                            setDraft(r);
                            setMonth(monthFor(r));
                          }}
                          className={cn(
                            "relative shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-left text-[13px] font-medium outline-none transition-colors duration-150 focus-visible:shadow-[var(--focus-ring)] sm:rounded-[10px]",
                            active ? "text-volt-ink" : "text-ink-muted hover:bg-surface-hover hover:text-ink",
                          )}
                        >
                          {active && (
                            <motion.span
                              aria-hidden
                              layoutId={reduce ? undefined : `${uid}-preset`}
                              transition={{ type: "spring", stiffness: 420, damping: 34 }}
                              className="absolute inset-0 rounded-[inherit] bg-volt-soft"
                            />
                          )}
                          <span className="relative">{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="grid w-min gap-3 p-4">
                  <Calendar
                    mode="range"
                    value={draft}
                    onValueChange={setDraft}
                    month={month}
                    onMonthChange={setMonth}
                    numberOfMonths={months}
                    today={todayProp}
                    min={min}
                    max={max}
                    disabledDates={disabledDates}
                    isDateDisabled={isDateDisabled}
                    highlightedDates={highlightedDates}
                    weekStartsOn={weekStartsOn}
                  />
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-3 border-t border-border pt-3">
                    <div className="flex items-center gap-2">
                      <DateField
                        bare
                        size="sm"
                        icon={null}
                        aria-label="Start date"
                        value={draft.start}
                        min={min}
                        max={max}
                        onValueChange={(d) => {
                          const next = { start: d, end: d && draft.end && compareDays(d, draft.end) <= 0 ? draft.end : null };
                          setDraft(next);
                          if (d) setMonth(monthFor({ start: d, end: null }));
                        }}
                        className="w-[120px]"
                      />
                      <span aria-hidden className="text-ink-subtle">
                        –
                      </span>
                      <DateField
                        bare
                        size="sm"
                        icon={null}
                        aria-label="End date"
                        value={draft.end}
                        min={draft.start ?? min}
                        max={max}
                        onValueChange={(d) => {
                          setDraft({ start: draft.start ?? d, end: d });
                          if (d) setMonth(monthFor({ start: null, end: d }));
                        }}
                        className="w-[120px]"
                      />
                    </div>
                    <p className="text-xs text-ink-subtle" aria-live="polite">
                      {complete ? `${length} ${length === 1 ? "day" : "days"}` : draft.start ? "Pick an end date" : "Pick a start date"}
                    </p>
                    <div className="ml-auto flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={close}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        disabled={!complete || sameRange(draft, current)}
                        onClick={() => {
                          commit(draft);
                          close();
                        }}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Popover>
        </div>
      )}
    </Field>
  );
}
