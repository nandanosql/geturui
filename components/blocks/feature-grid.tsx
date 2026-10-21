"use client";

import * as React from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { Activity, ChartColumn, Blocks, Keyboard, Palette, Terminal, MousePointer2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Switch } from "@/components/ui/switch";

/** Built-in micro-animations a tile can show. */
export type FeatureVisual = "typing" | "toggle" | "focus" | "ticker" | "bars" | "cursor";

export interface Feature {
  title: string;
  description: string;
  icon?: React.ReactNode;
  /** Built-in live illustration for the tile. */
  visual?: FeatureVisual;
  /** Your own illustration; overrides `visual`. */
  media?: React.ReactNode;
}

export interface FeatureGridProps {
  eyebrow?: string;
  heading?: string;
  subheading?: string;
  /** Six features fill the bento exactly; more wrap into extra rows. */
  features?: Feature[];
  className?: string;
}

function useTick(ms: number, active: boolean) {
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setN((x) => x + 1), ms);
    return () => clearInterval(t);
  }, [ms, active]);
  return n;
}

const COMMAND = "npx shadcn add @geturui/pricing-section";

function TypingVisual({ active }: { active: boolean }) {
  const tick = useTick(70, active);
  const cycle = COMMAND.length + 24;
  const shown = active ? Math.min(COMMAND.length, tick % cycle) : COMMAND.length;
  const done = shown === COMMAND.length;
  return (
    <div className="grid w-full max-w-sm gap-2 rounded-md border border-border bg-surface-sunken p-3 font-mono text-[12px] leading-5">
      <div className="flex items-center gap-1.5 text-ink">
        <span className="text-volt-ink">$</span>
        <span className="truncate">{COMMAND.slice(0, shown)}</span>
        <motion.span
          className="inline-block h-3.5 w-[7px] shrink-0 bg-volt"
          animate={active ? { opacity: [1, 0, 1] } : { opacity: 1 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <motion.div
        className="text-success"
        initial={false}
        animate={{ opacity: done ? 1 : 0, y: done ? 0 : 4 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        ✓ Added components/blocks/pricing-section.tsx
      </motion.div>
    </div>
  );
}

function ToggleVisual({ active }: { active: boolean }) {
  const tick = useTick(1800, active);
  const [manual, setManual] = React.useState<boolean | null>(null);
  const on = manual ?? tick % 2 === 0;
  return (
    <div className="flex w-full items-center justify-center gap-4">
      <motion.div
        aria-hidden
        className={cn("grid w-28 gap-1.5 rounded-md border p-2.5 transition-colors duration-300", on ? "border-border bg-ink" : "border-border bg-surface-raised")}
        animate={{ rotate: on ? -2 : 2 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <span className={cn("h-1.5 w-12 rounded-full transition-colors duration-300", on ? "bg-bg/40" : "bg-ink/20")} />
        <span className={cn("h-1.5 w-16 rounded-full transition-colors duration-300", on ? "bg-bg/30" : "bg-ink/15")} />
        <span className="mt-1 h-4 w-10 rounded-full bg-volt" />
      </motion.div>
      <Switch
        checked={on}
        onCheckedChange={(v) => setManual(v)}
        aria-label="Preview theme toggle"
      />
    </div>
  );
}

const FOCUS_ITEMS = ["Tab", "Enter", "Esc"];

function FocusVisual({ active }: { active: boolean }) {
  const tick = useTick(1100, active);
  const ringId = React.useId();
  const at = active ? tick % FOCUS_ITEMS.length : 0;
  return (
    <div aria-hidden className="flex items-center gap-2.5">
      {FOCUS_ITEMS.map((k, i) => (
        <span key={k} className="relative">
          {at === i && (
            <motion.span
              layoutId={`focus-ring-${ringId}`}
              className="absolute -inset-1 rounded-[12px] shadow-[var(--focus-ring)]"
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
            />
          )}
          <span
            className={cn(
              "relative inline-flex h-9 min-w-12 items-center justify-center rounded-sm border bg-surface-raised px-3 font-mono text-[12px] shadow-[inset_0_-2px_0_var(--border)] transition-colors",
              at === i ? "border-border-strong text-ink" : "border-border text-ink-muted",
            )}
          >
            {k}
          </span>
        </span>
      ))}
    </div>
  );
}

const TICKS = [48210, 48362, 48539, 48711, 48904];

function TickerVisual({ active }: { active: boolean }) {
  const tick = useTick(2200, active);
  const value = TICKS[tick % TICKS.length];
  return (
    <div className="grid justify-items-center gap-1">
      <NumberTicker value={value} className="font-display text-[34px] font-semibold tracking-[-1px] text-ink" />
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-muted">
        <span className="size-1.5 rounded-full bg-success animate-pulse-dot text-success" aria-hidden /> weekly installs
      </span>
    </div>
  );
}

const BAR_SETS = [
  [40, 72, 56, 88, 64, 96, 78],
  [64, 48, 90, 60, 82, 54, 92],
  [52, 86, 70, 44, 94, 68, 80],
];

function BarsVisual({ active }: { active: boolean }) {
  const tick = useTick(1600, active);
  const bars = BAR_SETS[tick % BAR_SETS.length];
  return (
    <div aria-hidden className="flex h-24 w-full max-w-[220px] items-end gap-2">
      {bars.map((h, i) => (
        <motion.span
          key={i}
          className={cn("flex-1 origin-bottom rounded-t-[6px] rounded-b-[3px]", i === 5 ? "bg-volt" : "bg-surface-raised ring-1 ring-inset ring-border")}
          style={{ height: "100%" }}
          initial={false}
          animate={{ scaleY: h / 100 }}
          transition={{ type: "spring", stiffness: 220, damping: 12, delay: i * 0.03 }}
        />
      ))}
    </div>
  );
}

const CURSOR_SPOTS = [
  { x: 18, y: 26, target: 0 },
  { x: 112, y: 62, target: 1 },
  { x: 206, y: 26, target: 2 },
];

function CursorVisual({ active }: { active: boolean }) {
  const tick = useTick(1300, active);
  const spot = CURSOR_SPOTS[active ? tick % CURSOR_SPOTS.length : 1];
  const labels = ["Hero", "Pricing", "FAQ"];
  return (
    <div aria-hidden className="relative h-24 w-[260px]">
      {labels.map((l, i) => (
        <motion.span
          key={l}
          className={cn(
            "absolute inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium transition-colors duration-200",
            spot.target === i ? "border-transparent bg-volt text-on-volt" : "border-border bg-surface-raised text-ink-muted",
          )}
          style={{ left: i * 94, top: i === 1 ? 46 : 10 }}
          animate={{ scale: spot.target === i ? [1, 0.94, 1] : 1 }}
          transition={{ duration: 0.3, delay: 0.45 }}
        >
          <Blocks className="size-3" /> {l}
        </motion.span>
      ))}
      <motion.span
        className="absolute left-0 top-0 text-ink drop-shadow-[0_2px_4px_rgb(0_0_0/0.4)]"
        initial={false}
        animate={{ x: spot.x + 34, y: spot.y + 8 }}
        transition={{ type: "spring", stiffness: 160, damping: 20 }}
      >
        <MousePointer2 className="size-5 fill-ink" />
      </motion.span>
    </div>
  );
}

const VISUALS: Record<FeatureVisual, React.ComponentType<{ active: boolean }>> = {
  typing: TypingVisual,
  toggle: ToggleVisual,
  focus: FocusVisual,
  ticker: TickerVisual,
  bars: BarsVisual,
  cursor: CursorVisual,
};

const DEFAULT_FEATURES: Feature[] = [
  {
    title: "Copy, paste, own it",
    description: "One command drops the source into your repo. No runtime package, no lock-in.",
    icon: <Terminal className="size-4" />,
    visual: "typing",
  },
  {
    title: "Token-driven theming",
    description: "Every surface reads your CSS variables, so dark and light just work.",
    icon: <Palette className="size-4" />,
    visual: "toggle",
  },
  {
    title: "Keyboard first",
    description: "Arrow keys, Escape and visible focus rings on every interactive part.",
    icon: <Keyboard className="size-4" />,
    visual: "focus",
  },
  {
    title: "Used in production",
    description: "Teams ship GetUrUI in dashboards, docs and storefronts every week.",
    icon: <ChartColumn className="size-4" />,
    visual: "ticker",
  },
  {
    title: "Tuned springs",
    description: "Stiffness and damping picked per interaction, not one curve for everything.",
    icon: <Activity className="size-4" />,
    visual: "bars",
  },
  {
    title: "Blocks that compose",
    description: "Sections are built from the same primitives you already use, so edits stay small.",
    icon: <Blocks className="size-4" />,
    visual: "cursor",
  },
];

const SPANS = ["@xl:col-span-2 @4xl:col-span-2", "", "", "", "", "@xl:col-span-2 @4xl:col-span-2"];

function Tile({ feature, index }: { feature: Feature; index: number }) {
  const ref = React.useRef<HTMLElement>(null);
  const inView = useInView(ref, { margin: "-60px" });
  const reduce = useReducedMotion() ?? false;
  const Visual = feature.visual ? VISUALS[feature.visual] : null;
  return (
    <motion.article
      ref={ref}
      className={cn(
        "group/tile flex flex-col overflow-hidden rounded-lg border border-border bg-surface transition-[border-color,box-shadow] duration-200 hover:border-border-strong hover:shadow-md",
        SPANS[index % SPANS.length],
      )}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      whileHover={reduce ? undefined : { y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 28, delay: (index % 3) * 0.06 }}
    >
      <div className="relative flex h-40 items-center justify-center overflow-hidden border-b border-border px-5 dot-grid">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(closest-side,transparent,var(--surface))]" />
        <div className="relative flex w-full items-center justify-center">
          {feature.media ?? (Visual ? <Visual active={inView && !reduce} /> : null)}
        </div>
      </div>
      <div className="grid gap-1.5 p-5">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          {feature.icon && <span className="text-volt-ink">{feature.icon}</span>}
          {feature.title}
        </h3>
        <p className="text-sm leading-[22px] text-ink-muted">{feature.description}</p>
      </div>
    </motion.article>
  );
}

/** Bento grid of six features; each tile runs a small live micro-animation while in view and lifts on hover. */
export function FeatureGrid({
  eyebrow = "Why GetUrUI",
  heading = "Motion that feels considered, code that stays yours",
  subheading = "Everything you need to ship polished interfaces without hand-tuning every transition.",
  features = DEFAULT_FEATURES,
  className,
}: FeatureGridProps) {
  return (
    <section className={cn("@container w-full px-4 py-16 sm:px-6 sm:py-24", className)}>
      <div className="mx-auto grid max-w-6xl gap-12">
        <header className="mx-auto grid max-w-2xl gap-3 text-center">
          {eyebrow && <span className="text-[13px] font-semibold uppercase tracking-[1px] text-volt-ink">{eyebrow}</span>}
          <h2 className="text-balance font-display text-3xl font-semibold tracking-[-0.8px] text-ink @xl:text-[40px] @xl:leading-[1.1]">{heading}</h2>
          {subheading && <p className="text-balance text-base leading-7 text-ink-muted">{subheading}</p>}
        </header>
        <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @4xl:grid-cols-3">
          {features.map((f, i) => (
            <Tile key={f.title} feature={f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
