"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export type ThemeChoice = "light" | "dark" | "system";

export interface ThemeSegmentedProps {
  value?: ThemeChoice;
  defaultValue?: ThemeChoice;
  /** Fires with the new choice. Nothing on the page changes unless you apply it. */
  onChange?: (theme: ThemeChoice) => void;
  /** Icons only, for toolbars. */
  iconOnly?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const OPTIONS = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
  { id: "system", label: "System", Icon: Monitor },
] as const;
const spring = { type: "spring", stiffness: 460, damping: 34 } as const;

/** Light / dark / system radio group with a thumb that slides between options and an icon that turns as it lands. */
export function ThemeSegmented({ value, defaultValue = "system", onChange, iconOnly = false, size = "md", className }: ThemeSegmentedProps) {
  const uid = React.useId();
  const [inner, setInner] = React.useState<ThemeChoice>(defaultValue);
  const current = value ?? inner;
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  function choose(id: ThemeChoice, focus = false) {
    if (value === undefined) setInner(id);
    onChange?.(id);
    if (focus) refs.current[OPTIONS.findIndex((o) => o.id === id)]?.focus();
  }

  function onKey(e: React.KeyboardEvent) {
    const i = OPTIONS.findIndex((o) => o.id === current);
    const n = OPTIONS.length;
    const map: Record<string, number> = { ArrowRight: (i + 1) % n, ArrowDown: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, ArrowUp: (i - 1 + n) % n, Home: 0, End: n - 1 };
    if (!(e.key in map)) return;
    e.preventDefault();
    choose(OPTIONS[map[e.key]].id, true);
  }

  const sm = size === "sm";

  return (
    <div role="radiogroup" aria-label="Theme" onKeyDown={onKey} className={cn("inline-flex rounded-full border border-border bg-surface-sunken p-1", className)}>
      {OPTIONS.map(({ id, label, Icon }, i) => {
        const on = current === id;
        return (
          <motion.button
            key={id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={iconOnly ? label : undefined}
            tabIndex={on ? 0 : -1}
            whileTap={{ scale: 0.94 }}
            onClick={() => choose(id)}
            className={cn(
              "relative flex items-center justify-center gap-1.5 rounded-full font-medium outline-none transition-colors focus-visible:shadow-[var(--focus-ring)]",
              sm ? "h-7 text-[12px]" : "h-9 text-[13px]",
              iconOnly ? (sm ? "w-7" : "w-9") : sm ? "px-2.5" : "px-3.5",
              on ? "text-ink" : "text-ink-subtle hover:text-ink",
            )}
          >
            {on && <motion.span layoutId={`${uid}-thumb`} transition={spring} className="absolute inset-0 rounded-full border border-border bg-surface-raised shadow-sm" />}
            <motion.span className="relative" animate={{ rotate: on ? (id === "light" ? 90 : id === "dark" ? -20 : 0) : 0 }} transition={spring}>
              <Icon aria-hidden className={sm ? "size-3.5" : "size-4"} />
            </motion.span>
            {!iconOnly && <span className="relative">{label}</span>}
          </motion.button>
        );
      })}
    </div>
  );
}
