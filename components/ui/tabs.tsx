"use client";

import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface TabItem {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** pill (default), volt (billing toggles) or underline (doc sections). */
  variant?: "pill" | "volt" | "underline";
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
}

/** Segmented tabs with a spring indicator that glides to the active tab and resizes to it. */
export function Tabs({ items, value, defaultValue, onValueChange, variant = "pill", size = "md", className, ...rest }: TabsProps) {
  const id = React.useId();
  const [inner, setInner] = React.useState(defaultValue ?? items[0]?.value);
  const active = value ?? inner;
  const refs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  function select(v: string) {
    if (value === undefined) setInner(v);
    onValueChange?.(v);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const i = items.findIndex((t) => t.value === active);
    const next =
      e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + items.length) % items.length;
    select(items[next].value);
    refs.current[items[next].value]?.focus();
  }

  const underline = variant === "underline";
  return (
    <div
      role="tablist"
      aria-label={rest["aria-label"]}
      onKeyDown={onKeyDown}
      className={cn(
        "relative inline-flex items-center",
        underline ? "gap-4 border-b border-border" : "gap-0.5 rounded-full border border-border bg-surface p-[3px]",
        className,
      )}
    >
      {items.map((t) => {
        const on = t.value === active;
        return (
          <button
            key={t.value}
            ref={(el) => {
              refs.current[t.value] = el;
            }}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onClick={() => select(t.value)}
            className={cn(
              "relative inline-flex items-center gap-1.5 whitespace-nowrap font-medium outline-none transition-colors duration-150",
              "focus-visible:shadow-[var(--focus-ring)]",
              underline ? "h-10 px-0.5 text-[13.5px]" : cn("rounded-full", size === "sm" ? "h-7 px-2.5 text-[12.5px]" : "h-[30px] px-3.5 text-[13px]"),
              on ? (variant === "volt" ? "text-on-volt" : "text-ink") : "text-ink-muted hover:text-ink",
            )}
          >
            {on && (
              <motion.span
                layoutId={`tab-indicator-${id}`}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className={cn(
                  "absolute",
                  underline
                    ? "inset-x-0 -bottom-px h-0.5 rounded-full bg-volt-ink"
                    : variant === "volt"
                      ? "inset-0 rounded-full bg-volt"
                      : "inset-0 rounded-full bg-surface-raised shadow-sm ring-1 ring-border",
                )}
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {t.icon}
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
