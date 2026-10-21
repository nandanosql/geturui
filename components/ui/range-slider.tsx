"use client";

import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface RangeSliderProps {
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  label?: React.ReactNode;
  format?: (value: number) => React.ReactNode;
  /** Draw a tick dot at each step (only when there are ≤ 30 steps). */
  ticks?: boolean;
  className?: string;
}

/** Slider with a volt fill, step ticks and a vertical-bar thumb that bounces when it lands on a step. Drag or keyboard. */
export function RangeSlider({ min = 0, max = 100, step = 1, value, defaultValue, onValueChange, label, format, ticks = true, className }: RangeSliderProps) {
  const [inner, setInner] = React.useState(defaultValue ?? min);
  const v = value ?? inner;
  const track = React.useRef<HTMLDivElement>(null);
  const thumb = React.useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const pct = ((v - min) / (max - min)) * 100;
  const steps = Math.round((max - min) / step);

  const set = React.useCallback(
    (n: number) => {
      const clamped = Math.min(max, Math.max(min, Math.round((n - min) / step) * step + min));
      if (clamped === v) return;
      if (value === undefined) setInner(clamped);
      onValueChange?.(clamped);
    },
    [min, max, step, v, value, onValueChange],
  );

  function fromPointer(clientX: number) {
    const r = track.current?.getBoundingClientRect();
    if (!r) return;
    set(min + ((clientX - r.left) / r.width) * (max - min));
  }

  function onKey(e: React.KeyboardEvent) {
    const big = step * Math.max(1, Math.round(steps / 10));
    const map: Record<string, number> = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step, PageUp: big, PageDown: -big };
    if (e.key in map) {
      e.preventDefault();
      set(v + map[e.key]);
    } else if (e.key === "Home") set(min);
    else if (e.key === "End") set(max);
  }

  return (
    <div className={cn("grid gap-2", className)}>
      {label && (
        <div className="flex items-baseline justify-between text-[13px] font-medium text-ink-muted">
          <span>{label}</span>
          <strong className="text-[15px] font-semibold text-ink">{format ? format(v) : v}</strong>
        </div>
      )}
      <div
        ref={track}
        className="relative h-7 cursor-pointer touch-none select-none"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture?.(e.pointerId);
          setDragging(true);
          fromPointer(e.clientX);
          thumb.current?.focus({ preventScroll: true });
        }}
        onPointerMove={(e) => dragging && fromPointer(e.clientX)}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        onLostPointerCapture={() => setDragging(false)}
      >
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full border border-border-strong bg-surface-sunken" />
        <motion.div
          className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-volt"
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
        {ticks && steps <= 30 &&
          Array.from({ length: steps + 1 }, (_, i) => (
            <span
              key={i}
              aria-hidden
              className={cn("absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full", (i / steps) * 100 <= pct ? "bg-on-volt/60" : "bg-ink-subtle/60")}
              style={{ left: `${(i / steps) * 100}%` }}
            />
          ))}
        <motion.div
          ref={thumb}
          role="slider"
          tabIndex={0}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={v}
          aria-valuetext={format && typeof format(v) !== "object" ? String(format(v)) : undefined}
          aria-label={typeof label === "string" ? label : "Value"}
          onKeyDown={onKey}
          className="absolute top-1/2 h-[22px] w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink shadow-[0_0_0_4px_var(--bg)] outline-none focus-visible:shadow-[0_0_0_2px_var(--bg),0_0_0_4px_var(--volt-ink)]"
          animate={{ left: `${pct}%`, scaleY: dragging ? 1.2 : 1 }}
          transition={{ left: { type: "spring", stiffness: 500, damping: 40 }, scaleY: { type: "spring", stiffness: 600, damping: 12 } }}
        />
      </div>
    </div>
  );
}
