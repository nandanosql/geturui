"use client";

import * as React from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ engine */

export type PageItem = { type: "page"; page: number } | { type: "ellipsis"; position: "start" | "end" };

export interface GetPageItemsOptions {
  /** Current page, 1-based. Clamped into range. */
  page: number;
  /** Total number of pages. */
  count: number;
  /** Pages shown on each side of the current page. */
  siblings?: number;
  /** Pages always shown at the start and end. */
  boundaries?: number;
}

const range = (from: number, to: number) => (to < from ? [] : Array.from({ length: to - from + 1 }, (_, i) => from + i));

/**
 * Pure page-window engine. Returns a stable-length list (once ellipses kick in) of pages and ellipses:
 * boundaries at both ends, `siblings` around the current page, and an ellipsis only where it hides 2+ pages.
 */
export function getPageItems({ page, count, siblings = 1, boundaries = 1 }: GetPageItemsOptions): PageItem[] {
  const total = Math.max(0, Math.floor(count));
  if (total === 0) return [];
  const sib = Math.max(0, Math.floor(siblings));
  const bnd = Math.max(0, Math.floor(boundaries));
  const current = Math.min(Math.max(1, Math.floor(page)), total);

  // boundaries ×2 + siblings ×2 + current + two ellipsis slots
  const slots = bnd * 2 + sib * 2 + 3;
  if (total <= slots) return range(1, total).map((p) => ({ type: "page", page: p }));

  const start = range(1, bnd);
  const end = range(total - bnd + 1, total);
  // Keep the sibling window the same width when it presses against either end.
  const winStart = Math.max(Math.min(current - sib, total - bnd - sib * 2 - 1), bnd + 2);
  const winEnd = Math.min(Math.max(current + sib, bnd + sib * 2 + 2), total - bnd - 1);

  const items: PageItem[] = start.map((p) => ({ type: "page", page: p }));
  if (winStart > bnd + 2) items.push({ type: "ellipsis", position: "start" });
  else if (bnd + 1 < total - bnd) items.push({ type: "page", page: bnd + 1 });
  for (const p of range(winStart, winEnd)) items.push({ type: "page", page: p });
  if (winEnd < total - bnd - 1) items.push({ type: "ellipsis", position: "end" });
  else if (total - bnd > bnd) items.push({ type: "page", page: total - bnd });
  for (const p of end) items.push({ type: "page", page: p });
  return items;
}

/* ------------------------------------------------------------------ shared */

function usePage(count: number, page?: number, defaultPage = 1, onPageChange?: (page: number) => void) {
  const [inner, setInner] = React.useState(defaultPage);
  const raw = page ?? inner;
  const value = Math.min(Math.max(1, raw), Math.max(1, count));
  const set = React.useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(1, next), Math.max(1, count));
      if (page === undefined) setInner(clamped);
      onPageChange?.(clamped);
    },
    [count, page, onPageChange],
  );
  return [value, set] as const;
}

interface PageStateProps {
  /** Total number of pages. */
  count: number;
  /** Current page (1-based), controlled. */
  page?: number;
  defaultPage?: number;
  onPageChange?: (page: number) => void;
}

const sizes = {
  sm: { item: "h-8 min-w-8 text-[13px]", icon: "size-8", glyph: "size-3.5" },
  md: { item: "h-9 min-w-9 text-sm", icon: "size-9", glyph: "size-4" },
  lg: { item: "h-10 min-w-10 text-[15px]", icon: "size-10", glyph: "size-4" },
} as const;

const focus = "outline-none focus-visible:shadow-[var(--focus-ring)]";
const arrowBtn =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full text-ink-muted transition-colors duration-150 hover:bg-surface-hover hover:text-ink disabled:pointer-events-none disabled:opacity-40";

/* ------------------------------------------------------------------ numbered */

export interface PaginationProps extends PageStateProps, Omit<React.HTMLAttributes<HTMLElement>, "onChange"> {
  siblings?: number;
  boundaries?: number;
  size?: "sm" | "md" | "lg";
  shape?: "round" | "square";
  /** Show "Previous" / "Next" text beside the arrows (from the sm breakpoint up). */
  showLabels?: boolean;
  /** Below the sm breakpoint, swap the numbers for "Page x of y". */
  responsive?: boolean;
  /** Accessible name of the nav landmark. */
  label?: string;
}

/** Numbered pagination with prev/next, smart ellipses and a volt marker that glides to the active page. */
export function Pagination({
  count,
  page: pageProp,
  defaultPage,
  onPageChange,
  siblings = 1,
  boundaries = 1,
  size = "md",
  shape = "round",
  showLabels = true,
  responsive = true,
  label = "Pagination",
  className,
  ...props
}: PaginationProps) {
  const reduce = useReducedMotion();
  const groupId = React.useId();
  const [page, setPage] = usePage(count, pageProp, defaultPage, onPageChange);
  const items = getPageItems({ page, count, siblings, boundaries });
  const s = sizes[size];
  const radius = shape === "round" ? "rounded-full" : "rounded-sm";
  const spring = reduce ? { duration: 0 } : ({ type: "spring", stiffness: 460, damping: 34 } as const);

  return (
    <nav aria-label={label} className={cn("flex w-full items-center justify-between gap-2", className)} {...props}>
      <button
        type="button"
        onClick={() => setPage(page - 1)}
        disabled={page <= 1}
        aria-label="Go to previous page"
        className={cn(arrowBtn, focus, s.item, showLabels ? "px-2.5 sm:pr-3.5" : "", radius)}
      >
        <ArrowLeft aria-hidden className={s.glyph} />
        {showLabels && <span className="hidden font-medium sm:inline">Previous</span>}
      </button>

      <LayoutGroup id={groupId}>
        <ul className={cn("flex items-center gap-1", responsive && "hidden sm:flex")}>
          {items.map((item) => (
            <motion.li key={item.type === "page" ? `p${item.page}` : `e-${item.position}`} layout="position" transition={spring}>
              {item.type === "ellipsis" ? (
                <span aria-hidden className={cn("inline-flex items-center justify-center text-ink-subtle", s.item)}>
                  <MoreHorizontal className={s.glyph} />
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setPage(item.page)}
                  aria-current={item.page === page ? "page" : undefined}
                  aria-label={`Page ${item.page}`}
                  className={cn(
                    "relative inline-flex items-center justify-center px-2 font-mono tabular-nums transition-colors duration-150",
                    focus,
                    s.item,
                    radius,
                    item.page === page ? "font-semibold text-on-volt" : "text-ink-muted hover:bg-surface-hover hover:text-ink",
                  )}
                >
                  {item.page === page && (
                    <motion.span layoutId="page-marker" aria-hidden className={cn("absolute inset-0 -z-0 bg-volt", radius)} transition={spring} />
                  )}
                  <span className="relative">{item.page}</span>
                </button>
              )}
            </motion.li>
          ))}
        </ul>
      </LayoutGroup>

      {responsive && (
        <p className="text-sm text-ink-muted sm:hidden" aria-live="polite">
          Page <span className="font-mono font-semibold text-ink">{page}</span> of <span className="font-mono">{count}</span>
        </p>
      )}

      <button
        type="button"
        onClick={() => setPage(page + 1)}
        disabled={page >= count}
        aria-label="Go to next page"
        className={cn(arrowBtn, focus, s.item, showLabels ? "px-2.5 sm:pl-3.5" : "", radius)}
      >
        {showLabels && <span className="hidden font-medium sm:inline">Next</span>}
        <ArrowRight aria-hidden className={s.glyph} />
      </button>
    </nav>
  );
}

/* ------------------------------------------------------------------ compact */

export interface PaginationCompactProps extends PageStateProps, Omit<React.HTMLAttributes<HTMLElement>, "onChange"> {
  size?: "sm" | "md" | "lg";
  /** Let people type a page number. */
  editable?: boolean;
  label?: string;
}

/** "Page 3 of 12" between two arrow buttons; the number blur-swaps, and can be an editable field. */
export function PaginationCompact({ count, page: pageProp, defaultPage, onPageChange, size = "md", editable, label = "Pagination", className, ...props }: PaginationCompactProps) {
  const reduce = useReducedMotion();
  const [page, setPage] = usePage(count, pageProp, defaultPage, onPageChange);
  const [draft, setDraft] = React.useState<string | null>(null);
  const s = sizes[size];
  const [dir, setDir] = React.useState(1);

  const go = (n: number) => {
    setDir(n > page ? 1 : -1);
    setPage(n);
  };
  const commit = () => {
    if (draft === null) return;
    const n = parseInt(draft, 10);
    if (!Number.isNaN(n)) go(n);
    setDraft(null);
  };

  return (
    <nav aria-label={label} className={cn("inline-flex items-center gap-1", className)} {...props}>
      <button type="button" onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Go to previous page" className={cn(arrowBtn, focus, s.icon)}>
        <ChevronLeft aria-hidden className={s.glyph} />
      </button>
      <span className={cn("inline-flex items-center gap-1.5 px-1.5 text-ink-muted", s.item)}>
        Page
        {editable ? (
          <input
            inputMode="numeric"
            aria-label={`Page number, 1 to ${count}`}
            value={draft ?? String(page)}
            onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setDraft(null);
              if (e.key === "ArrowUp") {
                e.preventDefault();
                go(page + 1);
              }
              if (e.key === "ArrowDown") {
                e.preventDefault();
                go(page - 1);
              }
            }}
            style={{ width: `calc(${Math.max(String(count).length, (draft ?? String(page)).length)}ch + 18px)` }}
            className={cn(
              "h-[80%] rounded-xs border border-border-strong bg-surface-sunken text-center font-mono font-semibold text-ink tabular-nums",
              "outline-none focus-visible:border-volt-ink focus-visible:shadow-[var(--focus-ring)]",
            )}
          />
        ) : (
          <span className="relative inline-flex overflow-hidden font-mono font-semibold tabular-nums text-ink" aria-live="polite">
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <motion.span
                key={page}
                custom={dir}
                variants={{
                  enter: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, y: d * 10, filter: "blur(4px)" }),
                  center: { opacity: 1, y: 0, filter: "blur(0px)" },
                  exit: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, y: d * -10, filter: "blur(4px)" }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              >
                {page}
              </motion.span>
            </AnimatePresence>
          </span>
        )}
        of <span className="font-mono tabular-nums">{count}</span>
      </span>
      <button type="button" onClick={() => go(page + 1)} disabled={page >= count} aria-label="Go to next page" className={cn(arrowBtn, focus, s.icon)}>
        <ChevronRight aria-hidden className={s.glyph} />
      </button>
    </nav>
  );
}

/* ------------------------------------------------------------------ card footer */

export interface PaginationFooterProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Total number of records. */
  total: number;
  page?: number;
  defaultPage?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  defaultPageSize?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  /** Noun for the records, plural. */
  noun?: string;
}

/** Table/card footer: "Showing 21–30 of 284", a rows-per-page select and compact page arrows. */
export function PaginationFooter({
  total,
  page: pageProp,
  defaultPage,
  onPageChange,
  pageSize: pageSizeProp,
  defaultPageSize = 10,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  noun = "results",
  className,
  ...props
}: PaginationFooterProps) {
  const selectId = React.useId();
  const [innerSize, setInnerSize] = React.useState(defaultPageSize);
  const pageSize = pageSizeProp ?? innerSize;
  const count = Math.max(1, Math.ceil(total / pageSize));
  const [page, setPage] = usePage(count, pageProp, defaultPage, onPageChange);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const fmt = (n: number) => n.toLocaleString("en-US");

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border px-4 py-3", className)} {...props}>
      <p className="text-[13px] text-ink-muted" aria-live="polite">
        Showing <span className="font-mono font-medium text-ink tabular-nums">{fmt(from)}–{fmt(to)}</span> of{" "}
        <span className="font-mono tabular-nums">{fmt(total)}</span> {noun}
      </p>
      <div className="flex items-center gap-3">
        <label htmlFor={selectId} className="flex items-center gap-2 text-[13px] text-ink-muted">
          <span className="hidden sm:inline">Rows per page</span>
          <span className="sm:hidden">Rows</span>
          <select
            id={selectId}
            value={pageSize}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (pageSizeProp === undefined) setInnerSize(next);
              onPageSizeChange?.(next);
              // Keep the first visible record on screen.
              setPage(Math.floor(((page - 1) * pageSize) / next) + 1);
            }}
            className={cn("h-8 rounded-xs border border-border-strong bg-surface-sunken px-2 font-mono text-[13px] text-ink", focus)}
          >
            {pageSizeOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <PaginationCompact count={count} page={page} onPageChange={setPage} size="sm" label={`${noun} pages`} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ dots */

export interface PaginationDotsProps extends PageStateProps, Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  size?: "sm" | "md";
  /** "volt" for product surfaces, "contrast" for dots over imagery. */
  tone?: "volt" | "contrast";
  /** Sit the dots in a frosted pill (for imagery). */
  framed?: boolean;
  /** Accessible name; each dot reads "Slide n of N". */
  label?: string;
  itemLabel?: (index: number, count: number) => string;
}

/** Carousel dots: the active one stretches into a capsule that glides between positions. */
export function PaginationDots({
  count,
  page: pageProp,
  defaultPage,
  onPageChange,
  size = "md",
  tone = "volt",
  framed,
  label = "Slides",
  itemLabel = (i, n) => `Slide ${i} of ${n}`,
  className,
  ...props
}: PaginationDotsProps) {
  const reduce = useReducedMotion();
  const groupId = React.useId();
  const [page, setPage] = usePage(count, pageProp, defaultPage, onPageChange);
  const dot = size === "sm" ? "h-1.5" : "h-2";
  const spring = reduce ? { duration: 0 } : ({ type: "spring", stiffness: 420, damping: 32 } as const);
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex items-center", framed && "rounded-full bg-glass px-2 py-0.5 shadow-sm backdrop-blur-md", className)}
      onKeyDown={(e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        const next = e.key === "ArrowRight" ? Math.min(count, page + 1) : Math.max(1, page - 1);
        setPage(next);
        refs.current[next - 1]?.focus();
      }}
      {...props}
    >
      <LayoutGroup id={groupId}>
        {Array.from({ length: count }, (_, i) => {
          const n = i + 1;
          const active = n === page;
          return (
            <motion.button
              key={n}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              layout
              transition={spring}
              onClick={() => setPage(n)}
              aria-label={itemLabel(n, count)}
              aria-current={active ? "true" : undefined}
              tabIndex={active ? 0 : -1}
              className={cn("group/dot relative flex h-6 items-center justify-center rounded-full", focus, active ? (size === "sm" ? "w-7" : "w-9") : "w-4")}
            >
              <span
                aria-hidden
                className={cn(
                  "w-full max-w-2 rounded-full transition-colors duration-150",
                  dot,
                  size === "sm" && "max-w-1.5",
                  tone === "volt" ? "bg-border-strong group-hover/dot:bg-ink-subtle" : "bg-ink/35 group-hover/dot:bg-ink/60",
                  active && "opacity-0",
                )}
              />
              {active && (
                <motion.span
                  layoutId="dot-marker"
                  aria-hidden
                  transition={spring}
                  className={cn("absolute inset-x-1.5 rounded-full", dot, tone === "volt" ? "bg-volt" : "bg-ink")}
                />
              )}
            </motion.button>
          );
        })}
      </LayoutGroup>
    </div>
  );
}
