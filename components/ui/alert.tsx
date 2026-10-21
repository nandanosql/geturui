"use client";

import * as React from "react";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, type AnimationPlaybackControls } from "motion/react";
import { ArrowRight, Bell, Info, OctagonAlert, Sparkles, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button-classes";

export type AlertTone = "neutral" | "brand" | "info" | "success" | "warning" | "danger";

export interface AlertAction {
  label: string;
  onClick?: () => void;
  /** Renders a link instead of a button. */
  href?: string;
  variant?: "primary" | "secondary" | "link";
}

export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  tone?: AlertTone;
  /** "floating" = card in the page flow; "banner" = full-width bar, e.g. above a page or app shell. */
  layout?: "floating" | "banner";
  size?: "sm" | "md" | "lg";
  title?: React.ReactNode;
  /** Supporting text. `children` works too. */
  description?: React.ReactNode;
  /** Replace the tone icon, or pass false to hide it. */
  icon?: React.ReactNode | false;
  actions?: AlertAction[];
  /** Show a close button. */
  dismissible?: boolean;
  dismissLabel?: string;
  /** Visible state, controlled. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Auto-dismiss after this many ms. A hairline counts down and pauses on hover or focus. */
  duration?: number;
}

const tones: Record<AlertTone, { tint: string; ink: string; tile: string; border: string }> = {
  neutral: { tint: "", ink: "text-ink-muted", tile: "bg-surface-hover text-ink", border: "border-border" },
  brand: { tint: "bg-volt-soft", ink: "text-volt-ink", tile: "bg-volt text-on-volt", border: "border-volt-ink/30" },
  info: { tint: "bg-info-soft", ink: "text-info", tile: "bg-info-soft text-info", border: "border-info/30" },
  success: { tint: "bg-success-soft", ink: "text-success", tile: "bg-success-soft text-success", border: "border-success/30" },
  warning: { tint: "bg-warning-soft", ink: "text-warning", tile: "bg-warning-soft text-warning", border: "border-warning/35" },
  danger: { tint: "bg-danger-soft", ink: "text-danger", tile: "bg-danger-soft text-danger", border: "border-danger/30" },
};

const sizing = {
  sm: { pad: "p-3", gap: "gap-2.5", title: "text-[13px]", body: "text-[13px]", tile: "size-7 rounded-xs", glyph: "size-3.5", btn: "sm" as const, banner: "px-3 py-2" },
  md: { pad: "p-4", gap: "gap-3", title: "text-sm", body: "text-sm", tile: "size-9 rounded-sm", glyph: "size-[18px]", btn: "sm" as const, banner: "px-4 py-2.5" },
  lg: { pad: "p-5", gap: "gap-4", title: "text-base", body: "text-[15px]", tile: "size-11 rounded-sm", glyph: "size-5", btn: "md" as const, banner: "px-5 py-3.5" },
};

/** Success tick that draws itself once. */
function DrawnCheck({ className, reduce }: { className: string; reduce: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9.5" />
      <motion.path
        d="m7.75 12.25 2.75 2.75 5.75-6"
        initial={{ pathLength: reduce ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={{ type: "spring", stiffness: 160, damping: 20, delay: 0.12 }}
      />
    </svg>
  );
}

/** Each tone gets one small, one-time motion: draw, nudge, shake or pulse. */
function ToneIcon({ tone, className, reduce }: { tone: AlertTone; className: string; reduce: boolean }) {
  if (tone === "success") return <DrawnCheck className={className} reduce={reduce} />;
  const Glyph = { neutral: Bell, brand: Sparkles, info: Info, warning: TriangleAlert, danger: OctagonAlert }[tone];
  const motionFor: Record<string, { animate: Record<string, number[]>; transition: Record<string, number | string> }> = {
    neutral: { animate: { rotate: [0, -14, 10, -6, 0] }, transition: { duration: 0.7, delay: 0.1 } },
    brand: { animate: { scale: [1, 1.18, 1], rotate: [0, 8, 0] }, transition: { duration: 0.6, delay: 0.1 } },
    info: { animate: { scale: [1, 1.15, 1] }, transition: { duration: 0.5, delay: 0.1 } },
    warning: { animate: { y: [0, -2.5, 0, -1.5, 0] }, transition: { duration: 0.6, delay: 0.1 } },
    danger: { animate: { x: [0, -2.5, 2.5, -1.5, 1.5, 0] }, transition: { duration: 0.45, delay: 0.1 } },
  };
  const m = motionFor[tone];
  return (
    <motion.span aria-hidden className="inline-flex" animate={reduce ? undefined : m.animate} transition={m.transition}>
      <Glyph className={className} strokeWidth={2} />
    </motion.span>
  );
}

/** Inline alert that stays in the page flow (unlike Toast): six tones, floating card or full-width banner, actions and an animated dismiss. */
export function Alert({
  tone = "neutral",
  layout = "floating",
  size = "md",
  title,
  description,
  icon,
  actions,
  dismissible,
  dismissLabel = "Dismiss",
  open,
  defaultOpen = true,
  onOpenChange,
  duration,
  className,
  children,
  ...props
}: AlertProps) {
  const reduce = !!useReducedMotion();
  const [inner, setInner] = React.useState(defaultOpen);
  const isOpen = open ?? inner;
  const t = tones[tone];
  const s = sizing[size];
  const banner = layout === "banner";
  const body = description ?? children;

  const setOpen = React.useCallback(
    (v: boolean) => {
      if (open === undefined) setInner(v);
      onOpenChange?.(v);
    },
    [open, onOpenChange],
  );

  // Countdown hairline: a motion value we can pause while the pointer or focus is inside.
  const progress = useMotionValue(1);
  const controls = React.useRef<AnimationPlaybackControls | null>(null);
  React.useEffect(() => {
    if (!isOpen || !duration) return;
    progress.set(1);
    controls.current = animate(progress, 0, { duration: duration / 1000, ease: "linear", onComplete: () => setOpen(false) });
    return () => controls.current?.stop();
  }, [isOpen, duration, progress, setOpen]);
  const pause = () => controls.current?.pause();
  const resume = () => controls.current?.play();

  const primaryVariant = tone === "brand" ? "primary" : "inverse";

  const actionRow = actions?.length ? (
    <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1.5", banner ? "" : "mt-3")}>
      {actions.map((a) => {
        const cls =
          a.variant === "link"
            ? cn(
                "group/link inline-flex items-center gap-1 rounded-xs font-semibold underline-offset-4 hover:underline outline-none focus-visible:shadow-[var(--focus-ring)]",
                s.body,
                t.ink === "text-ink-muted" ? "text-ink" : t.ink,
              )
            : buttonClasses({ variant: a.variant === "secondary" ? "ghost" : primaryVariant, size: s.btn, className: a.variant === "secondary" ? "text-ink" : undefined });
        const inner = (
          <>
            {a.label}
            {a.variant === "link" && <ArrowRight aria-hidden className="size-3.5 transition-transform duration-300 ease-spring group-hover/link:translate-x-0.5" />}
          </>
        );
        return a.href ? (
          <a key={a.label} href={a.href} onClick={a.onClick} className={cls}>
            {inner}
          </a>
        ) : (
          <button key={a.label} type="button" onClick={a.onClick} className={cls}>
            {inner}
          </button>
        );
      })}
    </div>
  ) : null;

  const glyph =
    icon === false ? null : (
      <span className={cn("flex shrink-0 items-center justify-center", banner ? cn("size-5", t.ink === "text-ink-muted" ? "text-ink" : t.ink) : cn(s.tile, t.tile))}>
        {icon ?? <ToneIcon tone={tone} className={banner ? "size-[18px]" : s.glyph} reduce={reduce} />}
      </span>
    );

  const close = dismissible ? (
    <button
      type="button"
      onClick={() => setOpen(false)}
      aria-label={dismissLabel}
      className="-m-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-ink-subtle transition-colors hover:bg-surface-hover hover:text-ink outline-none focus-visible:shadow-[var(--focus-ring)]"
    >
      <X aria-hidden className="size-4" />
    </button>
  ) : null;

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          key="alert"
          initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
          animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0, filter: "blur(6px)" }}
          transition={{ type: "spring", stiffness: 320, damping: 34, opacity: { duration: 0.2 } }}
          className={cn("overflow-hidden", !banner && "-m-2 p-2")}
        >
          <div
            role={tone === "danger" || tone === "warning" ? "alert" : "status"}
            onPointerEnter={pause}
            onPointerLeave={resume}
            onFocus={pause}
            onBlur={resume}
            className={cn(
              "relative isolate overflow-hidden text-ink",
              banner ? cn("w-full border-y", t.border, s.banner) : cn("rounded-md border bg-surface-raised shadow-md", t.border, s.pad),
              banner && tone === "neutral" && "bg-surface",
              className,
            )}
            {...props}
          >
            {t.tint && <span aria-hidden className={cn("absolute inset-0 -z-10", t.tint)} />}

            {banner ? (
              <div className={cn("mx-auto flex flex-wrap items-center gap-x-3 gap-y-2 sm:flex-nowrap", s.gap)}>
                {glyph}
                <p className={cn("min-w-0 flex-1", s.body)}>
                  {title && <span className="font-semibold">{title}</span>}
                  {title && body ? <span className="text-ink-muted"> {body}</span> : <span className="text-ink-muted">{body}</span>}
                </p>
                {actionRow && <div className="order-last w-full pl-8 sm:order-none sm:w-auto sm:pl-0">{actionRow}</div>}
                {close}
              </div>
            ) : (
              <div className={cn("flex items-start", s.gap)}>
                {glyph}
                <div className={cn("min-w-0 flex-1", icon !== false && size !== "sm" && "pt-0.5", icon !== false && size === "sm" && "pt-1")}>
                  {title && <p className={cn("font-semibold leading-snug", s.title)}>{title}</p>}
                  {body && <div className={cn("leading-relaxed text-ink-muted", s.body, title && "mt-0.5")}>{body}</div>}
                  {actionRow}
                </div>
                {close}
              </div>
            )}

            {duration ? (
              <motion.span
                aria-hidden
                style={{ scaleX: progress }}
                className={cn("absolute inset-x-0 bottom-0 h-0.5 origin-left opacity-70", tone === "neutral" ? "bg-ink-subtle" : "bg-current", t.ink)}
              />
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
