"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform, type PanInfo } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DrawerProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Element that opens the drawer; receives onClick and aria-expanded. */
  trigger?: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
  /** Edge the panel slides from. */
  side?: "left" | "right";
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** Sticky footer, e.g. actions. */
  footer?: React.ReactNode;
  /** Panel width in px (clamped to the viewport). */
  width?: number;
  /** Allow dragging the panel toward its edge to dismiss. */
  dragToDismiss?: boolean;
  className?: string;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

const subscribe = () => () => {};

/** Side panel that springs in from the left or right over a blurred scrim. Drag it toward its edge, press Escape or click outside to close. */
export function Drawer({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  trigger,
  side = "right",
  title,
  description,
  children,
  footer,
  width = 400,
  dragToDismiss = true,
  className,
}: DrawerProps) {
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

  return (
    <>
      {trigger &&
        React.cloneElement(trigger, {
          "aria-expanded": open,
          "aria-haspopup": "dialog",
          onClick: (e: React.MouseEvent<HTMLElement>) => {
            trigger.props.onClick?.(e);
            if (!e.defaultPrevented) setOpen(true);
          },
        })}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <DrawerPanel
                key="drawer"
                side={side}
                title={title}
                description={description}
                footer={footer}
                width={width}
                dragToDismiss={dragToDismiss}
                className={className}
                onClose={() => setOpen(false)}
              >
                {children}
              </DrawerPanel>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

interface DrawerPanelProps extends Omit<DrawerProps, "open" | "defaultOpen" | "onOpenChange" | "trigger"> {
  side: "left" | "right";
  width: number;
  dragToDismiss: boolean;
  onClose: () => void;
}

function DrawerPanel({ side, title, description, children, footer, width, dragToDismiss, className, onClose }: DrawerPanelProps) {
  const titleId = React.useId();
  const descId = React.useId();
  const reduce = useReducedMotion();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef(onClose);
  React.useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  const sign = side === "right" ? 1 : -1;
  const offscreen = sign * (width + 48);
  const x = useMotionValue(offscreen);
  // Scrim fades as the panel is dragged out.
  const scrim = useTransform(x, [0, offscreen], [1, 0]);

  React.useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;

    const raf = requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector<HTMLElement>("[data-autofocus]") ?? panelRef.current;
      first?.focus({ preventScroll: true });
    });
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
      prev?.focus?.({ preventScroll: true });
    };
  }, []);

  function trapTab(e: React.KeyboardEvent) {
    if (e.key !== "Tab" || !panelRef.current) return;
    const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    const travelled = info.offset.x * sign;
    const flung = info.velocity.x * sign;
    if (travelled > width * 0.35 || flung > 500) closeRef.current();
  }

  const spring = reduce ? { duration: 0.18 } : { type: "spring" as const, stiffness: 340, damping: 34 };

  return (
    <div className="fixed inset-0 z-[90]">
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-scrim backdrop-blur-[6px]"
        style={{ opacity: scrim }}
        onClick={() => closeRef.current()}
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        onKeyDown={trapTab}
        style={{ x, width: `min(${width}px, calc(100vw - 24px))` }}
        initial={{ x: offscreen }}
        animate={{ x: 0 }}
        exit={{ x: offscreen }}
        transition={spring}
        drag={dragToDismiss && !reduce ? "x" : false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={side === "right" ? { left: 0.04, right: 0.9 } : { left: 0.9, right: 0.04 }}
        dragMomentum={false}
        onDragEnd={onDragEnd}
        className={cn(
          "absolute inset-y-2 flex flex-col overflow-hidden rounded-[20px] border border-border bg-surface-raised text-ink shadow-lg outline-none",
          side === "right" ? "right-2" : "left-2",
          className,
        )}
      >
        {dragToDismiss && (
          <span
            aria-hidden
            className={cn(
              "absolute top-1/2 h-10 w-1 -translate-y-1/2 rounded-full bg-border-strong/50",
              side === "right" ? "left-1.5" : "right-1.5",
            )}
          />
        )}
        <header className="flex items-start gap-3 border-b border-border px-6 pb-4 pt-5">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="font-display text-lg font-semibold leading-7 tracking-[-0.2px]">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-0.5 text-[13.5px] leading-5 text-ink-muted">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => closeRef.current()}
            className="-mr-2 grid size-8 shrink-0 place-items-center rounded-[10px] text-ink-subtle outline-none hover:bg-surface-hover hover:text-ink focus-visible:shadow-[var(--focus-ring)]"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>
        <motion.div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5"
          initial={reduce ? false : { opacity: 0, x: sign * 16, filter: "blur(6px)" }}
          animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.06 }}
        >
          {children}
        </motion.div>
        {footer && <footer className="border-t border-border bg-surface px-6 py-4">{footer}</footer>}
      </motion.div>
    </div>
  );
}
