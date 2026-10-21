"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useAnimate, useDragControls, useReducedMotion, type PanInfo } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type DialogSize = "sm" | "md" | "lg" | "xl";
export type DialogTone = "neutral" | "volt" | "success" | "warning" | "danger" | "ember";

export interface DialogApi {
  close: () => void;
}

type Slot = React.ReactNode | ((api: DialogApi) => React.ReactNode);

export interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Element that opens the dialog; receives onClick, aria-haspopup and aria-expanded. */
  trigger?: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
  /** Use "alertdialog" for confirmations that interrupt the user. */
  role?: "dialog" | "alertdialog";
  /** Max width: sm 400 · md 480 · lg 640 · xl 800. */
  size?: DialogSize;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Featured icon shown in a tinted tile in the header. */
  icon?: React.ReactNode;
  tone?: DialogTone;
  /** Header arrangement: icon above text, icon beside text (from 640px), or centred. */
  layout?: "stacked" | "inline" | "centered";
  /** Body. A function receives `{ close }`. */
  children?: Slot;
  /** Actions, primary last. Stacked full-width on phones with the primary on top. */
  footer?: Slot;
  /** Left side of the footer, e.g. a "Don't show again" checkbox. */
  footerAside?: Slot;
  closeOnEscape?: boolean;
  /** Close on scrim click (and drag-to-dismiss on the mobile sheet). When false the panel nudges instead. */
  closeOnScrim?: boolean;
  showClose?: boolean;
  /** Element to focus on open. Defaults to [data-autofocus], then the first control in the body, then the footer. */
  initialFocus?: React.RefObject<HTMLElement | null>;
  /** Below 640px, present as a bottom sheet with drag-to-dismiss. */
  sheetOnMobile?: boolean;
  className?: string;
  bodyClassName?: string;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const widths: Record<DialogSize, string> = {
  sm: "sm:max-w-[400px]",
  md: "sm:max-w-[480px]",
  lg: "sm:max-w-[640px]",
  xl: "sm:max-w-[800px]",
};
const tones: Record<DialogTone, string> = {
  neutral: "bg-surface-sunken text-ink-muted",
  volt: "bg-volt-soft text-volt-ink",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  ember: "bg-ember-soft text-ember-ink",
};

const noopSubscribe = () => () => {};
const MOBILE = "(max-width: 639.98px)";
function subscribeMobile(cb: () => void) {
  const mq = window.matchMedia(MOBILE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

const DialogContext = React.createContext<DialogApi | null>(null);

/** Close the surrounding Dialog from any descendant. */
export function useDialog(): DialogApi {
  const ctx = React.useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used inside <Dialog>");
  return ctx;
}

const render = (slot: Slot, api: DialogApi) => (typeof slot === "function" ? slot(api) : slot);

/**
 * Accessible modal: focus trap, scroll lock, focus restore, Escape and scrim dismissal, a tinted featured icon and a
 * width scale. It springs in over a blurred scrim and turns into a draggable bottom sheet below 640px.
 */
export function Dialog({ open: openProp, defaultOpen = false, onOpenChange, trigger, ...panel }: DialogProps) {
  const [inner, setInner] = React.useState(defaultOpen);
  const open = openProp ?? inner;
  const mounted = React.useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

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
          "aria-haspopup": "dialog",
          "aria-expanded": open,
          onClick: (e: React.MouseEvent<HTMLElement>) => {
            trigger.props.onClick?.(e);
            if (!e.defaultPrevented) setOpen(true);
          },
        })}
      {mounted &&
        createPortal(
          <AnimatePresence>{open && <DialogPanel key="dialog" {...panel} onClose={() => setOpen(false)} />}</AnimatePresence>,
          document.body,
        )}
    </>
  );
}

interface DialogPanelProps extends Omit<DialogProps, "open" | "defaultOpen" | "onOpenChange" | "trigger"> {
  onClose: () => void;
}

function DialogPanel({
  role = "dialog",
  size = "md",
  title,
  description,
  icon,
  tone = "neutral",
  layout = "stacked",
  children,
  footer,
  footerAside,
  closeOnEscape = true,
  closeOnScrim = true,
  showClose = true,
  initialFocus,
  sheetOnMobile = true,
  className,
  bodyClassName,
  onClose,
}: DialogPanelProps) {
  const titleId = React.useId();
  const descId = React.useId();
  const reduce = useReducedMotion();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const drag = useDragControls();
  const mobile = React.useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia(MOBILE).matches,
    () => false,
  );
  const sheet = sheetOnMobile && mobile;

  const closeRef = React.useRef(onClose);
  const optsRef = React.useRef({ closeOnEscape, initialFocus });
  React.useEffect(() => {
    closeRef.current = onClose;
    optsRef.current = { closeOnEscape, initialFocus };
  });
  const api = React.useMemo<DialogApi>(() => ({ close: onClose }), [onClose]);

  const nudge = React.useCallback(() => {
    if (reduce || !scope.current) return;
    animate(scope.current, { scale: [1, 1.018, 1] }, { duration: 0.32, ease: "easeOut" });
  }, [animate, reduce, scope]);

  // Scroll lock, initial focus, Escape, focus containment and focus restore.
  React.useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;

    const raf = requestAnimationFrame(() => {
      const p = panelRef.current;
      if (!p) return;
      const target =
        optsRef.current.initialFocus?.current ??
        p.querySelector<HTMLElement>("[data-autofocus]") ??
        p.querySelector<HTMLElement>(`[data-dialog-body] :is(${FOCUSABLE})`) ??
        p.querySelector<HTMLElement>(`[data-dialog-actions] :is(${FOCUSABLE})`) ??
        p.querySelector<HTMLElement>(`[data-dialog-footer] :is(${FOCUSABLE})`) ??
        p;
      target.focus({ preventScroll: true });
    });

    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      if (optsRef.current.closeOnEscape) closeRef.current();
    }
    // Pull focus back if it escapes (menus and nested dialogs portalled elsewhere are allowed).
    function onFocusIn(e: FocusEvent) {
      const t = e.target as HTMLElement | null;
      const p = panelRef.current;
      if (!p || !t || p.contains(t) || t.closest('[role="menu"],[role="listbox"],[role="dialog"],[role="alertdialog"]')) return;
      p.focus({ preventScroll: true });
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocusIn);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
      prev?.focus?.({ preventScroll: true });
    };
  }, []);

  function trapTab(e: React.KeyboardEvent) {
    if (e.key !== "Tab" || !panelRef.current) return;
    const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
    if (!nodes.length) {
      e.preventDefault();
      return;
    }
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
    if (info.offset.y > 110 || info.velocity.y > 600) closeRef.current();
  }

  const spring = { type: "spring" as const, stiffness: 340, damping: 30 };
  const enter = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.16 } }
    : sheet
      ? { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" }, transition: { type: "spring" as const, stiffness: 380, damping: 38 } }
      : {
          initial: { opacity: 0, scale: 0.94, y: 10, filter: "blur(6px)" },
          animate: { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" },
          exit: { opacity: 0, scale: 0.97, y: 4, filter: "blur(4px)", transition: { duration: 0.16 } },
          transition: { ...spring, opacity: { duration: 0.2 }, filter: { duration: 0.2 } },
        };

  const iconTile = icon ? (
    <motion.span
      aria-hidden
      initial={reduce ? false : { scale: 0.5, opacity: 0, rotate: tone === "warning" ? 0 : -14 }}
      animate={
        reduce
          ? undefined
          : tone === "warning"
            ? { scale: 1, opacity: 1, rotate: [0, -12, 10, -6, 4, 0] }
            : { scale: 1, opacity: 1, rotate: 0 }
      }
      transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.08, rotate: tone === "warning" ? { duration: 0.6, delay: 0.2 } : undefined }}
      className={cn("relative grid size-11 shrink-0 place-items-center rounded-md [&>svg]:size-5", tones[tone])}
    >
      <span className="absolute -inset-1.5 rounded-[18px] border border-current opacity-15" />
      {icon}
    </motion.span>
  ) : null;

  const hasBody = children !== undefined && children !== null && children !== false;
  const hasFooter = !!footer || !!footerAside;

  return (
    <DialogContext.Provider value={api}>
      <div className={cn("fixed inset-0 z-[90] flex justify-center", sheet ? "items-end" : "items-center p-4 sm:p-6")}>
        <motion.div
          aria-hidden
          className="absolute inset-0 bg-scrim backdrop-blur-[6px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.18 } }}
          transition={{ duration: 0.22 }}
          onClick={() => (closeOnScrim ? closeRef.current() : nudge())}
        />
        <motion.div
          ref={panelRef}
          role={role}
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descId : undefined}
          tabIndex={-1}
          onKeyDown={trapTab}
          {...enter}
          drag={sheet && closeOnScrim && !reduce ? "y" : false}
          dragListener={false}
          dragControls={drag}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.04, bottom: 0.9 }}
          dragMomentum={false}
          onDragEnd={onDragEnd}
          className={cn(
            "relative isolate flex w-full flex-col border border-border bg-surface-raised text-ink shadow-lg outline-none",
            sheet ? "max-h-[92dvh] rounded-t-xl border-b-0" : cn("max-h-[calc(100dvh-32px)] rounded-xl sm:max-h-[calc(100dvh-48px)]", widths[size]),
            className,
          )}
        >
          <div ref={scope} className="flex min-h-0 flex-1 flex-col">
            <div
              onPointerDown={sheet ? (e) => drag.start(e) : undefined}
              className={cn("relative shrink-0", sheet && "touch-none")}
            >
              {sheet && (
                <div aria-hidden className="flex justify-center pb-1 pt-2.5">
                  <span className="h-1 w-10 rounded-full bg-border-strong" />
                </div>
              )}
              <header
                className={cn(
                  "flex gap-4 px-5 sm:px-6",
                  sheet ? "pt-2" : "pt-6",
                  layout === "inline" ? "flex-col sm:flex-row sm:items-start" : "flex-col",
                  layout === "centered" && "items-center text-center",
                )}
              >
                {iconTile}
                <div className={cn("min-w-0 flex-1", showClose && layout !== "centered" && "pr-8", layout === "centered" && "px-6")}>
                  <h2 id={titleId} className="font-display text-[17px] font-semibold leading-6 tracking-[-0.2px]">
                    {title}
                  </h2>
                  {description && (
                    <div id={descId} className="mt-1 text-[13.5px] leading-5 text-ink-muted">
                      {description}
                    </div>
                  )}
                </div>
              </header>
              {showClose && (
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => closeRef.current()}
                  onPointerDown={(e) => e.stopPropagation()}
                  className={cn(
                    "absolute right-3 grid size-8 place-items-center rounded-[10px] text-ink-subtle outline-none transition-colors hover:bg-surface-hover hover:text-ink focus-visible:shadow-[var(--focus-ring)] sm:right-4",
                    sheet ? "top-5" : "top-4",
                  )}
                >
                  <X className="size-4" aria-hidden />
                </button>
              )}
            </div>
            {hasBody && (
              <div data-dialog-body="" className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 sm:px-6", !hasFooter && "pb-6", bodyClassName)}>
                {render(children, api)}
              </div>
            )}
            {hasFooter && (
              <div
                data-dialog-footer=""
                className={cn(
                  "flex shrink-0 flex-col gap-3 px-5 pt-6 sm:flex-row sm:items-center sm:px-6",
                  sheet ? "pb-[max(20px,env(safe-area-inset-bottom))]" : "pb-6",
                  !hasBody && "pt-6",
                )}
              >
                {footerAside && <div className="min-w-0 text-[13px] text-ink-muted sm:mr-auto">{render(footerAside, api)}</div>}
                {footer && (
                  <div data-dialog-actions="" className="flex flex-col-reverse gap-2 sm:ml-auto sm:flex-row sm:items-center [&>*]:w-full sm:[&>*]:w-auto">{render(footer, api)}</div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </DialogContext.Provider>
  );
}
