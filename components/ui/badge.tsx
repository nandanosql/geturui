import * as React from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-surface text-ink-muted border-border",
  new: "bg-volt-soft text-volt-ink border-transparent",
  free: "bg-transparent text-volt-ink border-volt-ink",
  pro: "bg-ember-soft text-ember-ink border-transparent",
  updated: "bg-transparent text-info border-info",
  beta: "bg-transparent text-warning border-warning",
  count: "bg-surface text-ink-subtle border-border font-mono normal-case tracking-normal px-1.5 text-[11px] font-medium",
  success: "bg-transparent text-success border-success",
  danger: "bg-transparent text-danger border-danger",
} as const;

export type BadgeTone = keyof typeof tones;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Animated dot before the label — announcement bar only. */
  pulse?: boolean;
  icon?: React.ReactNode;
}

/** Small uppercase status label. `pro` adds a lock glyph automatically. */
export function Badge({ tone = "neutral", pulse, icon, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 text-[10.5px] font-semibold uppercase leading-none tracking-[0.5px]",
        tones[tone],
        className,
      )}
      {...props}
    >
      {pulse && <span aria-hidden className="size-1.5 rounded-full bg-current animate-pulse-dot" />}
      {icon ?? (tone === "pro" ? <Lock aria-hidden className="size-[11px]" strokeWidth={2.25} /> : null)}
      {children}
    </span>
  );
}
