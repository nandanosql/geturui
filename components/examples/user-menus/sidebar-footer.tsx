"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Bell, BookOpen, ChevronsUpDown, Keyboard, LogOut, Sparkles, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SidebarUserMenuItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** Small count shown at the end of the row. */
  badge?: number;
}

export interface SidebarUserMenuProps {
  name?: string;
  email?: string;
  plan?: string;
  seatsUsed?: number;
  seatsTotal?: number;
  items?: SidebarUserMenuItem[];
  /** Called with the item id, "upgrade" or "sign-out". */
  onSelect?: (id: string) => void;
  /** Render open on mount (without moving focus), e.g. for previews. */
  defaultOpen?: boolean;
  className?: string;
}

const ITEMS: SidebarUserMenuItem[] = [
  { id: "account", label: "Account", icon: UserRound },
  { id: "notifications", label: "Notifications", icon: Bell, badge: 3 },
  { id: "shortcuts", label: "Keyboard shortcuts", icon: Keyboard },
  { id: "docs", label: "Help and docs", icon: BookOpen },
];
const spring = { type: "spring", stiffness: 380, damping: 30 } as const;

/** Sidebar footer user button whose menu opens upward with a seat meter; ArrowUp opens it focused on the last item. */
export function SidebarUserMenu({
  name = "Jordan Okafor",
  email = "jordan@relaybase.io",
  plan = "Team plan",
  seatsUsed = 8,
  seatsTotal = 10,
  items = ITEMS,
  onSelect,
  defaultOpen = false,
  className,
}: SidebarUserMenuProps) {
  const reduce = useReducedMotion();
  const uid = React.useId();
  const [open, setOpen] = React.useState(defaultOpen);
  const focusOnOpen = React.useRef(false);
  const startAt = React.useRef<"first" | "last">("first");
  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("");

  React.useEffect(() => {
    if (!open) return;
    if (focusOnOpen.current)
      requestAnimationFrame(() => {
        const list = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
        if (list?.length) list[startAt.current === "last" ? list.length - 1 : 0].focus();
      });
    const onDown = (e: PointerEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  function openAt(where: "first" | "last") {
    startAt.current = where;
    focusOnOpen.current = true;
    setOpen(true);
  }

  function close(refocus = true) {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }

  function onKey(e: React.KeyboardEvent) {
    const list = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const i = list.indexOf(document.activeElement as HTMLElement);
    const go = (n: number) => list[(n + list.length) % list.length]?.focus();
    if (e.key === "ArrowDown") go(i + 1);
    else if (e.key === "ArrowUp") go(i - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(list.length - 1);
    else if (e.key === "Escape") close();
    else if (e.key === "Tab") return close(false);
    else return;
    e.preventDefault();
  }

  function act(id: string) {
    onSelect?.(id);
    close();
  }

  const row = "flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-[13px] text-ink outline-none transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover";
  const pct = Math.min(100, (seatsUsed / seatsTotal) * 100);

  return (
    <div ref={rootRef} className={cn("relative w-full max-w-[260px]", className)}>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            id={`${uid}-menu`}
            role="menu"
            aria-label={`${name} account`}
            onKeyDown={onKey}
            initial={{ opacity: 0, y: reduce ? 0 : 10, scale: reduce ? 1 : 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduce ? 0 : 6, scale: reduce ? 1 : 0.98, transition: { duration: 0.12 } }}
            transition={spring}
            style={{ transformOrigin: "bottom center" }}
            className="absolute inset-x-0 bottom-full z-30 mb-2 rounded-md border border-border bg-surface-raised p-1.5 shadow-lg"
          >
            <div className="rounded-sm bg-surface-sunken p-2.5">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-medium text-ink">{plan}</span>
                <span className="tabular-nums text-ink-subtle">{seatsUsed} of {seatsTotal} seats</span>
              </div>
              <div role="meter" aria-label="Seats used" aria-valuemin={0} aria-valuemax={seatsTotal} aria-valuenow={seatsUsed} className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: pct / 100 }} transition={{ ...spring, delay: 0.08 }} style={{ transformOrigin: "left" }} className="h-full rounded-full bg-volt" />
              </div>
              <button type="button" role="menuitem" tabIndex={-1} onClick={() => act("upgrade")} className="mt-2.5 inline-flex items-center gap-1.5 rounded-xs text-[12px] font-medium text-volt-ink outline-none hover:underline focus-visible:shadow-[var(--focus-ring)]">
                <Sparkles aria-hidden className="size-3.5" />
                Add more seats
              </button>
            </div>
            <div className="mt-1.5 space-y-0.5">
              {items.map(({ id, label, icon: Icon, badge }) => (
                <button key={id} type="button" role="menuitem" tabIndex={-1} onClick={() => act(id)} className={row}>
                  {Icon && <Icon className="size-4 text-ink-subtle" />}
                  <span className="flex-1">{label}</span>
                  {badge ? <span className="rounded-full bg-surface-sunken px-1.5 text-[11px] font-medium tabular-nums text-ink-muted ring-1 ring-border">{badge}</span> : null}
                </button>
              ))}
            </div>
            <div className="my-1.5 h-px bg-border" />
            <button type="button" role="menuitem" tabIndex={-1} onClick={() => act("sign-out")} className={row}>
              <LogOut aria-hidden className="size-4 text-ink-subtle" />
              Log out
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${uid}-menu`}
        whileTap={{ scale: 0.98 }}
        onClick={() => (open ? close() : openAt("first"))}
        onKeyDown={(e) => {
          if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
          e.preventDefault();
          openAt(e.key === "ArrowUp" ? "last" : "first");
        }}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-md p-2 text-left outline-none transition-colors hover:bg-surface-hover focus-visible:shadow-[var(--focus-ring)]",
          open && "bg-surface-hover",
        )}
      >
        <span aria-hidden className="relative grid size-9 shrink-0 place-items-center rounded-full bg-ink text-[12px] font-semibold text-bg">
          {initials}
          <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-surface-raised bg-success" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-ink">{name}</span>
          <span className="block truncate text-[11.5px] text-ink-subtle">{email}</span>
        </span>
        <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-ink-subtle" />
      </motion.button>
    </div>
  );
}
