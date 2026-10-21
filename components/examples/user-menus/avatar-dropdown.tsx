"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronDown, CreditCard, LogOut, Monitor, Moon, Plus, Settings, Sun, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MenuAccount {
  id: string;
  name: string;
  plan: string;
}

export type MenuTheme = "light" | "dark" | "system";

export interface AvatarDropdownProps {
  name?: string;
  email?: string;
  accounts?: MenuAccount[];
  defaultAccountId?: string;
  defaultTheme?: MenuTheme;
  /** Called with "profile", "billing", "settings", "add-account" or "sign-out". */
  onSelect?: (action: string) => void;
  onAccountChange?: (account: MenuAccount) => void;
  /** Local preference only; wire it to your theme provider. */
  onThemeChange?: (theme: MenuTheme) => void;
  align?: "start" | "end";
  /** Render open on mount (without moving focus), e.g. for previews. */
  defaultOpen?: boolean;
  className?: string;
}

const ACCOUNTS: MenuAccount[] = [
  { id: "northwind", name: "Northwind Studio", plan: "Pro" },
  { id: "halcyon", name: "Halcyon Labs", plan: "Team" },
  { id: "personal", name: "Personal", plan: "Free" },
];
const THEMES = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
  { id: "system", label: "System", Icon: Monitor },
] as const;
const ITEMS = [
  { id: "profile", label: "Profile", Icon: UserRound, kbd: "⇧P" },
  { id: "billing", label: "Billing", Icon: CreditCard, kbd: "⇧B" },
  { id: "settings", label: "Settings", Icon: Settings, kbd: "⌘," },
];
const spring = { type: "spring", stiffness: 420, damping: 32 } as const;
const initials = (n: string) => n.split(" ").map((p) => p[0]).slice(0, 2).join("");

/** Avatar dropdown with an account switcher, a theme row and roving keyboard focus; the panel springs from the trigger corner. */
export function AvatarDropdown({
  name = "Maya Kerrigan",
  email = "maya@northwind.studio",
  accounts = ACCOUNTS,
  defaultAccountId = "northwind",
  defaultTheme = "system",
  onSelect,
  onAccountChange,
  onThemeChange,
  align = "end",
  defaultOpen = false,
  className,
}: AvatarDropdownProps) {
  const reduce = useReducedMotion();
  const uid = React.useId();
  const [open, setOpen] = React.useState(defaultOpen);
  const focusOnOpen = React.useRef(false);
  const [account, setAccount] = React.useState(defaultAccountId);
  const [theme, setTheme] = React.useState<MenuTheme>(defaultTheme);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const current = accounts.find((a) => a.id === account) ?? accounts[0];

  const items = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>("[data-item]") ?? []);

  React.useEffect(() => {
    if (!open) return;
    if (focusOnOpen.current) requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>("[data-item]")?.focus());
    const onDown = (e: PointerEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  function close(refocus = true) {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }

  function onKey(e: React.KeyboardEvent) {
    const list = items();
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

  return (
    <div ref={rootRef} className={cn("relative inline-block", className)}>
      <motion.button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${uid}-menu`}
        whileTap={{ scale: 0.96 }}
        onClick={() => {
          focusOnOpen.current = true;
          setOpen((o) => !o);
        }}
        onKeyDown={(e) => {
          if (e.key !== "ArrowDown") return;
          e.preventDefault();
          focusOnOpen.current = true;
          setOpen(true);
        }}
        className="flex items-center gap-2 rounded-full border border-border bg-surface-raised py-1 pl-1 pr-2.5 shadow-sm outline-none transition-colors hover:bg-surface-hover focus-visible:shadow-[var(--focus-ring)]"
      >
        <span aria-hidden className="grid size-7 place-items-center rounded-full bg-ink text-[11px] font-semibold text-bg">{initials(name)}</span>
        <span className="text-[13px] font-medium text-ink">{name.split(" ")[0]}</span>
        <motion.span aria-hidden animate={{ rotate: open ? 180 : 0 }} transition={spring} className="text-ink-subtle">
          <ChevronDown className="size-3.5" />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            id={`${uid}-menu`}
            role="menu"
            aria-label="Account"
            onKeyDown={onKey}
            initial={{ opacity: 0, scale: reduce ? 1 : 0.94, y: reduce ? 0 : -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: reduce ? 1 : 0.96, y: reduce ? 0 : -4, transition: { duration: 0.12 } }}
            transition={spring}
            style={{ transformOrigin: align === "end" ? "top right" : "top left" }}
            className={cn("absolute top-full z-30 mt-2 w-[min(288px,calc(100vw-32px))] rounded-md border border-border bg-surface-raised p-1.5 shadow-lg", align === "end" ? "right-0" : "left-0")}
          >
            <div className="px-2.5 pb-2 pt-1.5">
              <p className="text-[13.5px] font-semibold text-ink">{name}</p>
              <p className="truncate text-[12px] text-ink-subtle">{email}</p>
            </div>
            <div className="h-px bg-border" />
            <p className="px-2.5 pb-1 pt-2 text-[11px] font-medium text-ink-subtle">Workspaces</p>
            <div role="group" aria-label="Workspaces">
              {accounts.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={a.id === account}
                  data-item
                  tabIndex={-1}
                  onClick={() => {
                    setAccount(a.id);
                    onAccountChange?.(a);
                  }}
                  className={row}
                >
                  <span aria-hidden className="grid size-6 place-items-center rounded-xs bg-surface-sunken text-[10.5px] font-semibold text-ink-muted ring-1 ring-border">{initials(a.name)}</span>
                  <span className="flex-1 truncate">{a.name}</span>
                  <span className="text-[11px] text-ink-subtle">{a.plan}</span>
                  <span className="grid size-4 place-items-center">
                    {a.id === current.id && (
                      <motion.span layoutId={`${uid}-check`} transition={spring}>
                        <Check aria-hidden className="size-4 text-volt-ink" />
                      </motion.span>
                    )}
                  </span>
                </button>
              ))}
              <button type="button" role="menuitem" data-item tabIndex={-1} onClick={() => act("add-account")} className={cn(row, "text-ink-muted")}>
                <span aria-hidden className="grid size-6 place-items-center rounded-xs border border-dashed border-border-strong"><Plus className="size-3.5" /></span>
                Add workspace
              </button>
            </div>
            <div className="my-1.5 h-px bg-border" />
            {ITEMS.map(({ id, label, Icon, kbd }) => (
              <button key={id} type="button" role="menuitem" data-item tabIndex={-1} onClick={() => act(id)} className={row}>
                <Icon aria-hidden className="size-4 text-ink-subtle" />
                <span className="flex-1">{label}</span>
                <kbd className="font-mono text-[11px] text-ink-subtle">{kbd}</kbd>
              </button>
            ))}
            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
              <span className="text-[13px] text-ink">Theme</span>
              <div role="group" aria-label="Theme" className="flex rounded-full border border-border bg-surface-sunken p-0.5">
                {THEMES.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={theme === id}
                    aria-label={label}
                    data-item
                    tabIndex={-1}
                    onClick={() => {
                      setTheme(id);
                      onThemeChange?.(id);
                    }}
                    className="relative grid size-7 place-items-center rounded-full outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    {theme === id && <motion.span layoutId={`${uid}-theme`} transition={spring} className="absolute inset-0 rounded-full bg-surface-raised shadow-sm ring-1 ring-border" />}
                    <Icon aria-hidden className={cn("relative size-3.5", theme === id ? "text-ink" : "text-ink-subtle")} />
                  </button>
                ))}
              </div>
            </div>
            <div className="my-1.5 h-px bg-border" />
            <button type="button" role="menuitem" data-item tabIndex={-1} onClick={() => act("sign-out")} className={row}>
              <LogOut aria-hidden className="size-4 text-ink-subtle" />
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
