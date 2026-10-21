"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CircleDot, CreditCard, LogOut, Moon, Search, Settings, UserRound, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CommandProfileAction {
  id: string;
  label: string;
  group: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** Keys shown on the right, e.g. ["G", "P"]. */
  keys?: string[];
}

export interface CommandProfileMenuProps {
  name?: string;
  handle?: string;
  actions?: CommandProfileAction[];
  onSelect?: (action: CommandProfileAction) => void;
  /** Render open on mount (without moving focus), e.g. for previews. */
  defaultOpen?: boolean;
  className?: string;
}

const ACTIONS: CommandProfileAction[] = [
  { id: "profile", label: "View profile", group: "Account", icon: UserRound, keys: ["G", "P"] },
  { id: "status", label: "Set status", group: "Account", icon: CircleDot, keys: ["S"] },
  { id: "dnd", label: "Pause notifications", group: "Account", icon: Moon, keys: ["⇧", "D"] },
  { id: "team", label: "Invite teammates", group: "Workspace", icon: UsersRound, keys: ["I"] },
  { id: "billing", label: "Billing and usage", group: "Workspace", icon: CreditCard, keys: ["G", "B"] },
  { id: "settings", label: "Settings", group: "Workspace", icon: Settings, keys: ["⌘", ","] },
  { id: "sign-out", label: "Sign out", group: "Session", icon: LogOut, keys: ["⇧", "Q"] },
];
const spring = { type: "spring", stiffness: 480, damping: 36 } as const;

/** Command-style profile menu: type to filter, arrows move a sliding highlight, Enter runs, Escape clears then closes. */
export function CommandProfileMenu({ name = "Priya Raman", handle = "@priya", actions = ACTIONS, onSelect, defaultOpen = false, className }: CommandProfileMenuProps) {
  const reduce = useReducedMotion();
  const uid = React.useId();
  const [open, setOpen] = React.useState(defaultOpen);
  const focusOnOpen = React.useRef(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const [ran, setRan] = React.useState<string | null>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("");

  const results = actions.filter((a) => a.label.toLowerCase().includes(query.trim().toLowerCase()));
  const groups = [...new Set(results.map((a) => a.group))];

  React.useEffect(() => {
    if (!open) return;
    if (focusOnOpen.current) requestAnimationFrame(() => inputRef.current?.focus());
    const onDown = (e: PointerEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  function close() {
    setOpen(false);
    setQuery("");
    setActive(0);
    triggerRef.current?.focus();
  }

  function run(a: CommandProfileAction | undefined) {
    if (!a) return;
    onSelect?.(a);
    setRan(a.label);
    close();
  }

  function onKey(e: React.KeyboardEvent) {
    const n = results.length;
    if (e.key === "ArrowDown") setActive((i) => (i + 1) % Math.max(n, 1));
    else if (e.key === "ArrowUp") setActive((i) => (i - 1 + n) % Math.max(n, 1));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(n - 1);
    else if (e.key === "Enter") run(results[active]);
    else if (e.key === "Escape" && query) {
      setQuery("");
      setActive(0);
    } else if (e.key === "Escape") close();
    else if (e.key === "Tab") return setOpen(false);
    else return;
    e.preventDefault();
  }

  return (
    <div ref={rootRef} className={cn("relative inline-flex flex-col items-start gap-2", className)}>
      <motion.button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Open profile menu for ${name}`}
        whileTap={{ scale: 0.94 }}
        onClick={() => {
          if (open) return close();
          focusOnOpen.current = true;
          setOpen(true);
        }}
        className="grid size-10 place-items-center rounded-full bg-ink text-[13px] font-semibold text-bg shadow-sm outline-none ring-2 ring-surface-raised focus-visible:shadow-[var(--focus-ring)]"
      >
        {initials}
      </motion.button>
      <p aria-live="polite" className="sr-only">{ran ? `${ran} selected` : ""}</p>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Profile commands"
            initial={{ opacity: 0, y: reduce ? 0 : -8, scale: reduce ? 1 : 0.96, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: reduce ? 0 : -4, scale: reduce ? 1 : 0.98, transition: { duration: 0.12 } }}
            transition={spring}
            style={{ transformOrigin: "top left" }}
            className="absolute left-0 top-12 z-30 w-[min(320px,calc(100vw-32px))] overflow-hidden rounded-md border border-border bg-surface-raised shadow-lg"
          >
            <div className="flex items-center gap-3 border-b border-border p-3">
              <span aria-hidden className="grid size-9 place-items-center rounded-full bg-ink text-[12px] font-semibold text-bg">{initials}</span>
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-semibold text-ink">{name}</p>
                <p className="text-[12px] text-ink-subtle">{handle}</p>
              </div>
            </div>
            <label className="flex items-center gap-2 border-b border-border px-3">
              <Search aria-hidden className="size-4 text-ink-subtle" />
              <span className="sr-only">Search profile actions</span>
              <input
                ref={inputRef}
                role="combobox"
                aria-expanded
                aria-controls={`${uid}-list`}
                aria-activedescendant={results[active] ? `${uid}-${results[active].id}` : undefined}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKey}
                placeholder="Search actions"
                className="h-11 w-full bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-subtle"
              />
              <kbd className="rounded-xs border border-border px-1.5 font-mono text-[10.5px] text-ink-subtle">esc</kbd>
            </label>
            <div id={`${uid}-list`} role="listbox" aria-label="Actions" className="max-h-[340px] overflow-y-auto p-1.5">
              {results.length === 0 && <p className="px-2.5 py-6 text-center text-[13px] text-ink-subtle">No actions match “{query}”.</p>}
              {groups.map((g) => (
                <div key={g} role="group" aria-label={g}>
                  <p aria-hidden className="px-2.5 pb-1 pt-2 text-[11px] font-medium text-ink-subtle">{g}</p>
                  {results.filter((a) => a.group === g).map((a) => {
                    const i = results.indexOf(a);
                    const on = i === active;
                    const Icon = a.icon;
                    return (
                      <div
                        key={a.id}
                        id={`${uid}-${a.id}`}
                        role="option"
                        aria-selected={on}
                        onPointerMove={() => setActive(i)}
                        onClick={() => run(a)}
                        className="relative flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-[13px]"
                      >
                        {on && <motion.span layoutId={`${uid}-hl`} transition={spring} className="absolute inset-0 rounded-sm bg-surface-hover ring-1 ring-border" />}
                        {Icon && <Icon className={cn("relative size-4", on ? "text-ink" : "text-ink-subtle")} />}
                        <span className={cn("relative flex-1", on ? "text-ink" : "text-ink-muted")}>{a.label}</span>
                        <span className="relative flex gap-1">
                          {a.keys?.map((k) => (
                            <kbd key={k} className="grid h-5 min-w-5 place-items-center rounded-xs border border-border bg-surface-sunken px-1 font-mono text-[10.5px] text-ink-subtle">{k}</kbd>
                          ))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-border bg-surface px-3 py-2 text-[11px] text-ink-subtle">
              <span>↑↓ to move · ↵ to run</span>
              <span>{results.length} actions</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
