"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown, ChevronsUpDown, EllipsisVertical, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, type ButtonSize, type ButtonVariant } from "./button";
import { MenuPanel, filterMenuEntries, isMenuItem, type MenuEntry, type MenuItemEntry, type MenuPlacement } from "./menu-core";

export type DropdownEntry = MenuEntry;
export type DropdownItem = MenuItemEntry;

/** Props to spread on a custom trigger element. */
export interface DropdownTriggerProps {
  id: string;
  "aria-haspopup": "menu";
  "aria-expanded": boolean;
  "aria-controls"?: string;
  onClick: (e: React.MouseEvent<HTMLElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
}

export type DropdownTrigger =
  | { kind: "button"; label: string; icon?: React.ReactNode; variant?: ButtonVariant; size?: ButtonSize }
  | { kind: "icon"; label: string; icon?: React.ReactNode; variant?: ButtonVariant; size?: ButtonSize }
  | { kind: "avatar"; name: string; initials?: string; label?: string; size?: "sm" | "md" | "lg" }
  | { kind: "account"; name: string; email?: string; initials?: string }
  | ((props: DropdownTriggerProps & { open: boolean }) => React.ReactNode);

export interface DropdownProps {
  /** A preset trigger (button, icon button, avatar, account card) or a render function that spreads the given props on your own element. */
  trigger: DropdownTrigger;
  items: DropdownEntry[];
  /** Account card at the top of the menu. */
  account?: { name: string; email: string; initials?: string; badge?: React.ReactNode };
  /** Search box that filters items by label, description and keywords. */
  search?: boolean | { placeholder?: string; emptyLabel?: string };
  /** Custom content above the items (after the account card / search). */
  header?: React.ReactNode;
  /** Non-interactive line under the items, e.g. a version or plan meter. Put actions in `items`. */
  footer?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Preferred side; flips when the viewport has more room on the other side. */
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  /** Gap between trigger and menu, px. */
  sideOffset?: number;
  /** Whether checkbox and radio rows close the menu. */
  closeOnCheck?: boolean;
  /** Menu width in px (default fits content, min 216). */
  width?: number;
  disabled?: boolean;
  /** Classes for the trigger wrapper. */
  className?: string;
  /** Classes for every menu surface, including submenus. */
  menuClassName?: string;
}

type FocusMode = "first" | "last" | "panel";

const noopSubscribe = () => () => {};
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';
const tints = ["bg-volt-soft text-volt-ink", "bg-info-soft text-info", "bg-ember-soft text-ember-ink", "bg-success-soft text-success", "bg-warning-soft text-warning"];

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function Initials({ name, initials, className }: { name: string; initials?: string; className?: string }) {
  let h = 0;
  for (const c of name) h = (h + c.charCodeAt(0)) % 997;
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-full font-semibold", tints[h % tints.length], className)}>
      {initials ?? initialsOf(name)}
    </span>
  );
}

const avatarSizes = { sm: "size-8 text-[11px]", md: "size-9 text-xs", lg: "size-10 text-[13px]" } as const;

function Chevron({ open, up }: { open: boolean; up?: boolean }) {
  const reduce = useReducedMotion();
  const Icon = up ? ChevronsUpDown : ChevronDown;
  return (
    <motion.span
      aria-hidden
      className="inline-flex"
      animate={{ rotate: open && !up ? 180 : 0 }}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 26 }}
    >
      <Icon className="size-4 opacity-70" />
    </motion.span>
  );
}

function RenderTrigger({ render, ...props }: DropdownTriggerProps & { open: boolean; render: (p: DropdownTriggerProps & { open: boolean }) => React.ReactNode }) {
  return <>{render(props)}</>;
}

/**
 * Menu button: a trigger (button, icon, avatar, account card or your own) opens a menu that springs from the trigger,
 * flips to stay on screen and supports sections, icons, descriptions, shortcuts, badges, checkbox / radio rows,
 * submenus, an account header or a filtering search box. Full APG menu-button keyboard support.
 */
export function Dropdown({
  trigger,
  items,
  account,
  search,
  header,
  footer,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  side = "bottom",
  align = "start",
  sideOffset = 6,
  closeOnCheck = false,
  width,
  disabled,
  className,
  menuClassName,
}: DropdownProps) {
  const uid = React.useId();
  const triggerId = `${uid}-trigger`;
  const menuId = `${uid}-menu`;
  const [inner, setInner] = React.useState(defaultOpen);
  const isOpen = (openProp ?? inner) && !disabled;
  const [focusMode, setFocusMode] = React.useState<FocusMode>("panel");
  const [query, setQuery] = React.useState("");
  const [anchor, setAnchor] = React.useState<HTMLSpanElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const mounted = React.useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const onOpenChangeRef = React.useRef(onOpenChange);
  React.useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  });

  const hasSearch = !!search;
  const searchOpts = search ? (typeof search === "object" ? search : {}) : null;
  const shown = React.useMemo(() => (hasSearch ? filterMenuEntries(items, query) : items), [items, query, hasSearch]);
  const resultCount = shown.filter(isMenuItem).length;
  const scrollable = !items.some((e) => isMenuItem(e) && e.items?.length);

  const placement = React.useMemo<MenuPlacement | null>(
    () => (anchor ? { kind: "anchor", anchor, side, align, offset: sideOffset } : null),
    [anchor, side, align, sideOffset],
  );

  const restoreFocus = React.useCallback(() => {
    requestAnimationFrame(() => anchor?.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true }));
  }, [anchor]);

  const setOpen = React.useCallback(
    (next: boolean, opts: { focus?: FocusMode; restore?: boolean } = {}) => {
      if (next) {
        setFocusMode(opts.focus ?? "panel");
        setQuery("");
      }
      if (openProp === undefined) setInner(next);
      onOpenChangeRef.current?.(next);
      if (!next && opts.restore) restoreFocus();
    },
    [openProp, restoreFocus],
  );

  // Outside press closes without moving focus; the trigger itself toggles via its click handler.
  React.useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || anchor?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [isOpen, anchor, setOpen]);

  // With a search box, focus lands in it on open.
  React.useEffect(() => {
    if (!isOpen || !hasSearch) return;
    const t = requestAnimationFrame(() => searchRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(t);
  }, [isOpen, hasSearch]);

  function focusRow(which: "first" | "last") {
    const rows = panelRef.current?.querySelectorAll<HTMLElement>('[role="menu"] > [data-menu-item]:not([aria-disabled]), [role="menu"] > [role="group"] > [data-menu-item]:not([aria-disabled])');
    if (!rows?.length) return;
    (which === "first" ? rows[0] : rows[rows.length - 1]).focus({ preventScroll: true });
  }

  const triggerProps: DropdownTriggerProps = {
    id: triggerId,
    "aria-haspopup": "menu",
    "aria-expanded": isOpen,
    "aria-controls": isOpen ? menuId : undefined,
    onClick: (e) => {
      if (disabled) return;
      if (isOpen) return setOpen(false);
      // detail 0 = keyboard click (Enter / Space): focus the first row, as the APG menu button asks.
      setOpen(true, { focus: e.detail === 0 ? "first" : "panel" });
    },
    onKeyDown: (e) => {
      if (disabled) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(true, { focus: e.key === "ArrowDown" ? "first" : "last" });
      }
    },
  };

  let triggerNode: React.ReactNode;
  if (typeof trigger === "function") triggerNode = <RenderTrigger render={trigger} {...triggerProps} open={isOpen} />;
  else if (trigger.kind === "button")
    triggerNode = (
      <Button {...triggerProps} variant={trigger.variant ?? "secondary"} size={trigger.size ?? "md"} disabled={disabled}>
        {trigger.icon && <span className="inline-flex [&>svg]:size-4" aria-hidden>{trigger.icon}</span>}
        {trigger.label}
        <Chevron open={isOpen} />
      </Button>
    );
  else if (trigger.kind === "icon")
    triggerNode = (
      <Button {...triggerProps} aria-label={trigger.label} variant={trigger.variant ?? "ghost"} size={trigger.size ?? "md"} iconOnly disabled={disabled}>
        <span className="inline-flex [&>svg]:size-[18px]" aria-hidden>
          {trigger.icon ?? <EllipsisVertical />}
        </span>
      </Button>
    );
  else if (trigger.kind === "avatar")
    triggerNode = (
      <motion.button
        type="button"
        {...triggerProps}
        aria-label={trigger.label ?? `Account menu for ${trigger.name}`}
        disabled={disabled}
        whileTap={{ scale: 0.94 }}
        transition={{ type: "spring", stiffness: 520, damping: 26 }}
        className="rounded-full outline-none ring-2 ring-transparent transition-shadow hover:ring-border-strong focus-visible:shadow-[var(--focus-ring)] disabled:opacity-45"
      >
        <Initials name={trigger.name} initials={trigger.initials} className={avatarSizes[trigger.size ?? "md"]} />
      </motion.button>
    );
  else
    triggerNode = (
      <motion.button
        type="button"
        {...triggerProps}
        disabled={disabled}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 520, damping: 30 }}
        className={cn(
          "flex w-full min-w-0 items-center gap-2.5 rounded-md border border-border bg-surface p-2 pr-2.5 text-left outline-none transition-colors",
          "hover:border-border-strong hover:bg-surface-raised focus-visible:shadow-[var(--focus-ring)] disabled:opacity-45",
          isOpen && "border-border-strong bg-surface-raised",
        )}
      >
        <Initials name={trigger.name} initials={trigger.initials} className="size-9 text-xs" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold leading-5 text-ink">{trigger.name}</span>
          {trigger.email && <span className="block truncate text-[12px] leading-4 text-ink-subtle">{trigger.email}</span>}
        </span>
        <span className="text-ink-subtle">
          <Chevron open={isOpen} up />
        </span>
      </motion.button>
    );

  const headerNode =
    account || searchOpts || header ? (
      <>
        {account && (
          <div className="-mx-1 -mt-1 mb-1 flex items-center gap-2.5 border-b border-border px-3.5 py-3">
            <Initials name={account.name} initials={account.initials} className="size-9 text-xs" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold leading-5">{account.name}</p>
              <p className="truncate text-[12px] leading-4 text-ink-subtle">{account.email}</p>
            </div>
            {account.badge}
          </div>
        )}
        {searchOpts && (
          <div className={cn("-mx-1 mb-1 border-b border-border px-1.5 pb-1.5", account ? "pt-0.5" : "-mt-1 pt-1.5")}>
            <label className="flex h-8 items-center gap-2 rounded-sm bg-surface-sunken px-2.5 text-ink-subtle focus-within:shadow-[0_0_0_2px_var(--volt-soft)]">
              <Search aria-hidden className="size-3.5 shrink-0" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={searchOpts.placeholder ?? "Search"}
                aria-controls={menuId}
                placeholder={searchOpts.placeholder ?? "Search"}
                autoComplete="off"
                spellCheck={false}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    focusRow(e.key === "ArrowDown" ? "first" : "last");
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    panelRef.current?.querySelector<HTMLElement>("[data-menu-item]:not([aria-disabled])")?.click();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpen(false, { restore: true });
                  } else if (e.key === "Tab") {
                    setOpen(false);
                  }
                }}
                className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-subtle [&::-webkit-search-cancel-button]:hidden"
              />
            </label>
            <span className="sr-only" aria-live="polite">
              {query ? `${resultCount} ${resultCount === 1 ? "result" : "results"}` : ""}
            </span>
          </div>
        )}
        {header}
      </>
    ) : null;

  return (
    <>
      <span ref={setAnchor} className={cn("inline-flex", typeof trigger !== "function" && trigger.kind === "account" && "flex w-full", className)}>
        {triggerNode}
      </span>
      {mounted &&
        placement &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <MenuPanel
                key="menu"
                ref={panelRef}
                entries={shown}
                placement={placement}
                focusOnOpen={searchOpts ? "none" : focusMode}
                onCloseAll={(restore) => setOpen(false, { restore })}
                onExitTop={searchOpts ? () => searchRef.current?.focus({ preventScroll: true }) : undefined}
                onPrintableKey={
                  searchOpts
                    ? (key) => {
                        setQuery((q) => (key === "Backspace" ? q.slice(0, -1) : q + key));
                        searchRef.current?.focus({ preventScroll: true });
                      }
                    : undefined
                }
                closeOnCheck={closeOnCheck}
                header={headerNode}
                footer={footer ? <div className="-mx-1 -mb-1 mt-1 border-t border-border px-3.5 py-2.5 text-[12px] leading-4 text-ink-subtle">{footer}</div> : undefined}
                empty={
                  <div className="px-2.5 py-6 text-center text-[13px] text-ink-subtle">
                    {searchOpts?.emptyLabel ?? (
                      <>
                        No matches for <span className="text-ink-muted">“{query}”</span>
                      </>
                    )}
                  </div>
                }
                scrollable={scrollable}
                menuId={menuId}
                labelledBy={triggerId}
                menuClassName={menuClassName}
                width={width}
              />
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
