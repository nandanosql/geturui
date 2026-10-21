"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type SpinnerSize = "xs" | "sm" | "md" | "lg" | "xl";
export type SpinnerVariant = "ring" | "dots" | "bars";

const px: Record<SpinnerSize, number> = { xs: 12, sm: 16, md: 24, lg: 32, xl: 48 };

export interface SpinnerProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** 12 / 16 / 24 / 32 / 48 px. @default "sm" */
  size?: SpinnerSize;
  /** Ring arc, three bouncing dots or an equaliser. @default "ring" */
  variant?: SpinnerVariant;
  /** Announced to screen readers. Pass `null` when a parent already announces (e.g. a busy button). @default "Loading" */
  label?: string | null;
  /** Visible text beside or under the spinner. */
  text?: React.ReactNode;
  /** Put `text` under the spinner instead of beside it. */
  stacked?: boolean;
}

/** Loading indicator in three shapes; colour follows `currentColor`, motion slows to a pulse when reduced motion is on. */
export function Spinner({ size = "sm", variant = "ring", label = "Loading", text, stacked, className, ...props }: SpinnerProps) {
  const s = px[size];
  const stroke = s <= 16 ? 2 : s <= 24 ? 2.5 : 3;
  const r = (s - stroke) / 2;
  const c = 2 * Math.PI * r;
  const glyph =
    variant === "ring" ? (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="shrink-0 animate-spin motion-reduce:animate-[pulse_1.6s_ease-in-out_infinite]" aria-hidden>
        <circle cx={s / 2} cy={s / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.18} strokeWidth={stroke} />
        <circle
          cx={s / 2}
          cy={s / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${Math.round(c * 0.28 * 100) / 100} ${Math.round(c * 100) / 100}`}
        />
      </svg>
    ) : variant === "dots" ? (
      <span className="inline-flex shrink-0 items-center" style={{ gap: s / 8, height: s }} aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="rounded-full bg-current animate-[gu-spinner-dot_900ms_ease-in-out_infinite] motion-reduce:animate-[pulse_1.6s_ease-in-out_infinite]"
            style={{ width: s / 4, height: s / 4, animationDelay: `${i * 140}ms` }}
          />
        ))}
      </span>
    ) : (
      <span className="inline-flex shrink-0 items-center" style={{ gap: s / 10, height: s }} aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="origin-center rounded-full bg-current animate-[gu-spinner-bar_1s_ease-in-out_infinite] motion-reduce:animate-[pulse_1.6s_ease-in-out_infinite]"
            style={{ width: Math.max(2, s / 8), height: s, animationDelay: `${i * 120}ms` }}
          />
        ))}
      </span>
    );
  return (
    <span
      role={label === null ? undefined : "status"}
      aria-label={label === null || text ? undefined : label}
      className={cn("inline-flex items-center text-current", stacked ? "flex-col gap-3" : "gap-2", className)}
      {...props}
    >
      <style>{`@keyframes gu-spinner-dot{0%,80%,100%{transform:translateY(0);opacity:.35}40%{transform:translateY(-35%);opacity:1}}@keyframes gu-spinner-bar{0%,100%{transform:scaleY(.35);opacity:.45}50%{transform:scaleY(1);opacity:1}}`}</style>
      {glyph}
      {text && <span className="text-sm font-medium text-ink-muted">{text}</span>}
    </span>
  );
}
