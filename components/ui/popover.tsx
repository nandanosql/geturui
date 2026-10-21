"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export interface PopoverProps {
  /** The element that toggles the popover. Must accept onClick and a ref-able focusable element. */
  trigger: React.ReactElement;
  children: React.ReactNode | ((api: { close: () => void }) => React.ReactNode);
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Preferred side; flips when the viewport has more room on the other side. */
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  /** Gap between trigger and panel, px. */
  sideOffset?: number;
  /** Accessible name for the dialog when it has no visible heading. */
  label?: string;
  className?: string;
}

type Placement = { side: "top" | "bottom"; shift: number; ready: boolean };

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const EDGE = 8;

/**
 * Click-to-open panel anchored to its trigger. It scales from the trigger edge with a spring, flips top/bottom
 * when it would leave the viewport, closes on outside press or Escape and returns focus to the trigger.
 */
export function Popover({
  trigger,
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  side = "bottom",
  align = "center",
  sideOffset = 8,
  label,
  className,
}: PopoverProps) {
  const reduce = useReducedMotion();
  const uid = React.useId();
  const [inner, setInner] = React.useState(defaultOpen);
  const isOpen = open ?? inner;
  const rootRef = React.useRef<HTMLSpanElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = React.useState<Placement>({ side, shift: 0, ready: false });

  // Reset measurement whenever the panel closes.
  const [wasOpen, setWasOpen] = React.useState(isOpen);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    if (!isOpen) setPlacement({ side, shift: 0, ready: false });
  }

  // Bumped whenever focus should go back to the trigger after closing.
  const [restoreTick, setRestoreTick] = React.useState(0);
  const setOpen = React.useCallback(
    (v: boolean, restore = true) => {
      if (open === undefined) setInner(v);
      onOpenChange?.(v);
      if (!v && restore) setRestoreTick((t) => t + 1);
    },
    [open, onOpenChange],
  );
  const close = React.useCallback(() => setOpen(false), [setOpen]);

  React.useEffect(() => {
    if (restoreTick) rootRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  }, [restoreTick]);

  // Measure once the panel renders: choose the side with room and nudge it inside the viewport.
  React.useEffect(() => {
    const panel = panelRef.current;
    const root = rootRef.current;
    if (!isOpen || !panel || !root) return;
    const ro = new ResizeObserver(() => {
      const t = root.getBoundingClientRect();
      const ph = panel.offsetHeight;
      const pw = panel.offsetWidth;
      const below = window.innerHeight - t.bottom - sideOffset - EDGE;
      const above = t.top - sideOffset - EDGE;
      let s = side;
      if (side === "bottom" && ph > below && above > below) s = "top";
      if (side === "top" && ph > above && below > above) s = "bottom";
      const left = align === "start" ? t.left : align === "end" ? t.right - pw : t.left + t.width / 2 - pw / 2;
      let shift = 0;
      if (left < EDGE) shift = EDGE - left;
      else if (left + pw > window.innerWidth - EDGE) shift = window.innerWidth - EDGE - (left + pw);
      setPlacement({ side: s, shift, ready: true });
    });
    ro.observe(panel);
    return () => ro.disconnect();
  }, [isOpen, side, align, sideOffset]);

  // Focus the first field (or the panel) when it opens.
  React.useEffect(() => {
    if (!isOpen || !placement.ready) return;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus({ preventScroll: true });
  }, [isOpen, placement.ready]);

  // Outside press closes without stealing focus back.
  React.useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false, false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [isOpen, setOpen]);

  const triggerProps = trigger.props as { onClick?: (e: React.MouseEvent) => void };
  const triggerEl = React.cloneElement(trigger as React.ReactElement<Record<string, unknown>>, {
    "aria-haspopup": "dialog",
    "aria-expanded": isOpen,
    "aria-controls": isOpen ? `${uid}-panel` : undefined,
    onClick: (e: React.MouseEvent) => {
      triggerProps.onClick?.(e);
      setOpen(!isOpen, false);
    },
  });

  const s = placement.side;
  const originX = align === "start" ? "0%" : align === "end" ? "100%" : "50%";
  const posX = align === "start" ? "left-0" : align === "end" ? "right-0" : "left-1/2 -translate-x-1/2";

  return (
    <span ref={rootRef} className="relative inline-flex">
      {triggerEl}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            id={`${uid}-panel`}
            role="dialog"
            aria-label={label}
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                close();
              }
            }}
            onBlur={(e) => {
              const next = e.relatedTarget as Node | null;
              if (next && !rootRef.current?.contains(next)) setOpen(false, false);
            }}
            initial={{ opacity: 0, scale: reduce ? 1 : 0.9, y: reduce ? 0 : s === "bottom" ? -6 : 6, filter: reduce ? "blur(0px)" : "blur(4px)" }}
            animate={
              placement.ready
                ? { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }
                : { opacity: 0, scale: reduce ? 1 : 0.9, y: reduce ? 0 : s === "bottom" ? -6 : 6, filter: reduce ? "blur(0px)" : "blur(4px)" }
            }
            exit={{ opacity: 0, scale: reduce ? 1 : 0.94, filter: reduce ? "blur(0px)" : "blur(2px)", transition: { duration: 0.14 } }}
            transition={{ type: "spring", stiffness: 420, damping: 30, opacity: { duration: 0.16 } }}
            style={{
              transformOrigin: `${originX} ${s === "bottom" ? "0%" : "100%"}`,
              marginLeft: placement.shift,
              [s === "bottom" ? "top" : "bottom"]: `calc(100% + ${sideOffset}px)`,
            }}
            className={cn(
              "absolute z-[80] min-w-[220px] rounded-md border border-border bg-surface-raised p-4 text-ink shadow-lg outline-none",
              posX,
              className,
            )}
          >
            {typeof children === "function" ? children({ close }) : children}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
