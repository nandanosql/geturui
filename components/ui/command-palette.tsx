"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CornerDownLeft, Search, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CommandItem {
  id: string;
  label: string;
  /** Heading the item is listed under. Items without one go under "Results". */
  group?: string;
  icon?: React.ReactNode;
  /** Keys shown on the right, e.g. ["⌘", "B"] or "G P". */
  shortcut?: string | string[];
  /** Extra words that should match, e.g. synonyms. */
  keywords?: string[];
  /** Secondary text shown after the label. */
  hint?: string;
  disabled?: boolean;
  onSelect: () => void;
}

export interface CommandPaletteProps {
  items: CommandItem[];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  placeholder?: string;
  /** Letter that toggles the palette with ⌘ / Ctrl. `false` disables the global hotkey. */
  hotkey?: string | false;
  /** Close after an item is chosen. */
  closeOnSelect?: boolean;
  /** Shown when nothing matches. Receives the query. */
  empty?: (query: string) => React.ReactNode;
  className?: string;
}

export interface FuzzyMatch {
  score: number;
  /** Indices of matched characters in the label (empty when the match came from keywords). */
  indices: number[];
}

/**
 * Subsequence match with scoring: rewards consecutive runs, word starts and an early first hit,
 * penalises gaps. Returns null when `query` is not a subsequence of `text`.
 */
export function fuzzyMatch(query: string, text: string): FuzzyMatch | null {
  const q = query.toLowerCase().replace(/\s+/g, "");
  if (!q) return { score: 0, indices: [] };
  const t = text.toLowerCase();
  const a = scan(q, t, true);
  const b = scan(q, t, false);
  if (!a && !b) return null;
  const sa = a ? scoreOf(a, q, t) : -Infinity;
  const sb = b ? scoreOf(b, q, t) : -Infinity;
  return sa >= sb ? { score: sa, indices: a! } : { score: sb, indices: b! };
}

const isBoundary = (t: string, i: number) => i === 0 || /[\s\-_/.:]/.test(t[i - 1]);

/** Greedy subsequence scan. With `preferBoundary`, a word-start hit beats an earlier mid-word one. */
function scan(q: string, t: string, preferBoundary: boolean): number[] | null {
  const out: number[] = [];
  let from = 0;
  for (const ch of q) {
    const prev = out.length ? out[out.length - 1] : -2;
    let hit = -1;
    if (t[prev + 1] === ch && prev >= 0) hit = prev + 1;
    else {
      const first = t.indexOf(ch, from);
      if (first === -1) return null;
      hit = first;
      if (preferBoundary && !isBoundary(t, first)) {
        for (let j = first + 1; j < t.length; j++) {
          if (t[j] === ch && isBoundary(t, j)) {
            hit = j;
            break;
          }
        }
      }
    }
    out.push(hit);
    from = hit + 1;
  }
  return out;
}

function scoreOf(indices: number[], q: string, t: string) {
  let score = 0;
  let prev = -2;
  for (const i of indices) {
    score += 1;
    if (i === prev + 1) score += 4;
    if (isBoundary(t, i)) score += 3;
    if (i === 0) score += 2;
    if (prev >= 0) score -= Math.min(4, i - prev - 1) * 0.5;
    prev = i;
  }
  if (t.startsWith(q)) score += 6;
  return score - (t.length - q.length) * 0.02;
}

function matchItem(query: string, item: CommandItem): FuzzyMatch | null {
  const label = fuzzyMatch(query, item.label);
  let best = label;
  for (const k of item.keywords ?? []) {
    const m = fuzzyMatch(query, k);
    if (m && (!best || m.score - 1 > best.score)) best = { score: m.score - 1, indices: [] };
  }
  return best;
}

const subscribe = () => () => {};

/** ⌘K command palette on glass: fuzzy filter, grouped results and a spring highlight that glides between rows. */
export function CommandPalette({
  items,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  placeholder = "Type a command or search",
  hotkey = "k",
  closeOnSelect = true,
  empty,
  className,
}: CommandPaletteProps) {
  const [inner, setInner] = React.useState(defaultOpen);
  const open = openProp ?? inner;
  const mounted = React.useSyncExternalStore(subscribe, () => true, () => false);

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setInner(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange],
  );

  React.useEffect(() => {
    if (!hotkey) return;
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || !(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      if (e.key.toLowerCase() !== (hotkey as string).toLowerCase()) return;
      e.preventDefault();
      setOpen(!open);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [hotkey, open, setOpen]);

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <PaletteDialog
          key="palette"
          items={items}
          placeholder={placeholder}
          closeOnSelect={closeOnSelect}
          empty={empty}
          className={className}
          onClose={() => setOpen(false)}
        />
      )}
    </AnimatePresence>,
    document.body,
  );
}

interface PaletteDialogProps {
  items: CommandItem[];
  placeholder: string;
  closeOnSelect: boolean;
  empty?: (query: string) => React.ReactNode;
  className?: string;
  onClose: () => void;
}

interface Row {
  item: CommandItem;
  match: FuzzyMatch;
}

function PaletteDialog({ items, placeholder, closeOnSelect, empty, className, onClose }: PaletteDialogProps) {
  const uid = React.useId();
  const reduce = useReducedMotion();
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const keyboard = React.useRef(false);

  const groups = React.useMemo(() => {
    const rows: Row[] = [];
    for (const item of items) {
      const match = query ? matchItem(query, item) : { score: 0, indices: [] };
      if (match) rows.push({ item, match });
    }
    const map = new Map<string, Row[]>();
    for (const r of rows) {
      const g = r.item.group ?? "Results";
      const list = map.get(g) ?? [];
      list.push(r);
      map.set(g, list);
    }
    const out = Array.from(map, ([name, list]) => ({
      name,
      rows: query ? [...list].sort((a, b) => b.match.score - a.match.score) : list,
    }));
    if (query) out.sort((a, b) => b.rows[0].match.score - a.rows[0].match.score);
    return out;
  }, [items, query]);

  const flat = React.useMemo(() => groups.flatMap((g) => g.rows), [groups]);
  const activeRow = flat[Math.min(active, flat.length - 1)];
  const optionId = (id: string) => `${uid}-opt-${id}`;

  // Restore focus to whatever opened the palette.
  React.useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      cancelAnimationFrame(raf);
      prev?.focus?.({ preventScroll: true });
    };
  }, []);

  // Keep the keyboard-selected row in view.
  React.useEffect(() => {
    if (!keyboard.current || !activeRow) return;
    document.getElementById(optionId(activeRow.item.id))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRow]);

  function choose(row: Row | undefined) {
    if (!row || row.item.disabled) return;
    row.item.onSelect();
    if (closeOnSelect) onClose();
  }

  function move(delta: number) {
    if (!flat.length) return;
    keyboard.current = true;
    let i = Math.min(active, flat.length - 1);
    for (let n = 0; n < flat.length; n++) {
      i = (i + delta + flat.length) % flat.length;
      if (!flat[i].item.disabled) break;
    }
    setActive(i);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || (e.ctrlKey && e.key === "n")) {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp" || (e.ctrlKey && e.key === "p")) {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Home" && flat.length) {
      e.preventDefault();
      keyboard.current = true;
      setActive(0);
    } else if (e.key === "End" && flat.length) {
      e.preventDefault();
      keyboard.current = true;
      setActive(flat.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(activeRow);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (query) {
        setQuery("");
        setActive(0);
      } else onClose();
    } else if (e.key === "Tab") {
      e.preventDefault();
      inputRef.current?.focus();
    }
  }

  let index = -1;
  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[14vh]" onKeyDown={onKeyDown}>
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        initial={{ opacity: 0, scale: reduce ? 1 : 0.96, y: reduce ? 0 : -8, filter: reduce ? "blur(0px)" : "blur(8px)" }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: reduce ? 1 : 0.97, y: reduce ? 0 : -4, filter: reduce ? "blur(0px)" : "blur(6px)", transition: { duration: 0.14 } }}
        transition={{ type: "spring", stiffness: 420, damping: 32 }}
        className={cn(
          "glass relative flex max-h-[min(520px,72vh)] w-full max-w-[580px] flex-col overflow-hidden rounded-[20px] border border-border text-ink shadow-lg",
          className,
        )}
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-[18px] shrink-0 text-ink-subtle" aria-hidden />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls={`${uid}-list`}
            aria-autocomplete="list"
            aria-activedescendant={activeRow ? optionId(activeRow.item.id) : undefined}
            aria-label={placeholder}
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder={placeholder}
            className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-subtle"
          />
          <kbd className="hidden h-6 items-center rounded-md border border-border bg-surface px-1.5 font-mono text-[11px] text-ink-muted sm:inline-flex">
            esc
          </kbd>
        </div>

        <div
          ref={listRef}
          id={`${uid}-list`}
          role="listbox"
          aria-label="Commands"
          className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-2"
          onPointerMove={() => {
            keyboard.current = false;
          }}
        >
          {flat.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.24 }}
              role="status"
              className="grid place-items-center gap-2 px-6 py-10 text-center"
            >
              {empty ? (
                empty(query)
              ) : (
                <>
                  <span className="grid size-10 place-items-center rounded-[14px] border border-border bg-surface text-ink-subtle">
                    <SearchX className="size-[18px]" aria-hidden />
                  </span>
                  <p className="text-sm font-medium text-ink">No results for “{query}”</p>
                  <p className="text-[13px] text-ink-muted">Try a shorter word, or search by group name.</p>
                </>
              )}
            </motion.div>
          ) : (
            groups.map((g) => (
              <div key={g.name} role="group" aria-labelledby={`${uid}-g-${g.name}`} className="mb-1 last:mb-0">
                <div id={`${uid}-g-${g.name}`} className="px-3 pb-1.5 pt-2.5 text-[11px] font-semibold uppercase tracking-[0.6px] text-ink-subtle">
                  {g.name}
                </div>
                {g.rows.map((row) => {
                  index += 1;
                  const i = index;
                  const on = activeRow?.item.id === row.item.id;
                  const keys = typeof row.item.shortcut === "string" ? row.item.shortcut.split(" ") : row.item.shortcut;
                  return (
                    <div
                      key={row.item.id}
                      id={optionId(row.item.id)}
                      role="option"
                      aria-selected={on}
                      aria-disabled={row.item.disabled || undefined}
                      onPointerMove={() => {
                        if (!keyboard.current && active !== i && !row.item.disabled) setActive(i);
                      }}
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={() => choose(row)}
                      className={cn(
                        "relative flex h-11 cursor-pointer select-none items-center gap-3 rounded-[12px] px-3 text-sm",
                        row.item.disabled && "cursor-not-allowed opacity-45",
                      )}
                    >
                      {on && (
                        <motion.span
                          layoutId={`${uid}-active`}
                          aria-hidden
                          className="absolute inset-0 rounded-[12px] bg-surface-hover ring-1 ring-border"
                          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 38 }}
                        />
                      )}
                      {on && (
                        <motion.span
                          layoutId={`${uid}-bar`}
                          aria-hidden
                          className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-volt"
                          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 38 }}
                        />
                      )}
                      {row.item.icon && (
                        <span className={cn("relative grid size-5 shrink-0 place-items-center transition-colors [&>svg]:size-4", on ? "text-ink" : "text-ink-subtle")}>
                          {row.item.icon}
                        </span>
                      )}
                      <span className="relative min-w-0 flex-1 truncate">
                        <Highlight text={row.item.label} indices={row.match.indices} on={on} />
                        {row.item.hint && <span className="ml-2 text-[13px] text-ink-subtle">{row.item.hint}</span>}
                      </span>
                      {keys && keys.length > 0 && (
                        <span className="relative flex shrink-0 items-center gap-1">
                          {keys.map((k, n) => (
                            <kbd
                              key={n}
                              className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-border bg-surface px-1 font-mono text-[11px] text-ink-muted"
                            >
                              {k}
                            </kbd>
                          ))}
                        </span>
                      )}
                      {on && !keys?.length && <CornerDownLeft aria-hidden className="relative size-3.5 shrink-0 text-ink-subtle" />}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-border px-4 py-2.5 text-[12px] text-ink-subtle">
          <span className="inline-flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> to navigate
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Kbd>↵</Kbd> to select
          </span>
          <span className="ml-auto tabular-nums" aria-live="polite">
            {flat.length} {flat.length === 1 ? "result" : "results"}
          </span>
        </div>
      </motion.div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-border bg-surface px-1 font-mono text-[11px] text-ink-muted">
      {children}
    </kbd>
  );
}

function Highlight({ text, indices, on }: { text: string; indices: number[]; on: boolean }) {
  const base = on ? "text-ink" : "text-ink-muted";
  if (!indices.length) return <span className={base}>{text}</span>;
  const set = new Set(indices);
  return (
    <span className={base} aria-label={text}>
      {text.split("").map((c, i) =>
        set.has(i) ? (
          <span key={i} aria-hidden className="font-semibold text-volt-ink">
            {c}
          </span>
        ) : (
          <span key={i} aria-hidden>
            {c}
          </span>
        ),
      )}
    </span>
  );
}
