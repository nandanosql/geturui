"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, GitBranch, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses, type ButtonVariant } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { NumberTicker } from "@/components/ui/number-ticker";
import { RevealText } from "@/components/ui/text-animation";

export interface HeroAction {
  label: string;
  /** Renders an anchor when set, otherwise a button. */
  href?: string;
  onClick?: () => void;
}

export interface HeroSectionProps {
  /** "centered" stacks copy over the product shot; "split" puts them side by side on large screens. */
  variant?: "centered" | "split";
  /** Text inside the announcement pill. Pass null to hide the pill. */
  eyebrow?: string | null;
  /** Short label on the pulsing badge inside the pill. */
  eyebrowBadge?: string;
  eyebrowHref?: string;
  headline?: string;
  /** One word of the headline to underline with a volt swash. */
  mark?: string;
  subcopy?: string;
  primaryAction?: HeroAction;
  secondaryAction?: HeroAction;
  /** Shell command shown with a copy button. Pass null to hide the row. */
  installCommand?: string | null;
  /** Show the floating product shot made of animated UI cards. */
  showProductShot?: boolean;
  className?: string;
}

function Cta({ action, variant }: { action: HeroAction; variant: ButtonVariant }) {
  const arrow = variant === "primary";
  if (action.href) {
    return (
      <a href={action.href} onClick={action.onClick} className={buttonClasses({ variant, size: "lg" })}>
        <span className="inline-flex items-center gap-[inherit]">
          {action.label}
          {arrow && (
            <ArrowRight aria-hidden className="size-4 transition-transform duration-300 ease-[var(--ease-spring)] group-hover/btn:translate-x-[3px]" />
          )}
        </span>
      </a>
    );
  }
  return (
    <Button variant={variant} size="lg" trailing={arrow ? "arrow" : undefined} onClick={action.onClick}>
      {action.label}
    </Button>
  );
}

/** Entrance + idle float for a product-shot card. */
function Floating({
  children,
  className,
  delay = 0,
  drift = 8,
  reduce,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  drift?: number;
  reduce: boolean;
}) {
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      transition={{ type: "spring", stiffness: 260, damping: 30, delay }}
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, -drift, 0] }}
        transition={{ duration: 6 + delay * 2, repeat: Infinity, ease: "easeInOut", delay: delay + 0.6 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function MiniSwitch({ reduce }: { reduce: boolean }) {
  return (
    <span aria-hidden className="relative flex h-5 w-9 items-center rounded-full border border-border-strong bg-surface-sunken p-[2px]">
      <motion.span
        className="absolute inset-0 rounded-full bg-volt"
        animate={reduce ? { opacity: 1 } : { opacity: [0, 0, 1, 1, 0] }}
        transition={{ duration: 4, repeat: Infinity, times: [0, 0.3, 0.4, 0.8, 0.9] }}
      />
      <motion.span
        className="relative block size-[14px] rounded-full bg-ink"
        animate={reduce ? { x: 16 } : { x: [0, 0, 16, 16, 0] }}
        transition={{ duration: 4, repeat: Infinity, times: [0, 0.3, 0.4, 0.8, 0.9], ease: "easeInOut" }}
      />
    </span>
  );
}

function ProductShot({ reduce, className }: { reduce: boolean; className?: string }) {
  return (
    <div aria-hidden className={cn("relative mx-auto w-full max-w-[640px] select-none", className)}>
      <div className="pointer-events-none absolute -inset-10 -z-10 rounded-full bg-volt-soft opacity-60 blur-3xl" />
      <Floating reduce={reduce} drift={4} className="relative">
        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <span className="size-2.5 rounded-full bg-surface-hover ring-1 ring-border" />
            <span className="size-2.5 rounded-full bg-surface-hover ring-1 ring-border" />
            <span className="size-2.5 rounded-full bg-surface-hover ring-1 ring-border" />
            <span className="ml-3 inline-flex h-6 flex-1 items-center gap-1.5 rounded-full bg-surface-sunken px-3 font-mono text-[11px] text-ink-subtle">
              <Search className="size-3" /> geturui.com/components
            </span>
          </div>
          <div className="grid grid-cols-[120px_1fr] gap-0 @xl:grid-cols-[150px_1fr]">
            <div className="hidden flex-col gap-2 border-r border-border p-4 @md:flex">
              {[64, 80, 52, 72, 60, 44].map((w, i) => (
                <span key={i} className={cn("h-2 rounded-full", i === 1 ? "bg-volt" : "bg-surface-raised")} style={{ width: `${w}%` }} />
              ))}
            </div>
            <div className="col-span-2 grid gap-3 p-4 @md:col-span-1">
              <div className="flex items-center justify-between">
                <span className="h-3 w-28 rounded-full bg-surface-raised" />
                <span className="inline-flex h-6 items-center rounded-full bg-volt px-3 text-[11px] font-semibold text-on-volt">Install</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2 rounded-md border border-border bg-bg p-3">
                  <span className="text-[11px] font-medium text-ink-muted">Reduced motion</span>
                  <MiniSwitch reduce={reduce} />
                </div>
                <div className="grid gap-2 rounded-md border border-border bg-bg p-3">
                  <span className="text-[11px] font-medium text-ink-muted">Build</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                    <motion.span
                      className="block h-full origin-left rounded-full bg-volt"
                      animate={reduce ? { scaleX: 0.8 } : { scaleX: [0.1, 1, 1] }}
                      transition={{ duration: 3.2, repeat: Infinity, times: [0, 0.75, 1], ease: "easeInOut" }}
                    />
                  </span>
                </div>
              </div>
              <div className="grid gap-1.5 rounded-md bg-surface-sunken p-3 font-mono text-[11px] leading-4">
                <span>
                  <span className="text-ember-ink">import</span> <span className="text-ink">{"{ Button }"}</span>{" "}
                  <span className="text-ember-ink">from</span> <span className="text-volt-ink">&quot;@/ui/button&quot;</span>
                </span>
                <span className="text-ink-subtle">{"// spring press, nudging arrow"}</span>
                <span className="text-ink">
                  {"<Button trailing=\"arrow\">Ship it</Button>"}
                  {!reduce && (
                    <motion.span
                      className="ml-0.5 inline-block h-3 w-[6px] translate-y-0.5 bg-volt"
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Floating>

      <Floating reduce={reduce} delay={0.25} className="absolute -left-6 top-20 hidden w-56 @xl:block">
        <div className="flex items-start gap-3 rounded-md bg-surface-raised p-3 shadow-md">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-volt-soft text-volt-ink">
            <Check className="size-3.5" strokeWidth={2.5} />
          </span>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-ink">Deployed to production</div>
            <div className="text-[11.5px] text-ink-muted">main · 41s ago</div>
          </div>
        </div>
      </Floating>

      <Floating reduce={reduce} delay={0.4} drift={10} className="absolute -right-6 -top-6 hidden w-44 @xl:block">
        <div className="grid gap-1 rounded-md bg-surface-raised p-3 shadow-md">
          <span className="text-[11px] font-medium text-ink-muted">Components shipped</span>
          <NumberTicker value={214} className="font-display text-2xl font-semibold text-ink" />
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
            <Sparkles className="size-3" /> 12 this week
          </span>
        </div>
      </Floating>

      <Floating reduce={reduce} delay={0.55} drift={6} className="absolute -bottom-6 right-10 hidden @xl:block">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-glass px-3 py-2 text-[12px] font-medium text-ink shadow-md glass">
          <GitBranch className="size-3.5 text-volt-ink" /> feat/hero-section
          <span className="rounded-full bg-success/15 px-1.5 text-[10px] font-semibold uppercase text-success">Merged</span>
        </div>
      </Floating>
    </div>
  );
}

/** Marketing hero: pulsing announcement pill, word-by-word headline with a marked word, two CTAs, a copyable install command and a floating product shot. */
export function HeroSection({
  variant = "centered",
  eyebrow = "New: 14 page-section blocks",
  eyebrowBadge = "New",
  eyebrowHref,
  headline = "Animated components your users will feel",
  mark = "feel",
  subcopy = "Copy-paste React components with spring motion, real keyboard support and tokens that match your brand. Built on Tailwind and motion.",
  primaryAction = { label: "Browse components" },
  secondaryAction = { label: "Read the docs" },
  installCommand = "npx shadcn@latest add @geturui/hero-section",
  showProductShot = true,
  className,
}: HeroSectionProps) {
  const reduce = useReducedMotion() ?? false;
  const split = variant === "split";

  const pillInner = (
    <>
      <Badge tone="new" pulse>
        {eyebrowBadge}
      </Badge>
      <span className="truncate">{eyebrow}</span>
      <ArrowRight aria-hidden className="size-3.5 shrink-0 text-ink-subtle transition-transform duration-300 ease-[var(--ease-spring)] group-hover/pill:translate-x-0.5" />
    </>
  );
  const pillClass =
    "group/pill inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3 text-[13px] font-medium text-ink-muted outline-none transition-colors hover:border-border-strong hover:text-ink focus-visible:shadow-[var(--focus-ring)]";

  return (
    <section className={cn("@container relative w-full overflow-hidden px-4 py-16 sm:px-6 sm:py-24", className)}>
      <div
        className={cn(
          "mx-auto grid max-w-6xl gap-14",
          split ? "items-center @4xl:grid-cols-[1.05fr_1fr] @4xl:gap-10" : "justify-items-center text-center",
        )}
      >
        <div className={cn("flex flex-col gap-6", split ? "items-start" : "items-center")}>
          {eyebrow &&
            (eyebrowHref ? (
              <motion.a
                href={eyebrowHref}
                className={pillClass}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                {pillInner}
              </motion.a>
            ) : (
              <motion.span
                className={pillClass}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                {pillInner}
              </motion.span>
            ))}

          <RevealText
            as="h1"
            text={headline}
            mark={mark}
            delay={0.1}
            className={cn(
              "text-balance font-display text-[40px] font-semibold leading-[1.05] tracking-[-1.2px] text-ink @xl:text-[56px] @xl:tracking-[-1.8px]",
              split ? "max-w-xl" : "max-w-3xl @4xl:text-[68px] @4xl:tracking-[-2.2px]",
            )}
          />

          <motion.p
            className={cn("text-balance text-base leading-7 text-ink-muted @xl:text-lg", split ? "max-w-lg" : "max-w-xl")}
            initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.45 }}
          >
            {subcopy}
          </motion.p>

          <motion.div
            className={cn("flex flex-wrap items-center gap-3", split ? "justify-start" : "justify-center")}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.55 }}
          >
            <Cta action={primaryAction} variant="primary" />
            <Cta action={secondaryAction} variant="secondary" />
          </motion.div>

          {installCommand && (
            <motion.div
              className="inline-flex h-10 max-w-full items-center gap-2 rounded-full border border-border bg-surface-sunken pl-4 pr-1 font-mono text-[12.5px] text-ink-muted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.7 }}
            >
              <span aria-hidden className="text-volt-ink">
                $
              </span>
              <code className="truncate">{installCommand}</code>
              <CopyButton value={installCommand} label="Copy install command" className="rounded-full" />
            </motion.div>
          )}
        </div>

        {showProductShot && <ProductShot reduce={reduce} className={split ? "@4xl:max-w-none" : "mt-4"} />}
      </div>
    </section>
  );
}

