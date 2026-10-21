"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export type TooltipSide = "top" | "right" | "bottom" | "left";
export type TooltipAlign = "start" | "center" | "end";

/** Shared timing for a group of tooltips: once one has been open, neighbours open instantly. Holds no render state. */
class TooltipGroup {
  delay?: number;
  closeDelay?: number;
  /** Window after a tooltip closes during which the next one skips its delay, ms. */
  skipDelay = 300;
  private lastClosedAt = 0;
  private active: (() => void) | null = null;

  configure(delay: number | undefined, closeDelay: number | undefined, skipDelay: number) {
    this.delay = delay;
    this.closeDelay = closeDelay;
    this.skipDelay = skipDelay;
  }
  /** True while another tooltip is open or one closed moments ago. */
  isWarm() {
    return this.active !== null || Date.now() - this.lastClosedAt < this.skipDelay;
  }
  /** Close whichever other tooltip is open, then mark `close` as the open one. */
  activate(close: () => void) {
    if (this.active && this.active !== close) this.active();
    this.active = close;
  }
  release(close: () => void) {
    if (this.active === close) this.active = null;
    this.lastClosedAt = Date.now();
  }
}

// Fallback group for tooltips rendered without a provider.
const defaultGroup = new TooltipGroup();
const TooltipGroupContext = React.createContext<TooltipGroup | null>(null);

export interface TooltipProviderProps {
  /** Default open delay for tooltips inside, ms. */
  delay?: number;
  /** Default close delay for tooltips inside, ms. */
  closeDelay?: number;
  /** After one tooltip closes, others open instantly for this long, ms. @default 300 */
  skipDelay?: number;
  children: React.ReactNode;
}

/** Optional: groups tooltips (e.g. one toolbar) so moving between triggers hands off instantly, and sets shared delays. */
export function TooltipProvider({ delay, closeDelay, skipDelay = 300, children }: TooltipProviderProps) {
  const [group] = React.useState(() => new TooltipGroup());
  React.useEffect(() => {
    group.configure(delay, closeDelay, skipDelay);
  }, [group, delay, closeDelay, skipDelay]);
  return <TooltipGroupContext.Provider value={group}>{children}</TooltipGroupContext.Provider>;
}

export interface TooltipProps {
  /** Tooltip label. Alias: `title`. */
  content?: React.ReactNode;
  /** Bold first line; same as `content`. */
  title?: React.ReactNode;
  /** Supporting text under the title; widens the bubble and wraps. */
  description?: React.ReactNode;
  /** Keyboard shortcut shown beside the label. */
  kbd?: string;
  /** Preferred side; flips to the opposite side when there is no room. */
  side?: TooltipSide;
  /** Alignment along the side. */
  align?: TooltipAlign;
  /** Gap between trigger and bubble, px. */
  sideOffset?: number;
  /** Draw a small arrow pointing at the trigger. */
  arrow?: boolean;
  /** Delay before opening, ms. */
  delay?: number;
  /** Delay before closing after the pointer leaves, ms. Gives the pointer time to reach the bubble. */
  closeDelay?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Never open. */
  disabled?: boolean;
  children: React.ReactElement;
  className?: string;
}

type Position = { x: number; y: number; side: TooltipSide; arrow: number };

const EDGE = 8;
const subscribe = () => () => {};

function useIsClient() {
  return React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

function place(trigger: DOMRect, w: number, h: number, side: TooltipSide, align: TooltipAlign, offset: number): Position {
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const room: Record<TooltipSide, number> = {
    top: trigger.top - offset - EDGE,
    bottom: vh - trigger.bottom - offset - EDGE,
    left: trigger.left - offset - EDGE,
    right: vw - trigger.right - offset - EDGE,
  };
  const opposite: Record<TooltipSide, TooltipSide> = { top: "bottom", bottom: "top", left: "right", right: "left" };
  const need = (s: TooltipSide) => (s === "top" || s === "bottom" ? h : w);
  let s = side;
  if (room[s] < need(s) && room[opposite[s]] > room[s]) s = opposite[s];

  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));
  if (s === "top" || s === "bottom") {
    const raw = align === "start" ? trigger.left : align === "end" ? trigger.right - w : trigger.left + trigger.width / 2 - w / 2;
    const x = clamp(raw, EDGE, vw - EDGE - w);
    const y = s === "top" ? trigger.top - offset - h : trigger.bottom + offset;
    const arrow = clamp(trigger.left + trigger.width / 2 - x, 10, w - 10);
    return { x: Math.round(x), y: Math.round(y), side: s, arrow: Math.round(arrow) };
  }
  const raw = align === "start" ? trigger.top : align === "end" ? trigger.bottom - h : trigger.top + trigger.height / 2 - h / 2;
  const y = clamp(raw, EDGE, vh - EDGE - h);
  const x = s === "left" ? trigger.left - offset - w : trigger.right + offset;
  const arrow = clamp(trigger.top + trigger.height / 2 - y, 10, h - 10);
  return { x: Math.round(x), y: Math.round(y), side: s, arrow: Math.round(arrow) };
}

const enterFrom: Record<TooltipSide, { x: number; y: number }> = {
  top: { x: 0, y: 4 },
  bottom: { x: 0, y: -4 },
  left: { x: 4, y: 0 },
  right: { x: -4, y: 0 },
};
const origin: Record<TooltipSide, string> = { top: "50% 100%", bottom: "50% 0%", left: "100% 50%", right: "0% 50%" };

/**
 * Hover/focus label rendered in a portal so it is never clipped. It scales in from its trigger on a soft spring,
 * flips to the side with room, supports a title + description, an arrow and a shortcut, and hands off instantly
 * between neighbouring triggers.
 */
export function Tooltip({
  content,
  title,
  description,
  kbd,
  side = "top",
  align = "center",
  sideOffset = 8,
  arrow = false,
  delay,
  closeDelay,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  disabled,
  children,
  className,
}: TooltipProps) {
  const group = React.useContext(TooltipGroupContext) ?? defaultGroup;
  const reduce = useReducedMotion();
  const isClient = useIsClient();
  const id = React.useId();
  const [inner, setInner] = React.useState(defaultOpen);
  const open = !disabled && (openProp ?? inner);
  const [instant, setInstant] = React.useState(false);
  const [pos, setPos] = React.useState<Position | null>(null);
  const triggerRef = React.useRef<HTMLSpanElement>(null);
  const bubbleRef = React.useRef<HTMLDivElement>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPress = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Forget the last measurement whenever it closes, so the next open measures fresh.
  const [wasOpen, setWasOpen] = React.useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) setPos(null);
  }

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setInner(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange],
  );

  const closeNow = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setOpen(false);
  }, [setOpen]);

  const show = (immediate = false) => {
    if (disabled) return;
    clear();
    const warm = group.isWarm();
    const wait = immediate || warm ? 0 : (delay ?? group.delay ?? 120);
    const run = () => {
      setInstant(warm);
      setOpen(true);
    };
    if (wait === 0) run();
    else timer.current = setTimeout(run, wait);
  };

  const hide = (afterMs?: number) => {
    clear();
    const wait = afterMs ?? 0;
    if (wait === 0) setOpen(false);
    else timer.current = setTimeout(() => setOpen(false), wait);
  };

  // Register as the group's open tooltip; stamp the close time so neighbours skip their delay.
  React.useEffect(() => {
    if (!open) return;
    group.activate(closeNow);
    return () => group.release(closeNow);
  }, [open, group, closeNow]);

  // Escape closes from anywhere while open (WCAG 1.4.13 dismissible).
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeNow();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closeNow]);

  // Measure and place; re-place on resize, scroll and content changes.
  React.useEffect(() => {
    const bubble = bubbleRef.current;
    const trigger = triggerRef.current;
    if (!open || !bubble || !trigger) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setPos(place(trigger.getBoundingClientRect(), bubble.offsetWidth, bubble.offsetHeight, side, align, sideOffset));
      });
    };
    const ro = new ResizeObserver(update);
    ro.observe(bubble);
    ro.observe(trigger);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, side, align, sideOffset, isClient]);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (longPress.current) clearTimeout(longPress.current);
    },
    [],
  );

  const label = content ?? title;
  const rich = description != null;
  const childProps = children.props as { "aria-describedby"?: string };
  const describedBy = [childProps["aria-describedby"], open ? id : undefined].filter(Boolean).join(" ") || undefined;
  const s = pos?.side ?? side;
  const from = reduce ? { x: 0, y: 0 } : enterFrom[s];
  const leaveDelay = closeDelay ?? group.closeDelay ?? 80;

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex"
      onPointerEnter={(e) => e.pointerType !== "touch" && show()}
      onPointerLeave={(e) => e.pointerType !== "touch" && hide(leaveDelay)}
      onPointerDown={(e) => {
        if (e.pointerType === "touch") {
          // Long-press opens on touch; a quick tap passes straight through to the trigger.
          if (longPress.current) clearTimeout(longPress.current);
          longPress.current = setTimeout(() => {
            show(true);
            longPress.current = setTimeout(() => setOpen(false), 1600);
          }, 450);
          return;
        }
        // Pressing the trigger dismisses its label so it doesn't cover the result.
        closeNow();
      }}
      onPointerUp={(e) => {
        if (e.pointerType === "touch" && longPress.current && !open) clearTimeout(longPress.current);
      }}
      onPointerCancel={() => {
        if (longPress.current) clearTimeout(longPress.current);
      }}
      onFocus={(e) => {
        // Open for keyboard focus only, not focus that follows a mouse press.
        let visible = true;
        try {
          visible = (e.target as HTMLElement).matches(":focus-visible");
        } catch {}
        if (visible) show();
      }}
      onBlur={() => hide()}
    >
      {React.cloneElement(children as React.ReactElement<{ "aria-describedby"?: string }>, { "aria-describedby": describedBy })}
      {isClient &&
        createPortal(
          <AnimatePresence>
            {open && label != null && (
              <div
                key="tip"
                className="pointer-events-none fixed left-0 top-0 z-[110]"
                style={{ transform: pos ? `translate(${pos.x}px, ${pos.y}px)` : undefined, visibility: pos ? "visible" : "hidden" }}
              >
                <motion.div
                  ref={bubbleRef}
                  id={id}
                  role="tooltip"
                  initial={instant ? { opacity: 0 } : { opacity: 0, scale: reduce ? 1 : 0.94, ...from }}
                  animate={pos ? { opacity: 1, scale: 1, x: 0, y: 0 } : undefined}
                  exit={{ opacity: 0, scale: reduce ? 1 : 0.96, transition: { duration: 0.1 } }}
                  transition={instant ? { duration: 0.08 } : { type: "spring", stiffness: 500, damping: 30 }}
                  style={{ transformOrigin: origin[s] }}
                  onPointerEnter={() => clear()}
                  onPointerLeave={() => hide(leaveDelay)}
                  className={cn(
                    "pointer-events-auto relative rounded-[10px] border border-border bg-surface-raised text-xs font-medium text-ink shadow-md",
                    rich ? "grid w-max max-w-[260px] gap-1 px-3 py-2.5 text-left" : "inline-flex items-center gap-2 whitespace-nowrap px-2.5 py-1.5",
                    className,
                  )}
                >
                  {rich ? (
                    <>
                      <span className="flex items-center justify-between gap-3 font-semibold leading-4 text-ink">
                        {label}
                        {kbd && <Kbd>{kbd}</Kbd>}
                      </span>
                      <span className="text-xs font-normal leading-[18px] text-ink-muted">{description}</span>
                    </>
                  ) : (
                    <>
                      {label}
                      {kbd && <Kbd>{kbd}</Kbd>}
                    </>
                  )}
                  {arrow && (
                    <span
                      aria-hidden
                      className={cn(
                        "absolute size-2.5 rotate-45 rounded-[2px] border-border bg-surface-raised",
                        s === "top" && "-bottom-[5px] border-b border-r",
                        s === "bottom" && "-top-[5px] border-l border-t",
                        s === "left" && "-right-[5px] border-r border-t",
                        s === "right" && "-left-[5px] border-b border-l",
                      )}
                      style={s === "top" || s === "bottom" ? { left: (pos?.arrow ?? 0) - 5 } : { top: (pos?.arrow ?? 0) - 5 }}
                    />
                  )}
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </span>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-border bg-surface px-1 font-mono text-[11px] font-normal text-ink-muted">
      {children}
    </kbd>
  );
}
