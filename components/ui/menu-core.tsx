"use client";

/**
 * Shared menu engine for ContextMenu and Dropdown: entries, APG menu keyboard support (arrows, Home/End,
 * typeahead, submenus), checkbox and radio rows, sections, the gliding highlight and viewport-aware placement.
 * Internal module — import ContextMenu or Dropdown instead.
 */

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MenuItemEntry {
  /** "checkbox" and "radio" render menuitemcheckbox / menuitemradio rows. A plain item with `checked` set is a checkbox too. */
  type?: "item" | "checkbox" | "radio";
  label: string;
  icon?: React.ReactNode;
  /** Second line under the label. */
  description?: string;
  /** Shown right-aligned, e.g. "⌘D". Display only — bind the keys yourself. */
  shortcut?: string;
  /** Trailing node such as a Badge or a count. */
  badge?: React.ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  /** Destructive styling. */
  danger?: boolean;
  checked?: boolean;
  /** Nested entries open as a submenu beside the item. */
  items?: MenuEntry[];
  /** Extra words a search box matches against. */
  keywords?: string[];
  /** Override whether choosing this row closes the menu. */
  closeOnSelect?: boolean;
}

export type MenuEntry = MenuItemEntry | { type: "separator" } | { type: "label"; label: string };

export type MenuPlacement =
  | { kind: "point"; x: number; y: number }
  | { kind: "anchor"; anchor: HTMLElement; side: "top" | "bottom"; align: "start" | "center" | "end"; offset: number }
  | { kind: "sub"; flip: boolean };

export const isMenuItem = (e: MenuEntry): e is MenuItemEntry =>
  e.type === undefined || e.type === "item" || e.type === "checkbox" || e.type === "radio";

const SUB_WIDTH = 216;
const EDGE = 8;

function roleOf(e: MenuItemEntry) {
  if (e.type === "radio") return "menuitemradio" as const;
  if (e.type === "checkbox" || e.checked !== undefined) return "menuitemcheckbox" as const;
  return "menuitem" as const;
}

/** Filter entries by a query (label, description, keywords), keeping submenu parents with matching children and tidying separators and section labels. */
export function filterMenuEntries(entries: MenuEntry[], query: string): MenuEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  const kept: MenuEntry[] = [];
  for (const e of entries) {
    if (!isMenuItem(e)) {
      kept.push(e);
      continue;
    }
    const hay = [e.label, e.description ?? "", ...(e.keywords ?? [])].join(" ").toLowerCase();
    if (hay.includes(q)) kept.push(e);
    else if (e.items?.length) {
      const sub = filterMenuEntries(e.items, q);
      if (sub.some(isMenuItem)) kept.push({ ...e, items: sub });
    }
  }
  // Drop section labels with no items after them, and leading / trailing / doubled separators.
  const out: MenuEntry[] = [];
  kept.forEach((e, i) => {
    if (e.type === "label") {
      const next = kept[i + 1];
      if (!next || !isMenuItem(next)) return;
    }
    if (e.type === "separator") {
      const prev = out[out.length - 1];
      const hasNext = kept.slice(i + 1).some(isMenuItem);
      if (!prev || prev.type === "separator" || !hasNext) return;
    }
    out.push(e);
  });
  return out;
}

export interface MenuPanelProps {
  entries: MenuEntry[];
  level?: number;
  placement: MenuPlacement;
  /** Where focus goes on mount: the first or last item (keyboard), the menu (pointer) or nowhere (hover-opened submenu). */
  focusOnOpen: "first" | "last" | "panel" | "none";
  /** Changing this re-applies focusOnOpen, e.g. ArrowRight on an item whose submenu is already open from hover. */
  focusToken?: number;
  onCloseAll: (restore: boolean) => void;
  /** Submenu only: close this level and return focus to the parent item. */
  onBack?: () => void;
  /** ArrowUp on the first row calls this instead of wrapping (e.g. back to a search box). */
  onExitTop?: () => void;
  /** Replaces typeahead: printable keys and Backspace are handed here (e.g. to a search box). */
  onPrintableKey?: (key: string) => void;
  /** Whether checkbox / radio rows close the menu when chosen. */
  closeOnCheck?: boolean;
  /** Root only: content above the list (account card, search box). */
  header?: React.ReactNode;
  /** Root only: content below the list. */
  footer?: React.ReactNode;
  /** Shown when there are no entries (e.g. no search results). */
  empty?: React.ReactNode;
  /** Cap the list height and scroll it. Leave off when rows have submenus. */
  scrollable?: boolean;
  menuId?: string;
  labelledBy?: string;
  menuClassName?: string;
  /** Extra classes for the root surface only. */
  className?: string;
  /** Root surface width in px (clamped to the viewport). */
  width?: number;
}

/** The menu surface: renders entries, owns keyboard navigation, the highlight and nested submenus. */
export function MenuPanel({
  entries,
  level = 0,
  placement,
  focusOnOpen,
  focusToken,
  onCloseAll,
  onBack,
  onExitTop,
  onPrintableKey,
  closeOnCheck = true,
  header,
  footer,
  empty,
  scrollable,
  menuId,
  labelledBy,
  menuClassName,
  className,
  width,
  ref: forwarded,
}: MenuPanelProps & { ref?: React.Ref<HTMLDivElement> }) {
  const reduce = useReducedMotion();
  const uid = React.useId();
  const surfaceRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const itemRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = React.useState(-1);
  const [sub, setSub] = React.useState<{ index: number; keyboard: boolean; flip: boolean; token: number } | null>(null);
  const hoverTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const typeahead = React.useRef<{ buffer: string; timer: ReturnType<typeof setTimeout> | null }>({ buffer: "", timer: null });
  const sideRef = React.useRef<"top" | "bottom" | null>(null);
  React.useImperativeHandle(forwarded, () => surfaceRef.current as HTMLDivElement);

  const enabled = entries.map((e, i) => (isMenuItem(e) && !e.disabled ? i : -1)).filter((i) => i !== -1);

  // Entries can change while open (search filter, toggled checkbox). Drop a highlight or submenu that no longer points at a live row.
  const activeEntry = entries[active];
  if (active !== -1 && !(activeEntry && isMenuItem(activeEntry) && !activeEntry.disabled)) setActive(-1);
  const subEntry = sub ? entries[sub.index] : undefined;
  if (sub && !(subEntry && isMenuItem(subEntry) && subEntry.items?.length)) setSub(null);

  // Placement: keep the root inside the viewport (flip at the pointer, or flip / shift around an anchor) and nudge submenus up if they overflow.
  React.useLayoutEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    if (placement.kind === "point") {
      const r = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const left = placement.x + r.width > vw - EDGE ? Math.max(EDGE, placement.x - r.width) : placement.x;
      const top = placement.y + r.height > vh - EDGE ? Math.max(EDGE, placement.y - r.height) : placement.y;
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      el.style.transformOrigin = `${left < placement.x ? "100%" : "0%"} ${top < placement.y ? "100%" : "0%"}`;
      return;
    }
    if (placement.kind === "sub") {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.bottom > vh - EDGE) el.style.top = `${-4 - (r.bottom - (vh - EDGE))}px`;
      return;
    }
    const { anchor, align, offset } = placement;
    const place = () => {
      const a = anchor.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // offsetWidth/Height ignore the entrance scale, so the first measurement is exact.
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const below = vh - a.bottom - offset - EDGE;
      const above = a.top - offset - EDGE;
      if (!sideRef.current) {
        sideRef.current =
          placement.side === "bottom" ? (h > below && above > below ? "top" : "bottom") : h > above && below > above ? "bottom" : "top";
      }
      const side = sideRef.current;
      const raw = align === "start" ? a.left : align === "end" ? a.right - w : a.left + a.width / 2 - w / 2;
      const left = Math.round(Math.min(Math.max(EDGE, raw), Math.max(EDGE, vw - w - EDGE)));
      el.style.left = `${left}px`;
      if (side === "bottom") {
        el.style.top = `${Math.round(a.bottom + offset)}px`;
        el.style.bottom = "auto";
      } else {
        el.style.top = "auto";
        el.style.bottom = `${Math.round(vh - a.top + offset)}px`;
      }
      // Room left for the scrolling list once the header / footer are accounted for.
      const chrome = h - (listRef.current?.offsetHeight ?? 0);
      el.style.setProperty("--menu-available-height", `${Math.max(140, Math.round((side === "bottom" ? below : above) - chrome))}px`);
      const ox = Math.round(Math.min(Math.max(a.left + a.width / 2 - left, 12), w - 12));
      el.style.transformOrigin = `${ox}px ${side === "bottom" ? "0%" : "100%"}`;
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [placement]);

  React.useEffect(() => {
    const t = requestAnimationFrame(() => {
      if (focusOnOpen === "first" && enabled.length) focusItem(enabled[0]);
      else if (focusOnOpen === "last" && enabled.length) focusItem(enabled[enabled.length - 1]);
      else if (focusOnOpen === "panel") listRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(t);
    // On mount, and again when the parent asks (focusToken).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusToken]);

  React.useEffect(() => {
    const ta = typeahead.current;
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      if (ta.timer) clearTimeout(ta.timer);
    };
  }, []);

  function focusItem(i: number) {
    setActive(i);
    itemRefs.current[i]?.focus({ preventScroll: true });
  }

  function openSub(i: number, viaKeyboard: boolean) {
    const r = surfaceRef.current?.getBoundingClientRect();
    const f = r ? r.right + SUB_WIDTH > window.innerWidth - EDGE : false;
    setSub((prev) =>
      prev?.index === i
        ? { ...prev, keyboard: viaKeyboard || prev.keyboard, token: viaKeyboard ? prev.token + 1 : prev.token }
        : { index: i, keyboard: viaKeyboard, flip: f, token: 0 },
    );
  }

  function activate(i: number, viaKeyboard: boolean) {
    const e = entries[i];
    if (!e || !isMenuItem(e) || e.disabled) return;
    if (e.items?.length) return openSub(i, viaKeyboard);
    e.onSelect?.();
    const checkable = roleOf(e) !== "menuitem";
    if (e.closeOnSelect ?? (checkable ? closeOnCheck : true)) onCloseAll(true);
  }

  function runTypeahead(key: string) {
    const ta = typeahead.current;
    if (ta.timer) clearTimeout(ta.timer);
    ta.buffer += key.toLowerCase();
    ta.timer = setTimeout(() => {
      ta.buffer = "";
    }, 500);
    const pos = enabled.indexOf(active);
    // A single repeated letter cycles through matches; a longer buffer refines from the current row.
    const repeat = ta.buffer.length > 1 && ta.buffer.split("").every((c) => c === ta.buffer[0]);
    const needle = repeat ? ta.buffer[0] : ta.buffer;
    const start = needle.length === 1 ? pos + 1 : Math.max(pos, 0);
    for (let k = 0; k < enabled.length; k++) {
      const idx = enabled[(start + k) % enabled.length];
      const e = entries[idx];
      if (isMenuItem(e) && e.label.toLowerCase().startsWith(needle)) {
        focusItem(idx);
        return;
      }
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const pos = enabled.indexOf(active);
    switch (e.key) {
      case "ArrowDown":
        if (!enabled.length) return;
        focusItem(enabled[(pos + 1) % enabled.length]);
        break;
      case "ArrowUp":
        if (pos <= 0 && onExitTop) {
          setActive(-1);
          onExitTop();
          break;
        }
        if (!enabled.length) return;
        focusItem(enabled[pos <= 0 ? enabled.length - 1 : pos - 1]);
        break;
      case "Home":
        if (enabled.length) focusItem(enabled[0]);
        break;
      case "End":
        if (enabled.length) focusItem(enabled[enabled.length - 1]);
        break;
      case "ArrowRight": {
        const entry = entries[active];
        if (entry && isMenuItem(entry) && entry.items?.length) openSub(active, true);
        else return;
        break;
      }
      case "ArrowLeft":
        if (!onBack) return;
        onBack();
        break;
      case "Escape":
        if (onBack) onBack();
        else onCloseAll(true);
        break;
      case "Enter":
      case " ":
        if (active >= 0) activate(active, true);
        break;
      case "Tab":
        onCloseAll(false);
        break;
      default: {
        const printable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
        if (onPrintableKey && (printable || e.key === "Backspace")) onPrintableKey(e.key);
        else if (printable && e.key !== " ") runTypeahead(e.key);
        else return;
      }
    }
    e.preventDefault();
    e.stopPropagation();
  }

  let itemCount = 0;

  function renderItem(entry: MenuItemEntry, i: number) {
    const n = itemCount++;
    const on = active === i;
    const hasSub = !!entry.items?.length;
    const subOpen = sub?.index === i;
    const role = roleOf(entry);
    const checkable = role !== "menuitem";
    const indicator =
      role === "menuitemradio" ? (
        <span className={cn("grid size-3.5 place-items-center rounded-full border", entry.checked ? "border-volt-ink" : "border-border-strong")}>
          {entry.checked && <span className="size-1.5 rounded-full bg-volt-ink" />}
        </span>
      ) : entry.type === "checkbox" ? (
        <span
          className={cn(
            "grid size-3.5 place-items-center rounded-[4px] border",
            entry.checked ? "border-volt bg-volt text-on-volt" : "border-border-strong",
          )}
        >
          {entry.checked && <Check className="!size-2.5" strokeWidth={3.5} />}
        </span>
      ) : entry.checked ? (
        <Check className="text-volt-ink" strokeWidth={2.5} />
      ) : null;
    // Checkable rows with their own icon keep it and move the indicator to the end.
    const leading = checkable && !entry.icon ? indicator : entry.icon;
    const trailingIndicator = checkable && entry.icon ? indicator : null;
    return (
      <motion.div
        key={`${entry.label}-${i}`}
        ref={(el) => {
          itemRefs.current[i] = el;
        }}
        role={role}
        aria-checked={checkable ? !!entry.checked : undefined}
        aria-disabled={entry.disabled || undefined}
        aria-haspopup={hasSub ? "menu" : undefined}
        aria-expanded={hasSub ? subOpen : undefined}
        data-menu-item=""
        tabIndex={-1}
        initial={reduce ? false : { opacity: 0, y: -4 }}
        animate={{ opacity: entry.disabled ? 0.4 : 1, y: 0 }}
        transition={{ delay: reduce ? 0 : 0.02 + n * 0.018, duration: 0.18 }}
        onFocus={() => {
          if (!entry.disabled && active !== i) setActive(i);
        }}
        onPointerMove={() => {
          if (entry.disabled || active === i) return;
          focusItem(i);
          if (hoverTimer.current) clearTimeout(hoverTimer.current);
          hoverTimer.current = setTimeout(() => {
            if (hasSub) openSub(i, false);
            else setSub(null);
          }, 110);
        }}
        aria-label={entry.description ? undefined : entry.label}
        onClick={(e) => {
          e.stopPropagation();
          activate(i, false);
        }}
        className={cn(
          "relative flex cursor-default select-none gap-2.5 rounded-sm px-2.5 outline-none",
          entry.description ? "items-start py-2" : "h-8 items-center",
          entry.danger && !entry.disabled ? "text-danger" : "text-ink",
        )}
      >
        {(on || subOpen) && (
          <motion.span
            layoutId={`${uid}-highlight`}
            aria-hidden
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 600, damping: 40 }}
            className={cn("absolute inset-0 rounded-sm", entry.danger ? "bg-danger/12" : "bg-surface-hover")}
          />
        )}
        {(leading || !entry.description) && (
          <span
            aria-hidden
            className={cn(
              "relative grid shrink-0 place-items-center text-ink-muted [&>svg]:size-4",
              entry.description ? "mt-px min-h-4 min-w-4" : "size-4",
              entry.danger && "text-danger",
            )}
          >
            {leading}
          </span>
        )}
        {entry.description ? (
          <span className="relative min-w-0 flex-1">
            <span className={cn("block truncate font-medium leading-5", entry.danger && "text-danger")}>{entry.label}</span>
            <span className="block text-[12px] leading-4 text-ink-subtle">{entry.description}</span>
          </span>
        ) : (
          <span className={cn("relative flex-1 truncate", entry.danger && "text-danger")}>{entry.label}</span>
        )}
        {entry.badge && <span className={cn("relative flex shrink-0", entry.description && "mt-0.5")}>{entry.badge}</span>}
        {entry.shortcut && !hasSub && (
          <kbd className={cn("relative font-sans text-[11.5px] tracking-[0.5px] text-ink-subtle", entry.description && "mt-0.5")}>{entry.shortcut}</kbd>
        )}
        {trailingIndicator && (
          <span aria-hidden className="relative grid size-4 shrink-0 place-items-center [&>svg]:size-4">
            {trailingIndicator}
          </span>
        )}
        {hasSub && <ChevronRight aria-hidden className="relative size-3.5 text-ink-subtle" />}
        <AnimatePresence>
          {subOpen && entry.items && (
            <MenuPanel
              key="sub"
              entries={entry.items}
              level={level + 1}
              placement={{ kind: "sub", flip: sub.flip }}
              focusOnOpen={sub.keyboard ? "first" : "none"}
              focusToken={sub.token}
              onCloseAll={onCloseAll}
              closeOnCheck={closeOnCheck}
              onBack={() => {
                setSub(null);
                focusItem(i);
              }}
              menuClassName={menuClassName}
            />
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // Rows after a section label are wrapped in role="group" labelled by it.
  const nodes: React.ReactNode[] = [];
  const open: { group: { key: string; labelId: string; children: React.ReactNode[] } | null } = { group: null };
  const flush = () => {
    const g = open.group;
    if (!g) return;
    nodes.push(
      <div key={g.key} role="group" aria-labelledby={g.labelId}>
        {g.children}
      </div>,
    );
    open.group = null;
  };
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.type === "separator") {
      flush();
      nodes.push(<div key={`sep-${i}`} role="separator" className="mx-2 my-1 h-px bg-border" />);
    } else if (entry.type === "label") {
      flush();
      const labelId = `${uid}-l${i}`;
      open.group = {
        key: `group-${i}`,
        labelId,
        children: [
          <div key="label" id={labelId} className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-[0.5px] text-ink-subtle">
            {entry.label}
          </div>,
        ],
      };
    } else if (isMenuItem(entry)) {
      const node = renderItem(entry, i);
      if (open.group) open.group.children.push(node);
      else nodes.push(node);
    }
  }
  flush();

  const isRoot = placement.kind !== "sub";
  const flip = placement.kind === "sub" && placement.flip;

  return (
    <motion.div
      ref={surfaceRef}
      onPointerLeave={() => {
        if (!sub) setActive(-1);
      }}
      initial={
        reduce
          ? { opacity: 0 }
          : level === 0
            ? { opacity: 0, scale: placement.kind === "anchor" ? 0.94 : 0.96, filter: "blur(4px)" }
            : { opacity: 0, x: flip ? 8 : -8, filter: "blur(4px)" }
      }
      animate={{ opacity: 1, scale: 1, x: 0, filter: "blur(0px)" }}
      exit={
        reduce
          ? { opacity: 0, transition: { duration: 0.1 } }
          : level === 0
            ? { opacity: 0, scale: 0.97, filter: "blur(2px)", transition: { duration: 0.12 } }
            : { opacity: 0, x: flip ? 6 : -6, transition: { duration: 0.12 } }
      }
      transition={{ type: "spring", stiffness: 520, damping: 34, opacity: { duration: 0.14 } }}
      style={
        placement.kind === "point"
          ? { position: "fixed", left: placement.x, top: placement.y }
          : placement.kind === "anchor"
            ? { position: "fixed", left: 0, top: 0, ...(width ? { width, maxWidth: "calc(100vw - 16px)" } : null) }
            : { position: "absolute", top: -5, ...(flip ? { right: "calc(100% + 4px)" } : { left: "calc(100% + 4px)" }) }
      }
      className={cn(
        "z-[100] min-w-[216px] rounded-md border border-border bg-glass p-1 text-[13px] text-ink shadow-lg outline-none backdrop-blur-xl backdrop-saturate-150",
        isRoot && className,
        menuClassName,
      )}
    >
      {isRoot && header}
      <div
        ref={listRef}
        id={menuId}
        role="menu"
        aria-orientation="vertical"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={cn("outline-none", scrollable && "max-h-[min(26rem,var(--menu-available-height,26rem))] overflow-y-auto overscroll-contain")}
      >
        {nodes}
        {!enabled.length && !entries.some(isMenuItem) && empty}
      </div>
      {isRoot && footer}
    </motion.div>
  );
}
