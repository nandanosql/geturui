"use client";

import * as React from "react";
import { AnimatePresence, motion, useIsPresent, useReducedMotion, type Transition } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type TagSize = "sm" | "md" | "lg";
export type TagDotTone = "success" | "warning" | "danger" | "info" | "volt" | "muted";
export type TagSelectionMode = "none" | "single" | "multiple";

/** A flag drawn as stripes (and an optional centre disc) — pass any CSS colours. */
export interface TagFlag {
  /** Stripe colours, first = left (vertical) or top (horizontal). */
  stripes: string[];
  /** @default "vertical" */
  orientation?: "vertical" | "horizontal";
  /** Colour of a centred disc, for flags like Japan or Bangladesh. */
  disc?: string;
}

const tagSize: Record<TagSize, string> = {
  sm: "h-6 gap-1 px-2 text-xs rounded-[7px]",
  md: "h-7 gap-1.5 px-2.5 text-[13px] rounded-[8px]",
  lg: "h-8 gap-1.5 px-3 text-sm rounded-[9px]",
};
const leadPad: Record<TagSize, string> = { sm: "pl-1", md: "pl-1.5", lg: "pl-1.5" };
const trailPad: Record<TagSize, string> = { sm: "pr-1", md: "pr-1", lg: "pr-1.5" };
const mediaSize: Record<TagSize, string> = { sm: "size-4 text-[8px]", md: "size-[18px] text-[9px]", lg: "size-5 text-[10px]" };
const iconSize: Record<TagSize, string> = { sm: "[&_svg]:size-3", md: "[&_svg]:size-3.5", lg: "[&_svg]:size-4" };
const boxSize: Record<TagSize, string> = { sm: "size-3 rounded-[3px]", md: "size-3.5 rounded-[4px]", lg: "size-4 rounded-[5px]" };
const closeSize: Record<TagSize, string> = { sm: "size-4 [&_svg]:size-2.5", md: "size-[18px] [&_svg]:size-3", lg: "size-5 [&_svg]:size-3.5" };
const dotTone: Record<TagDotTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  volt: "bg-volt",
  muted: "bg-ink-subtle",
};

const pop: Transition = { type: "spring", stiffness: 520, damping: 34 };
const settle: Transition = { type: "spring", stiffness: 420, damping: 32 };

interface TagGroupContextValue {
  size: TagSize;
  mode: TagSelectionMode;
  isSelected: (value: string) => boolean;
  toggle: (value: string) => void;
  onRemove?: (value: string) => void;
  remove: (value: string, row: HTMLElement | null) => void;
}

const TagGroupContext = React.createContext<TagGroupContextValue | null>(null);

export interface TagProps {
  /** Identity inside a TagGroup (selection and removal). Defaults to the text label. */
  value?: string;
  children: React.ReactNode;
  /** Plain-text label for screen readers when children are not a string. */
  textValue?: string;
  /** Overrides the group's size. @default "md" */
  size?: TagSize;
  /** Leading status dot; `true` is success. */
  dot?: boolean | TagDotTone;
  /** Leading avatar drawn from one or two initials. */
  initials?: string;
  /** Leading avatar node (an <img> or SVG); clipped to a circle. */
  avatar?: React.ReactNode;
  /** Leading icon. */
  icon?: React.ReactNode;
  /** Leading round flag. */
  flag?: TagFlag;
  /** Trailing count pill. */
  count?: number;
  disabled?: boolean;
  /** Shows a remove button. Inside a TagGroup, the group's onRemove does the same. */
  onRemove?: () => void;
  className?: string;
}

/** Compact chip with optional dot, avatar, flag or icon, a count and a remove button; inside a TagGroup it becomes a selectable grid row. */
export const Tag = React.forwardRef<HTMLSpanElement, TagProps>(function Tag(
  { value, children, textValue, size: own, dot, initials, avatar, icon, flag, count, disabled, onRemove, className },
  ref,
) {
  const group = React.useContext(TagGroupContext);
  const reduce = useReducedMotion();
  const isPresent = useIsPresent();
  const size = own ?? group?.size ?? "md";
  const text = textValue ?? (typeof children === "string" || typeof children === "number" ? String(children) : value ?? "");
  const key = value ?? text;
  const selectable = Boolean(group && group.mode !== "none");
  const selected = selectable && group ? group.isSelected(key) : false;
  const removable = Boolean(onRemove || group?.onRemove) && !disabled;
  const hasLead = Boolean(initials || avatar || flag);
  const rowRef = React.useRef<HTMLSpanElement>(null);
  React.useImperativeHandle(ref, () => rowRef.current as HTMLSpanElement);

  const doRemove = () => {
    if (group) group.remove(key, rowRef.current);
    onRemove?.();
  };

  const lead = (
    <>
      {selectable && <MiniCheck checked={selected} size={size} disabled={disabled} reduce={Boolean(reduce)} />}
      {dot && <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", dotTone[dot === true ? "success" : dot])} />}
      {flag && <Flag flag={flag} size={size} />}
      {!flag && (avatar || initials) && (
        <span
          aria-hidden
          className={cn(
            "grid shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-surface-raised font-semibold uppercase leading-none text-ink-muted [&>img]:size-full [&>img]:object-cover",
            mediaSize[size],
          )}
        >
          {avatar ?? initials?.slice(0, 2)}
        </span>
      )}
      {icon && <span aria-hidden className={cn("grid shrink-0 place-items-center text-ink-subtle", iconSize[size])}>{icon}</span>}
    </>
  );

  const body = (
    <>
      {lead}
      <span className="truncate">{children}</span>
      {count !== undefined && (
        <span
          className={cn(
            "rounded-[4px] px-1 font-mono text-[10.5px] font-medium leading-4 tabular-nums transition-colors",
            selected ? "bg-volt-soft text-volt-ink" : "bg-surface-raised text-ink-muted",
          )}
        >
          {count}
        </span>
      )}
      {removable && (
        <button
          type="button"
          tabIndex={group ? -1 : 0}
          aria-label={`Remove ${text}`}
          onClick={(e) => {
            e.stopPropagation();
            doRemove();
          }}
          className={cn(
            "grid shrink-0 place-items-center rounded-full text-ink-subtle outline-none transition-colors duration-150",
            "hover:bg-surface-hover hover:text-ink focus-visible:shadow-[var(--focus-ring)]",
            closeSize[size],
          )}
        >
          <X aria-hidden strokeWidth={2.5} />
        </button>
      )}
    </>
  );

  const shell = cn(
    "relative inline-flex max-w-full shrink-0 select-none items-center whitespace-nowrap border font-medium outline-none",
    "transition-[background-color,border-color,color,box-shadow] duration-300 ease-spring",
    tagSize[size],
    (hasLead || selectable) && leadPad[size],
    removable && trailPad[size],
    selected ? "border-volt-ink/50 bg-volt-soft text-ink" : "border-border-strong bg-surface text-ink",
    selectable && !disabled && !selected && "hover:bg-surface-hover",
    disabled && "cursor-not-allowed opacity-45",
    className,
  );

  const motionProps = {
    layout: "position" as const,
    initial: reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8, filter: "blur(4px)" },
    animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
    exit: reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, filter: "blur(6px)" },
    transition: { layout: settle, default: pop },
  };

  if (!group) {
    return (
      <motion.span ref={rowRef} {...motionProps} className={shell} aria-disabled={disabled || undefined}>
        {body}
      </motion.span>
    );
  }

  return (
    <motion.span
      ref={rowRef}
      {...motionProps}
      role="row"
      data-tag-row=""
      data-value={key}
      data-exiting={isPresent ? undefined : ""}
      data-removable={removable ? "" : undefined}
      aria-selected={selectable ? selected : undefined}
      aria-disabled={disabled || undefined}
      aria-label={text || undefined}
      whileTap={selectable && !disabled && !reduce ? { scale: 0.96 } : undefined}
      onClick={() => {
        if (selectable && !disabled) group.toggle(key);
      }}
      className={cn(shell, selectable && !disabled && "cursor-pointer", "focus-visible:shadow-[var(--focus-ring)]")}
    >
      <span role="gridcell" className="inline-flex min-w-0 items-center gap-[inherit]">
        {body}
      </span>
    </motion.span>
  );
});

function MiniCheck({ checked, size, disabled, reduce }: { checked: boolean; size: TagSize; disabled?: boolean; reduce: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center border transition-[background-color,border-color] duration-200",
        boxSize[size],
        checked ? "border-volt bg-volt text-on-volt" : "border-border-strong bg-surface-sunken",
        disabled && !checked && "bg-surface-hover",
      )}
    >
      <svg viewBox="0 0 16 16" className="size-[80%]" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
        <motion.path
          d="M3.5 8.5l3 3 6-7"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 30 }}
        />
      </svg>
    </span>
  );
}

function Flag({ flag, size }: { flag: TagFlag; size: TagSize }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full shadow-[inset_0_0_0_1px_var(--border)]",
        flag.orientation === "horizontal" ? "flex-col" : "flex-row",
        mediaSize[size],
      )}
    >
      {flag.stripes.map((c, i) => (
        <span key={i} className="flex-1" style={{ backgroundColor: c }} />
      ))}
      {flag.disc && <span className="absolute left-1/2 top-1/2 size-[46%] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ backgroundColor: flag.disc }} />}
      <span className="absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_var(--border)]" />
    </span>
  );
}

export interface TagGroupProps {
  /** Names the group for assistive tech; shown above the tags unless hideLabel. */
  label: string;
  hideLabel?: boolean;
  /** @default "md" */
  size?: TagSize;
  /** "single" keeps exactly one tag picked once chosen; "multiple" toggles. @default "none" */
  selectionMode?: TagSelectionMode;
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** Enables remove buttons and Backspace/Delete on every tag. */
  onRemove?: (value: string) => void;
  /** Shown when there are no tags. */
  emptyState?: React.ReactNode;
  className?: string;
  /** Tag elements, each with a stable key. */
  children?: React.ReactNode;
}

/** Keyboard-navigable set of tags: arrows move between chips, Space selects, Backspace removes, and neighbours slide closed as a chip leaves. */
export function TagGroup({
  label,
  hideLabel,
  size = "md",
  selectionMode = "none",
  value,
  defaultValue = [],
  onValueChange,
  onRemove,
  emptyState,
  className,
  children,
}: TagGroupProps) {
  const auto = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [own, setOwn] = React.useState<string[]>(defaultValue);
  const selected = value ?? own;
  const grid = React.useRef<HTMLDivElement>(null);
  const focusAfterRemoval = React.useRef<number | null>(null);
  const lastFocused = React.useRef<string | null>(null);

  const set = (next: string[]) => {
    if (value === undefined) setOwn(next);
    onValueChange?.(next);
  };

  const ctx: TagGroupContextValue = {
    size,
    mode: selectionMode,
    isSelected: (v) => selected.includes(v),
    toggle: (v) => {
      if (selectionMode === "single") {
        if (!selected.includes(v)) set([v]);
      } else if (selectionMode === "multiple") {
        set(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
      }
    },
    onRemove,
    remove: (v, row) => {
      const rows = liveRows(grid.current);
      const at = row ? rows.indexOf(row) : -1;
      if (row && row.contains(document.activeElement)) focusAfterRemoval.current = Math.max(0, at);
      if (selected.includes(v)) set(selected.filter((x) => x !== v));
      onRemove?.(v);
    },
  };

  // Roving tabindex: one tab stop, on the last focused tag, else the first selected, else the first enabled.
  React.useLayoutEffect(() => {
    const rows = liveRows(grid.current);
    const enabled = rows.filter((r) => r.getAttribute("aria-disabled") !== "true");
    const stop =
      enabled.find((r) => r.dataset.value === lastFocused.current) ?? enabled.find((r) => r.getAttribute("aria-selected") === "true") ?? enabled[0];
    rows.forEach((r) => {
      r.tabIndex = r === stop ? 0 : -1;
    });
    if (focusAfterRemoval.current !== null) {
      const target = enabled[Math.min(focusAfterRemoval.current, enabled.length - 1)];
      focusAfterRemoval.current = null;
      if (target) {
        lastFocused.current = target.dataset.value ?? null;
        target.tabIndex = 0;
        target.focus();
      }
    }
  });

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>("[data-tag-row]");
    if (!row || e.target !== row) return;
    const enabled = liveRows(grid.current).filter((r) => r.getAttribute("aria-disabled") !== "true");
    const at = enabled.indexOf(row);
    let next: HTMLElement | undefined;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = enabled[Math.min(at + 1, enabled.length - 1)];
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = enabled[Math.max(at - 1, 0)];
        break;
      case "Home":
        next = enabled[0];
        break;
      case "End":
        next = enabled[enabled.length - 1];
        break;
      case " ":
      case "Enter":
        if (selectionMode !== "none" && row.dataset.value !== undefined && at >= 0) {
          e.preventDefault();
          ctx.toggle(row.dataset.value);
        }
        return;
      case "Backspace":
      case "Delete":
        if (row.dataset.removable !== undefined && row.dataset.value !== undefined) {
          e.preventDefault();
          row.querySelector<HTMLButtonElement>("button[aria-label]")?.click();
        }
        return;
      default:
        return;
    }
    if (next) {
      e.preventDefault();
      lastFocused.current = next.dataset.value ?? null;
      liveRows(grid.current).forEach((r) => {
        r.tabIndex = r === next ? 0 : -1;
      });
      next.focus();
    }
  };

  const labelId = `tg${auto}-label`;
  const count = React.Children.count(children);
  return (
    <div className={cn("grid min-w-0 gap-2", className)}>
      <span id={labelId} className={cn("text-[13px] font-medium leading-[18px] text-ink", hideLabel && "sr-only")}>
        {label}
      </span>
      <TagGroupContext.Provider value={ctx}>
        <div
          ref={grid}
          role="grid"
          aria-labelledby={labelId}
          aria-multiselectable={selectionMode === "multiple" || undefined}
          onKeyDown={onKeyDown}
          onFocus={(e) => {
            const row = (e.target as HTMLElement).closest<HTMLElement>("[data-tag-row]");
            if (!row || row.dataset.value === undefined) return;
            lastFocused.current = row.dataset.value;
            liveRows(grid.current).forEach((r) => {
              r.tabIndex = r === row ? 0 : -1;
            });
          }}
          className="relative flex flex-wrap items-center gap-1.5"
        >
          <AnimatePresence initial={false} mode="popLayout">
            {children}
          </AnimatePresence>
          {count === 0 && emptyState && <p className="m-0 text-[13px] text-ink-subtle">{emptyState}</p>}
        </div>
      </TagGroupContext.Provider>
    </div>
  );
}

function liveRows(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>("[data-tag-row]:not([data-exiting])"));
}
