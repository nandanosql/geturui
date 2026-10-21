"use client";

import * as React from "react";
import { motion, useInView } from "motion/react";
import { cn } from "@/lib/utils";

export interface NumberTickerProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  /** Start from this value on first view. */
  from?: number;
  /** Delay between digits, seconds. */
  stagger?: number;
  className?: string;
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function Reel({ digit, delay }: { digit: number; delay: number }) {
  return (
    <span className="relative inline-block h-[1em] overflow-hidden leading-none" aria-hidden>
      <motion.span
        className="flex flex-col"
        initial={false}
        animate={{ y: `${-digit}em` }}
        transition={{ type: "spring", stiffness: 160, damping: 20, delay }}
      >
        {DIGITS.map((d) => (
          <span key={d} className="block h-[1em] leading-none">
            {d}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

/** Number that rolls each digit on its own spring reel, staggered left to right. Starts when scrolled into view. */
export function NumberTicker({ value, prefix = "", suffix = "", decimals = 0, from = 0, stagger = 0.04, className }: NumberTickerProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const shown = inView ? value : from;
  const fmt = (n: number) =>
    prefix + n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
  const chars = fmt(shown).split("");

  return (
    <span ref={ref} className={cn("inline-flex items-baseline tabular-nums leading-none", className)} role="text" aria-label={fmt(value)}>
      {chars.map((c, i) => {
        const key = chars.length - i;
        return /\d/.test(c) ? (
          <Reel key={`d${key}`} digit={Number(c)} delay={i * stagger} />
        ) : (
          <span key={`s${key}`} aria-hidden>
            {c}
          </span>
        );
      })}
    </span>
  );
}
