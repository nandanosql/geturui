"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { MenuPanel } from "./menu-core";

export type ContextMenuEntry =
  | {
      type?: "item";
      label: string;
      icon?: React.ReactNode;
      /** Shown right-aligned, e.g. "⌘D". Display only — bind the keys yourself. */
      shortcut?: string;
      onSelect?: () => void;
      disabled?: boolean;
      /** Destructive styling. */
      danger?: boolean;
      /** Renders as a checkbox item with a check when true. */
      checked?: boolean;
      /** Nested entries open as a submenu that slides in beside the item. */
      items?: ContextMenuEntry[];
    }
  | { type: "separator" }
  | { type: "label"; label: string };

export interface ContextMenuProps {
  items: ContextMenuEntry[];
  /** The area that responds to right-click and long-press. */
  children: React.ReactNode;
  /** Touch long-press duration, ms. */
  longPressDelay?: number;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  /** Classes for the target wrapper. */
  className?: string;
  /** Classes for every menu surface. */
  menuClassName?: string;
}

const noopSubscribe = () => () => {};

/**
 * Right-click (or long-press on touch) menu that opens at the pointer: the surface scales from the corner nearest
 * the cursor, items stagger in, a highlight glides between rows and submenus slide in beside their item.
 */
export function ContextMenu({ items, children, longPressDelay = 500, onOpenChange, disabled, className, menuClassName }: ContextMenuProps) {
  const [menu, setMenu] = React.useState<{ x: number; y: number; keyboard: boolean; id: number } | null>(null);
  const targetRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const restoreRef = React.useRef<HTMLElement | null>(null);
  const press = React.useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number } | null>(null);
  const counter = React.useRef(0);
  /** Set when a long-press opened the menu, so the browser's follow-up contextmenu event is ignored. */
  const pressOpened = React.useRef(false);
  const mounted = React.useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const placement = React.useMemo(() => ({ kind: "point" as const, x: menu?.x ?? 0, y: menu?.y ?? 0 }), [menu]);
  const onOpenChangeRef = React.useRef(onOpenChange);
  React.useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  });

  const openAt = React.useCallback((x: number, y: number, keyboard: boolean) => {
    restoreRef.current = document.activeElement as HTMLElement | null;
    counter.current += 1;
    setMenu({ x, y, keyboard, id: counter.current });
    onOpenChangeRef.current?.(true);
  }, []);

  const closeAll = React.useCallback((restore: boolean) => {
    setMenu(null);
    onOpenChangeRef.current?.(false);
    if (restore) (restoreRef.current ?? targetRef.current)?.focus({ preventScroll: true });
  }, []);

  React.useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) closeAll(false);
    };
    const onDismiss = () => closeAll(false);
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("resize", onDismiss);
    window.addEventListener("blur", onDismiss);
    window.addEventListener("scroll", onDismiss, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("resize", onDismiss);
      window.removeEventListener("blur", onDismiss);
      window.removeEventListener("scroll", onDismiss, true);
    };
  }, [menu, closeAll]);

  React.useEffect(
    () => () => {
      if (press.current) clearTimeout(press.current.timer);
    },
    [],
  );

  function cancelPress() {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
  }

  function centre() {
    const r = targetRef.current?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: 0, y: 0 };
  }

  return (
    <>
      <div
        ref={targetRef}
        tabIndex={0}
        aria-haspopup="menu"
        aria-expanded={!!menu}
        onContextMenu={(e) => {
          if (disabled) return;
          e.preventDefault();
          cancelPress();
          if (pressOpened.current) {
            pressOpened.current = false;
            return;
          }
          const kb = e.clientX === 0 && e.clientY === 0;
          const p = kb ? centre() : { x: e.clientX, y: e.clientY };
          openAt(p.x, p.y, kb);
        }}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
            e.preventDefault();
            const p = centre();
            openAt(p.x, p.y, true);
          }
        }}
        onPointerDown={(e) => {
          if (disabled || e.pointerType === "mouse") return;
          const { clientX: x, clientY: y } = e;
          cancelPress();
          pressOpened.current = false;
          press.current = {
            x,
            y,
            timer: setTimeout(() => {
              pressOpened.current = true;
              openAt(x, y, false);
            }, longPressDelay),
          };
        }}
        onPointerMove={(e) => {
          const p = press.current;
          if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) cancelPress();
        }}
        onPointerUp={cancelPress}
        onPointerCancel={cancelPress}
        className={cn("rounded-md outline-none [-webkit-touch-callout:none] focus-visible:shadow-[var(--focus-ring)]", className)}
      >
        {children}
      </div>
      {mounted &&
        createPortal(
          <AnimatePresence>
            {menu && (
              <MenuPanel
                key={menu.id}
                ref={panelRef}
                entries={items}
                level={0}
                placement={placement}
                focusOnOpen={menu.keyboard ? "first" : "panel"}
                onCloseAll={closeAll}
                menuClassName={menuClassName}
              />
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
