"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/*
 * Shared listbox core for Select, Combobox and TagSelect.
 * Option model, filtering, APG keyboard navigation, the option list with a gliding
 * highlight, and a portalled panel that springs open and flips near the viewport edge.
 */

export type ListboxSize = "sm" | "md" | "lg";
export type ListboxTone = "success" | "warning" | "danger" | "info" | "neutral";
/** Any icon component that takes a className (every lucide-react icon fits). */
export type ListboxIcon = React.ComponentType<{ className?: string }>;

export interface ListboxOption {
  value: string;
  /** Visible name; also used for typeahead and filtering. */
  label: string;
  /** Supporting line under the label. Strings are searchable. */
  description?: React.ReactNode;
  icon?: ListboxIcon;
  /** Initials avatar. `true` uses the label; a string is the name to take initials from. */
  avatar?: boolean | string;
  /** Status dot before the label. */
  dot?: ListboxTone;
  /** Right-aligned text: a count, a price, a role. */
  meta?: React.ReactNode;
  /** Right-aligned key hint, e.g. "⌘1". */
  shortcut?: string;
  disabled?: boolean;
  /** Extra words that match when filtering. */
  keywords?: string[];
}

export interface ListboxGroup {
  heading?: string;
  options: ListboxOption[];
}

export interface ListboxSeparator {
  separator: true;
}

export type ListboxEntry = ListboxOption | ListboxGroup | ListboxSeparator;

export function isListboxGroup(entry: ListboxEntry): entry is ListboxGroup {
  return "options" in entry;
}

export function isListboxSeparator(entry: ListboxEntry): entry is ListboxSeparator {
  return "separator" in entry;
}

/** Every option in visual order. */
export function flattenEntries(entries: readonly ListboxEntry[]): ListboxOption[] {
  const out: ListboxOption[] = [];
  for (const e of entries) {
    if (isListboxSeparator(e)) continue;
    if (isListboxGroup(e)) out.push(...e.options);
    else out.push(e);
  }
  return out;
}

/** Keep options that pass `keep`; empty groups and dangling separators are dropped. */
export function filterEntries(entries: readonly ListboxEntry[], keep: (option: ListboxOption) => boolean): ListboxEntry[] {
  const out: ListboxEntry[] = [];
  for (const e of entries) {
    if (isListboxSeparator(e)) {
      if (out.length && !isListboxSeparator(out[out.length - 1])) out.push(e);
      continue;
    }
    if (isListboxGroup(e)) {
      const options = e.options.filter(keep);
      if (options.length) out.push({ ...e, options });
      continue;
    }
    if (keep(e)) out.push(e);
  }
  while (out.length && isListboxSeparator(out[out.length - 1])) out.pop();
  return out;
}

/** Map every option, keeping the group structure. */
export function mapEntries(entries: readonly ListboxEntry[], fn: (option: ListboxOption) => ListboxOption): ListboxEntry[] {
  return entries.map((e) => (isListboxSeparator(e) ? e : isListboxGroup(e) ? { ...e, options: e.options.map(fn) } : fn(e)));
}

const foldChar = (c: string) => c.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Case- and accent-insensitive form of a string. */
export function fold(text: string) {
  return Array.from(text).map(foldChar).join("");
}

/** Default filter: label, string description and keywords contain the query, ignoring case and accents. */
export function defaultFilter(option: ListboxOption, query: string) {
  const q = fold(query.trim());
  if (!q) return true;
  const hay = [option.label, typeof option.description === "string" ? option.description : "", ...(option.keywords ?? [])].join(" ");
  return fold(hay).includes(q);
}

/** Start/end (in characters) of the query inside the label, or null. */
export function matchRange(label: string, query: string): [number, number] | null {
  const q = fold(query.trim());
  if (!q) return null;
  const folded = Array.from(label).map(foldChar);
  if (folded.some((f) => f.length !== 1)) return null;
  const at = folded.join("").indexOf(q);
  return at < 0 ? null : [at, at + q.length];
}

/** Label with the matched part in volt. */
export function HighlightMatch({ text, query }: { text: string; query?: string }) {
  const range = query ? matchRange(text, query) : null;
  if (!range) return <>{text}</>;
  const chars = Array.from(text);
  return (
    <>
      {chars.slice(0, range[0]).join("")}
      <mark className="rounded-[3px] bg-transparent font-semibold text-volt-ink">{chars.slice(range[0], range[1]).join("")}</mark>
      {chars.slice(range[1]).join("")}
    </>
  );
}

/** DOM id of an option, safe for aria-activedescendant. */
export function optionId(listId: string, value: string) {
  return `${listId}-o-${value.replace(/[^a-zA-Z0-9_-]/g, (c) => `_${c.charCodeAt(0).toString(36)}`)}`;
}

/** Strip characters React's useId adds that some selectors dislike. */
export function useSafeId(prefix: string) {
  const raw = React.useId();
  return `${prefix}${raw.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

const noopSubscribe = () => () => {};

/** True on Apple platforms (server renders the ⌘ form, the client corrects after hydration). */
export function useIsMac() {
  return React.useSyncExternalStore(
    noopSubscribe,
    () => /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent),
    () => true,
  );
}

/* ------------------------------------------------------------------ */
/* Visual pieces                                                       */
/* ------------------------------------------------------------------ */

export const listboxRowSize: Record<ListboxSize, string> = {
  sm: "min-h-8 px-2 py-1.5 gap-2 text-[13px] rounded-[8px]",
  md: "min-h-9 px-2.5 py-2 gap-2.5 text-sm rounded-[10px]",
  lg: "min-h-11 px-3 py-2.5 gap-3 text-[15px] rounded-xs",
};
export const listboxIconSize: Record<ListboxSize, string> = { sm: "size-3.5", md: "size-4", lg: "size-[18px]" };
const avatarSize: Record<ListboxSize, string> = { sm: "size-5 text-[9px]", md: "size-6 text-[10px]", lg: "size-7 text-[11px]" };
/** List height cap per size, px. */
export const listboxMaxHeight: Record<ListboxSize, number> = { sm: 224, md: 288, lg: 336 };

const avatarTones = [
  "bg-volt-soft text-volt-ink",
  "bg-ember-soft text-ember-ink",
  "bg-info-soft text-info",
  "bg-success-soft text-success",
  "bg-warning-soft text-warning",
];
const dotTones: Record<ListboxTone, string> = {
  success: "bg-success shadow-[0_0_0_3px_var(--success-soft)]",
  warning: "bg-warning shadow-[0_0_0_3px_var(--warning-soft)]",
  danger: "bg-danger shadow-[0_0_0_3px_var(--danger-soft)]",
  info: "bg-info shadow-[0_0_0_3px_var(--info-soft)]",
  neutral: "bg-ink-subtle shadow-[0_0_0_3px_var(--surface-hover)]",
};

/** Up to two initials from a name. */
export function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0] ?? "").slice(0, 2).toUpperCase();
}

function toneFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return avatarTones[h % avatarTones.length];
}

/** Leading avatar, dot or icon for an option (used in rows, triggers and chips). */
export function OptionMedia({ option, size = "md", className }: { option: ListboxOption; size?: ListboxSize; className?: string }) {
  if (option.avatar) {
    const name = typeof option.avatar === "string" ? option.avatar : option.label;
    return (
      <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-full font-semibold tracking-wide", avatarSize[size], toneFor(name), className)}>
        {initials(name)}
      </span>
    );
  }
  if (option.dot) {
    return (
      <span aria-hidden className={cn("grid shrink-0 place-items-center", listboxIconSize[size], className)}>
        <span className={cn("size-2 rounded-full", dotTones[option.dot])} />
      </span>
    );
  }
  if (option.icon) {
    const Icon = option.icon;
    return (
      <span aria-hidden className={cn("inline-flex shrink-0 text-ink-subtle", className)}>
        <Icon className={listboxIconSize[size]} />
      </span>
    );
  }
  return null;
}

/** Small key-hint chip. */
export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-border bg-surface px-1 font-mono text-[11px] font-medium leading-none text-ink-subtle",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

function CheckGlyph({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <motion.path
        d="M3.5 8.5l3 3 6-7"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 30 }}
      />
    </svg>
  );
}

const boxSize: Record<ListboxSize, string> = { sm: "size-3.5 rounded-[4px]", md: "size-4 rounded-[5px]", lg: "size-[18px] rounded-[5px]" };

/** Checkbox look-alike for multi-select rows (not an input: the row is the option). */
export function CheckboxGlyph({ checked, size = "md" }: { checked: boolean; size?: ListboxSize }) {
  const reduce = useReducedMotion();
  return (
    <span
      aria-hidden
      className={cn(
        "relative grid shrink-0 place-items-center border transition-[background-color,border-color] duration-150",
        boxSize[size],
        checked ? "border-volt bg-volt text-on-volt" : "border-border-strong bg-surface-sunken",
      )}
    >
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="size-[80%]">
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

/* ------------------------------------------------------------------ */
/* Keyboard navigation                                                 */
/* ------------------------------------------------------------------ */

export interface ListboxNavigation {
  /** Value of the highlighted option. */
  active: string | null;
  setActive: (value: string | null) => void;
  /** Move by `delta` enabled options (clamped, no wrap). Returns the new value. */
  step: (delta: number) => string | null;
  /** Jump to the first or last enabled option. */
  edge: (where: "first" | "last") => string | null;
  /** Feed one printed character; matches labels by prefix (repeat a letter to cycle). */
  typeahead: (char: string, timeStamp: number) => string | null;
  enabled: ListboxOption[];
}

/** Active-option state and APG movement helpers for a flat option list. */
export function useListboxNavigation(options: readonly ListboxOption[], { autoActivateFirst = false }: { autoActivateFirst?: boolean } = {}): ListboxNavigation {
  const [raw, setActive] = React.useState<string | null>(null);
  const enabled = React.useMemo(() => options.filter((o) => !o.disabled), [options]);
  const active = raw !== null && enabled.some((o) => o.value === raw) ? raw : autoActivateFirst ? (enabled[0]?.value ?? null) : null;
  const buffer = React.useRef({ text: "", at: 0 });

  const step = (delta: number) => {
    if (!enabled.length) return null;
    const i = enabled.findIndex((o) => o.value === active);
    const next = i === -1 ? (delta > 0 ? enabled[0] : enabled[enabled.length - 1]) : enabled[Math.max(0, Math.min(enabled.length - 1, i + delta))];
    setActive(next.value);
    return next.value;
  };
  const edge = (where: "first" | "last") => {
    const next = where === "first" ? enabled[0] : enabled[enabled.length - 1];
    setActive(next?.value ?? null);
    return next?.value ?? null;
  };
  const typeahead = (char: string, timeStamp: number) => {
    const b = buffer.current;
    b.text = timeStamp - b.at > 600 ? char : b.text + char;
    b.at = timeStamp;
    const q = fold(b.text);
    const start = enabled.findIndex((o) => o.value === active);
    const from = q.length > 1 ? Math.max(0, start) : start + 1;
    const ordered = [...enabled.slice(from), ...enabled.slice(0, from)];
    let match = ordered.find((o) => fold(o.label).startsWith(q));
    if (!match && Array.from(q).every((c) => c === q[0])) match = ordered.find((o) => fold(o.label).startsWith(q[0]));
    if (match) setActive(match.value);
    return match?.value ?? null;
  };
  return { active, setActive, step, edge, typeahead, enabled };
}

/** True for a key that types one visible character (no modifiers). */
export function isPrintableKey(e: React.KeyboardEvent) {
  return e.key.length === 1 && e.key !== " " && !e.ctrlKey && !e.metaKey && !e.altKey;
}

/* ------------------------------------------------------------------ */
/* Option list                                                         */
/* ------------------------------------------------------------------ */

export interface ListboxProps {
  id: string;
  entries: readonly ListboxEntry[];
  selected: readonly string[];
  active: string | null;
  onActiveChange: (value: string) => void;
  onPick: (option: ListboxOption) => void;
  multiple?: boolean;
  /** Selection mark: a drawn check on the right, a checkbox on the left, or none. */
  indicator?: "check" | "checkbox" | "none";
  size?: ListboxSize;
  /** Highlight this text inside labels. */
  query?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  /** Rendered (outside the listbox role) when there are no options: empty or loading state. */
  empty?: React.ReactNode;
  busy?: boolean;
  maxHeight?: number;
  className?: string;
}

/** Option list with group headings, separators, media slots and one volt highlight that glides between rows. */
export function Listbox({
  id,
  entries,
  selected,
  active,
  onActiveChange,
  onPick,
  multiple,
  indicator = "check",
  size = "md",
  query,
  empty,
  busy,
  maxHeight,
  className,
  ...aria
}: ListboxProps) {
  const reduce = useReducedMotion();
  const picked = React.useMemo(() => new Set(selected), [selected]);
  const hasOptions = flattenEntries(entries).length > 0;

  // Keep the active row in view (keyboard moves, filtering, first open).
  React.useEffect(() => {
    if (active) document.getElementById(optionId(id, active))?.scrollIntoView({ block: "nearest" });
  }, [id, active]);

  const renderOption = (o: ListboxOption) => {
    const isSelected = picked.has(o.value);
    const isActive = active === o.value;
    return (
      <div
        key={o.value}
        id={optionId(id, o.value)}
        role="option"
        aria-selected={isSelected}
        aria-disabled={o.disabled || undefined}
        data-active={isActive || undefined}
        onPointerMove={() => {
          if (!o.disabled && !isActive) onActiveChange(o.value);
        }}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          if (!o.disabled) onPick(o);
        }}
        className={cn(
          "relative flex cursor-pointer select-none items-center text-ink-muted transition-colors duration-100",
          listboxRowSize[size],
          isActive && "text-ink",
          isSelected && "text-ink",
          o.disabled && "cursor-not-allowed opacity-45",
        )}
      >
        {isActive && (
          <motion.span
            aria-hidden
            layoutId={`${id}-highlight`}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 40, mass: 0.7 }}
            className="absolute inset-0 rounded-[inherit] bg-volt-soft"
          />
        )}
        {indicator === "checkbox" && (
          <span className="relative flex">
            <CheckboxGlyph checked={isSelected} size={size} />
          </span>
        )}
        <OptionMedia option={o} size={size} className="relative" />
        <span className="relative grid min-w-0 flex-1">
          <span className={cn("truncate", isSelected && "font-medium")}>
            <HighlightMatch text={o.label} query={query} />
          </span>
          {o.description && <span className="truncate text-xs leading-4 text-ink-subtle">{o.description}</span>}
        </span>
        {o.meta && <span className="relative shrink-0 text-xs tabular-nums text-ink-subtle">{o.meta}</span>}
        {o.shortcut && <Kbd className="relative">{o.shortcut}</Kbd>}
        {indicator === "check" && (
          <span className={cn("relative grid shrink-0 place-items-center text-volt-ink", listboxIconSize[size])}>
            {isSelected && <CheckGlyph className="size-full" />}
          </span>
        )}
      </div>
    );
  };

  let blocks = 0;
  return (
    <>
      <motion.div
        layoutScroll
        data-lb-scroll=""
        id={id}
        role="listbox"
        aria-multiselectable={multiple || undefined}
        aria-busy={busy || undefined}
        tabIndex={-1}
        style={{ maxHeight: maxHeight ?? listboxMaxHeight[size] }}
        className={cn("min-h-0 overflow-y-auto overscroll-contain outline-none", hasOptions && "p-1", className)}
        {...aria}
      >
        {entries.map((e, i) => {
          if (isListboxSeparator(e)) return <div key={`sep-${i}`} aria-hidden className="-mx-1 my-1 h-px bg-border" />;
          const first = blocks++ === 0;
          if (!isListboxGroup(e)) return renderOption(e);
          const headingId = `${id}-g${i}`;
          const prev = entries[i - 1];
          return (
            <div
              key={`grp-${i}`}
              role="group"
              aria-labelledby={e.heading ? headingId : undefined}
              className={cn(!first && prev && !isListboxSeparator(prev) && "-mx-1 mt-1 border-t border-border px-1 pt-1")}
            >
              {e.heading && (
                <div id={headingId} role="presentation" className="px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-subtle">
                  {e.heading}
                </div>
              )}
              {e.options.map(renderOption)}
            </div>
          );
        })}
      </motion.div>
      {!hasOptions && empty}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Popover panel                                                       */
/* ------------------------------------------------------------------ */

export interface ListboxPopoverProps {
  open: boolean;
  /** Element the panel lines up with (usually the field well). */
  anchorRef: React.RefObject<HTMLElement | null>;
  /** Called on outside press or when focus leaves both anchor and panel. */
  onDismiss: () => void;
  children: React.ReactNode;
  className?: string;
  /** Gap to the anchor, px. @default 6 */
  sideOffset?: number;
  /** Minimum panel width; otherwise it matches the anchor. @default 220 */
  minWidth?: number;
}

type Pos = { left: number; top?: number; bottom?: number; width: number; avail: number; side: "top" | "bottom"; theme: string | null };

const EDGE = 8;
const r2 = (n: number) => Math.round(n * 100) / 100;

function measure(anchor: HTMLElement, panel: HTMLElement, offset: number, minWidth: number): Pos {
  const r = anchor.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const list = panel.querySelector<HTMLElement>("[data-lb-scroll]");
  const chrome = panel.offsetHeight - (list?.clientHeight ?? 0);
  const listMax = list ? parseFloat(getComputedStyle(list).maxHeight) : NaN;
  const natural = list ? chrome + Math.min(list.scrollHeight, Number.isFinite(listMax) ? listMax : list.scrollHeight) : panel.scrollHeight;
  const below = vh - r.bottom - offset - EDGE;
  const above = r.top - offset - EDGE;
  const side = natural > below && above > below ? "top" : "bottom";
  const width = Math.min(Math.max(r.width, minWidth), vw - EDGE * 2);
  const left = Math.max(EDGE, Math.min(r.left, vw - EDGE - width));
  return {
    side,
    left: r2(left),
    width: r2(width),
    avail: Math.max(140, r2(side === "bottom" ? below : above)),
    top: side === "bottom" ? r2(r.bottom + offset) : undefined,
    bottom: side === "top" ? r2(vh - r.top + offset) : undefined,
    theme: anchor.closest("[data-theme]")?.getAttribute("data-theme") ?? null,
  };
}

const samePos = (a: Pos | null, b: Pos) =>
  !!a && a.left === b.left && a.top === b.top && a.bottom === b.bottom && a.width === b.width && a.avail === b.avail && a.side === b.side && a.theme === b.theme;

function Panel({ anchorRef, onDismiss, children, className, sideOffset = 6, minWidth = 220 }: Omit<ListboxPopoverProps, "open">) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<Pos | null>(null);
  const dismiss = React.useRef(onDismiss);
  React.useEffect(() => {
    dismiss.current = onDismiss;
  });

  React.useLayoutEffect(() => {
    const panel = ref.current;
    const anchor = anchorRef.current;
    if (!panel || !anchor) return;
    const update = () => {
      const next = measure(anchor, panel, sideOffset, minWidth);
      setPos((prev) => (samePos(prev, next) ? prev : next));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(panel);
    ro.observe(anchor);
    const list = panel.querySelector("[data-lb-scroll]");
    const mo = new MutationObserver(update);
    if (list) mo.observe(list, { childList: true, subtree: true });
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [anchorRef, sideOffset, minWidth]);

  React.useEffect(() => {
    const inside = (t: EventTarget | null) => t instanceof Node && (!!ref.current?.contains(t) || !!anchorRef.current?.contains(t));
    const onDown = (e: PointerEvent) => {
      if (!inside(e.target)) dismiss.current();
    };
    const onFocus = (e: FocusEvent) => {
      if (!inside(e.target)) dismiss.current();
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("focusin", onFocus);
    };
  }, [anchorRef]);

  const side = pos?.side ?? "bottom";
  const hidden = { opacity: 0, scale: reduce ? 1 : 0.96, y: reduce ? 0 : side === "bottom" ? -6 : 6, filter: reduce ? "blur(0px)" : "blur(6px)" };
  return (
    <motion.div
      ref={ref}
      data-theme={pos?.theme ?? undefined}
      initial={hidden}
      animate={pos ? { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" } : hidden}
      exit={{ ...hidden, transition: { duration: 0.12 } }}
      transition={{ type: "spring", stiffness: 380, damping: 30, opacity: { duration: 0.14 } }}
      style={{
        position: "fixed",
        left: pos?.left ?? 0,
        top: pos ? pos.top : 0,
        bottom: pos?.bottom,
        width: pos?.width ?? minWidth,
        maxHeight: pos?.avail,
        transformOrigin: side === "bottom" ? "50% 0%" : "50% 100%",
        pointerEvents: pos ? undefined : "none",
      }}
      className={cn("z-[90] flex flex-col overflow-hidden rounded-md border border-border bg-surface-raised text-ink shadow-lg", className)}
    >
      {children}
    </motion.div>
  );
}

/** Portalled panel that lines up with its anchor, springs open, flips above when there is no room below and repositions on scroll. */
export function ListboxPopover({ open, ...props }: ListboxPopoverProps) {
  const mounted = React.useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!mounted) return null;
  return createPortal(<AnimatePresence>{open && <Panel key="panel" {...props} />}</AnimatePresence>, document.body);
}
