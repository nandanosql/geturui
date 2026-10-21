"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AccordionItem {
  q: React.ReactNode;
  a: React.ReactNode;
  icon?: React.ReactNode;
}

export interface AccordionProps {
  items: AccordionItem[];
  /** Index open on mount; -1 for none. */
  defaultOpen?: number;
  value?: number;
  onValueChange?: (index: number) => void;
  className?: string;
}

/** Single-open accordion with a weighted spring on height and a blur-up reveal for the body. */
export function Accordion({ items, defaultOpen = -1, value, onValueChange, className }: AccordionProps) {
  const [inner, setInner] = React.useState(defaultOpen);
  const open = value ?? inner;
  const base = React.useId();

  return (
    <div className={cn("grid gap-2", className)}>
      {items.map((it, i) => {
        const on = open === i;
        return (
          <motion.div
            key={i}
            layout
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={cn(
              "overflow-hidden rounded-[14px] border transition-colors duration-200",
              on ? "border-border-strong bg-surface-raised" : "border-border bg-surface",
            )}
          >
            <button
              type="button"
              id={`${base}-t${i}`}
              aria-expanded={on}
              aria-controls={`${base}-p${i}`}
              onClick={() => {
                const next = on ? -1 : i;
                if (value === undefined) setInner(next);
                onValueChange?.(next);
              }}
              className="flex w-full items-center justify-between gap-4 rounded-[14px] px-5 py-4 text-left text-[15px] font-medium leading-[22px] text-ink outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              <span className="flex items-center gap-3">
                {it.icon}
                {it.q}
              </span>
              <motion.span animate={{ rotate: on ? 45 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 18 }} className={on ? "text-ink" : "text-ink-subtle"}>
                <Plus className="size-[18px]" aria-hidden />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {on && (
                <motion.div
                  id={`${base}-p${i}`}
                  role="region"
                  aria-labelledby={`${base}-t${i}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ height: { type: "spring", stiffness: 260, damping: 28 }, opacity: { duration: 0.2 } }}
                >
                  <motion.div
                    initial={{ y: -6, filter: "blur(2px)" }}
                    animate={{ y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.35, delay: 0.05 }}
                    className="px-5 pb-5 text-sm leading-[22px] text-ink-muted"
                  >
                    {it.a}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
