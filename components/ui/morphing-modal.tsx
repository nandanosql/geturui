"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MorphingModalNav {
  /** Id of the view on screen. */
  view: string;
  /** Push a view onto the stack (slides in from the right). */
  go: (id: string) => void;
  /** Pop back to the previous view. */
  back: () => void;
  close: () => void;
  canGoBack: boolean;
}

export interface MorphingModalView {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Static content, or a render function that receives the navigator. */
  content: React.ReactNode | ((nav: MorphingModalNav) => React.ReactNode);
}

export interface MorphingModalProps {
  /** Content of the trigger button; the button itself morphs into the panel. */
  trigger: React.ReactNode;
  views: MorphingModalView[];
  /** View shown each time the modal opens. Defaults to the first view. */
  initialView?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Panel width in px (clamped to the viewport). */
  width?: number;
  triggerClassName?: string;
  /** Classes for the panel. */
  className?: string;
}

const NavContext = React.createContext<MorphingModalNav | null>(null);

/** Navigate between views from any component rendered inside a MorphingModal view. */
export function useMorphingModal() {
  const ctx = React.useContext(NavContext);
  if (!ctx) throw new Error("useMorphingModal must be used inside <MorphingModal> content");
  return ctx;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

const SHELL_SPRING = { type: "spring", stiffness: 340, damping: 32 } as const;
const HEIGHT_SPRING = { type: "spring", stiffness: 320, damping: 32 } as const;

const noop = () => () => {};

const viewVariants = {
  enter: ({ dir, reduce }: { dir: number; reduce: boolean }) => ({ opacity: 0, x: reduce ? 0 : 28 * dir, filter: reduce ? "blur(0px)" : "blur(8px)" }),
  center: { opacity: 1, x: 0, filter: "blur(0px)" },
  exit: ({ dir, reduce }: { dir: number; reduce: boolean }) => ({ opacity: 0, x: reduce ? 0 : -28 * dir, filter: reduce ? "blur(0px)" : "blur(8px)" }),
};

const titleVariants = {
  enter: ({ dir, reduce }: { dir: number; reduce: boolean }) => ({ opacity: 0, y: reduce ? 0 : 6 * dir, filter: reduce ? "blur(0px)" : "blur(6px)" }),
  center: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: ({ dir, reduce }: { dir: number; reduce: boolean }) => ({ opacity: 0, y: reduce ? 0 : -6 * dir, filter: reduce ? "blur(0px)" : "blur(6px)" }),
};

const triggerBase =
  "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap px-[18px] text-sm font-medium tracking-[-0.1px]";

/** A trigger button that morphs into a multi-view modal; height springs between views while content crossfades with a blur. */
export function MorphingModal({
  trigger,
  views,
  initialView,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  width = 420,
  triggerClassName,
  className,
}: MorphingModalProps) {
  const uid = React.useId();
  const reduce = useReducedMotion();
  const [inner, setInner] = React.useState(defaultOpen);
  const [touched, setTouched] = React.useState(defaultOpen);
  const [lifted, setLifted] = React.useState(false);
  const open = openProp ?? inner;
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const wasOpen = React.useRef(open);
  const mounted = React.useSyncExternalStore(noop, () => true, () => false);

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setInner(next);
      setTouched(true);
      if (!next) setLifted(true);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange],
  );

  // Return focus to the trigger once it re-mounts after closing.
  React.useEffect(() => {
    if (wasOpen.current && !open) {
      const raf = requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
      wasOpen.current = open;
      return () => cancelAnimationFrame(raf);
    }
    wasOpen.current = open;
  }, [open]);

  const shellId = reduce ? undefined : `${uid}-shell`;

  return (
    <>
      <span className="relative inline-flex">
        {/* Invisible copy holds the trigger's footprint while it is morphed away. */}
        <span aria-hidden className={cn(triggerBase, "invisible rounded-full border border-transparent", triggerClassName)}>
          {trigger}
        </span>
        {!open && (
          <motion.button
            ref={triggerRef}
            type="button"
            layoutId={shellId}
            aria-haspopup="dialog"
            aria-expanded={false}
            onClick={() => setOpen(true)}
            onLayoutAnimationComplete={() => setLifted(false)}
            transition={SHELL_SPRING}
            style={{ borderRadius: 999 }}
            className={cn(
              triggerBase,
              "absolute inset-0 border border-border bg-surface text-ink outline-none transition-colors duration-150 hover:border-border-strong hover:bg-surface-raised focus-visible:shadow-[var(--focus-ring)]",
              lifted && "z-[95]",
              triggerClassName,
            )}
          >
            <motion.span
              initial={touched ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.12 }}
              className="inline-flex items-center gap-[inherit]"
            >
              {trigger}
            </motion.span>
          </motion.button>
        )}
      </span>
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <ModalPanel
                key="panel"
                shellId={shellId}
                views={views}
                initialView={initialView ?? views[0]?.id}
                width={width}
                reduce={!!reduce}
                className={className}
                onClose={() => setOpen(false)}
              />
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

interface ModalPanelProps {
  shellId?: string;
  views: MorphingModalView[];
  initialView: string;
  width: number;
  reduce: boolean;
  className?: string;
  onClose: () => void;
}

function ModalPanel({ shellId, views, initialView, width, reduce, className, onClose }: ModalPanelProps) {
  const titleId = React.useId();
  const descId = React.useId();
  const [stack, setStack] = React.useState<string[]>([initialView]);
  const [dir, setDir] = React.useState(1);
  const [height, setHeight] = React.useState<number | "auto">("auto");
  const panelRef = React.useRef<HTMLDivElement>(null);
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef(onClose);
  React.useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  const current = stack[stack.length - 1];
  const view = views.find((v) => v.id === current) ?? views[0];

  const nav = React.useMemo<MorphingModalNav>(
    () => ({
      view: current,
      canGoBack: stack.length > 1,
      go: (id) => {
        setDir(1);
        setStack((s) => (s[s.length - 1] === id ? s : [...s, id]));
      },
      back: () => {
        setDir(-1);
        setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
      },
      close: onClose,
    }),
    [current, stack.length, onClose],
  );

  // Measure the active view so the panel height can spring to it.
  React.useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Escape closes, Tab stays inside, body scroll is locked while open.
  React.useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
    };
  }, []);

  // Move focus to the heading on open and on every view change.
  React.useEffect(() => {
    const raf = requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(raf);
  }, [current]);

  function trapTab(e: React.KeyboardEvent) {
    if (e.key !== "Tab" || !panelRef.current) return;
    const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => !n.closest("[aria-hidden=true]"));
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === headingRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const custom = { dir, reduce };

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center p-4">
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-scrim backdrop-blur-[3px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        onClick={() => closeRef.current()}
      />
      <motion.div
        ref={panelRef}
        layoutId={shellId}
        layoutDependency={shellId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={view?.description ? descId : undefined}
        onKeyDown={trapTab}
        initial={shellId ? undefined : { opacity: 0, scale: 0.97 }}
        animate={shellId ? undefined : { opacity: 1, scale: 1 }}
        exit={shellId ? undefined : { opacity: 0, scale: 0.97 }}
        transition={SHELL_SPRING}
        style={{ borderRadius: 20, width: `min(${width}px, calc(100vw - 32px))` }}
        className={cn("relative overflow-hidden border border-border bg-surface-raised text-ink shadow-lg", className)}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.2, delay: shellId ? 0.12 : 0 } }}
          exit={{ opacity: 0, transition: { duration: 0.08 } }}
        >
          <div className="flex items-center gap-2 px-4 pb-1 pt-4">
            <AnimatePresence initial={false}>
              {nav.canGoBack && (
                <motion.button
                  key="back"
                  type="button"
                  aria-label="Back"
                  onClick={nav.back}
                  initial={{ opacity: 0, width: 0, scale: 0.6 }}
                  animate={{ opacity: 1, width: 32, scale: 1 }}
                  exit={{ opacity: 0, width: 0, scale: 0.6 }}
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className="grid size-8 shrink-0 place-items-center rounded-[10px] text-ink-muted outline-none hover:bg-surface-hover hover:text-ink focus-visible:shadow-[var(--focus-ring)]"
                >
                  <ChevronLeft className="size-[18px]" aria-hidden />
                </motion.button>
              )}
            </AnimatePresence>
            <div className="relative min-w-0 flex-1">
              <AnimatePresence mode="popLayout" initial={false} custom={custom}>
                <motion.h2
                  key={view?.id}
                  ref={(el: HTMLHeadingElement | null) => {
                    if (el) headingRef.current = el;
                  }}
                  id={titleId}
                  tabIndex={-1}
                  custom={custom}
                  variants={titleVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="truncate px-1 font-display text-[17px] font-semibold leading-8 tracking-[-0.2px] outline-none"
                >
                  {view?.title}
                </motion.h2>
              </AnimatePresence>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => closeRef.current()}
              className="grid size-8 shrink-0 place-items-center rounded-[10px] text-ink-subtle outline-none hover:bg-surface-hover hover:text-ink focus-visible:shadow-[var(--focus-ring)]"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <motion.div
            className="relative overflow-hidden"
            initial={false}
            animate={{ height }}
            transition={reduce ? { duration: 0 } : HEIGHT_SPRING}
          >
            <div ref={bodyRef} className="relative">
              <AnimatePresence mode="popLayout" initial={false} custom={custom}>
                <motion.div
                  key={view?.id}
                  custom={custom}
                  variants={viewVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "spring", stiffness: 380, damping: 34 }}
                  className="px-5 pb-5"
                >
                  {view?.description && (
                    <p id={descId} className="mb-4 text-[13.5px] leading-5 text-ink-muted">
                      {view.description}
                    </p>
                  )}
                  <NavContext.Provider value={nav}>
                    {typeof view?.content === "function" ? view.content(nav) : view?.content}
                  </NavContext.Provider>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
