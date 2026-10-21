"use client";

import * as React from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses, type ButtonVariant } from "@/components/ui/button";

export interface CtaAction {
  label: string;
  /** Renders an anchor when set, otherwise a button. */
  href?: string;
  onClick?: () => void;
}

export interface CtaBannerProps {
  /** Small badge above the headline. Pass null to hide. */
  eyebrow?: string | null;
  headline?: string;
  subcopy?: string;
  primaryAction?: CtaAction;
  secondaryAction?: CtaAction | null;
  /** Radial glow that follows the pointer. Off under reduced motion. */
  spotlight?: boolean;
  /** "center" or "left" aligned copy; left puts the buttons on the right on large screens. */
  align?: "center" | "left";
  className?: string;
}

function Action({ action, variant }: { action: CtaAction; variant: ButtonVariant }) {
  const primary = variant === "primary";
  if (action.href) {
    return (
      <a href={action.href} onClick={action.onClick} className={buttonClasses({ variant, size: "lg" })}>
        <span className="inline-flex items-center gap-[inherit]">
          {action.label}
          {primary && <ArrowRight aria-hidden className="size-4 transition-transform duration-300 ease-[var(--ease-spring)] group-hover/btn:translate-x-[3px]" />}
        </span>
      </a>
    );
  }
  return (
    <Button size="lg" variant={variant} trailing={primary ? "arrow" : undefined} onClick={action.onClick}>
      {action.label}
    </Button>
  );
}

/** Large rounded call-to-action panel on a dot grid, with a soft spotlight that trails the cursor. */
export function CtaBanner({
  eyebrow = "Free to start",
  headline = "Ship your next launch page this afternoon",
  subcopy = "Pick a hero, a pricing table and an FAQ. Paste them in, swap the copy, and you are live.",
  primaryAction = { label: "Get started free" },
  secondaryAction = { label: "Talk to sales" },
  spotlight = true,
  align = "center",
  className,
}: CtaBannerProps) {
  const reduce = useReducedMotion() ?? false;
  const ref = React.useRef<HTMLDivElement>(null);
  const mx = useMotionValue(50);
  const my = useMotionValue(30);
  const x = useSpring(mx, { stiffness: 180, damping: 26 });
  const y = useSpring(my, { stiffness: 180, damping: 26 });
  const glow = useMotionValue(0.55);
  const glowSpring = useSpring(glow, { stiffness: 200, damping: 30 });
  const background = useMotionTemplate`radial-gradient(520px circle at ${x}% ${y}%, var(--volt-soft), transparent 70%)`;
  const live = spotlight && !reduce;
  const left = align === "left";

  function onMove(e: React.PointerEvent) {
    if (!live) return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set(((e.clientX - r.left) / r.width) * 100);
    my.set(((e.clientY - r.top) / r.height) * 100);
    glow.set(1);
  }

  return (
    <section className={cn("@container w-full px-4 py-12 sm:px-6 sm:py-16", className)}>
      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={() => {
          glow.set(0.55);
          mx.set(50);
          my.set(30);
        }}
        className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-xl border border-border bg-surface"
      >
        <div
          aria-hidden
          className="dot-grid absolute inset-0 -z-20 [mask-image:radial-gradient(ellipse_at_center,#000_30%,transparent_80%)]"
        />
        {spotlight && (
          <motion.div aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={{ background, opacity: glowSpring }} />
        )}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-volt-ink/50 to-transparent" />

        <div
          className={cn(
            "flex flex-col gap-8 px-6 py-14 @xl:px-12 @xl:py-20",
            left ? "items-start @4xl:flex-row @4xl:items-end @4xl:justify-between" : "items-center text-center",
          )}
        >
          <div className={cn("grid gap-4", left ? "max-w-2xl" : "max-w-3xl justify-items-center")}>
            {eyebrow && (
              <Badge tone="new" pulse>
                {eyebrow}
              </Badge>
            )}
            <motion.h2
              className="text-balance font-display text-[34px] font-semibold leading-[1.08] tracking-[-1px] text-ink @xl:text-5xl @xl:tracking-[-1.6px]"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, filter: "blur(8px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              {headline}
            </motion.h2>
            {subcopy && (
              <motion.p
                className="text-balance text-base leading-7 text-ink-muted @xl:text-lg"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.15 }}
              >
                {subcopy}
              </motion.p>
            )}
          </div>
          <motion.div
            className="flex flex-wrap items-center gap-3"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.25 }}
          >
            <Action action={primaryAction} variant="primary" />
            {secondaryAction && <Action action={secondaryAction} variant="secondary" />}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
