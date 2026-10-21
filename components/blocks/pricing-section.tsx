"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NumberTicker } from "@/components/ui/number-ticker";
import { RangeSlider } from "@/components/ui/range-slider";
import { Tabs } from "@/components/ui/tabs";

export type Billing = "monthly" | "yearly";

export interface PricingFeature {
  label: string;
  /** false renders a dash; a string renders as a detail after the label. */
  included: boolean | string;
}

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  /** Per-seat price per month when billed monthly. */
  monthly: number;
  /** Per-seat price per month when billed yearly. */
  yearly: number;
  features: PricingFeature[];
  cta?: string;
  /** Highlight with the volt glow and a badge. */
  featured?: boolean;
  badge?: string;
}

export interface SeatTier {
  /** First seat count this tier applies to. */
  from: number;
  /** Fraction off, 0–1. */
  discount: number;
}

export interface PlanSelection {
  planId: string;
  billing: Billing;
  seats: number;
  /** Monthly total after the seat discount. */
  total: number;
}

export interface PricingSectionProps {
  eyebrow?: string;
  heading?: string;
  subheading?: string;
  plans?: PricingPlan[];
  billing?: Billing;
  defaultBilling?: Billing;
  onBillingChange?: (billing: Billing) => void;
  minSeats?: number;
  maxSeats?: number;
  defaultSeats?: number;
  /** Volume discounts, ascending by `from`. Pass [] to hide the seat slider. */
  tiers?: SeatTier[];
  /** Label on the yearly tab, e.g. "Save 20%". */
  yearlyNote?: string;
  currency?: string;
  onSelectPlan?: (selection: PlanSelection) => void;
  className?: string;
}

const DEFAULT_PLANS: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "For small teams putting their first polished product out.",
    monthly: 12,
    yearly: 10,
    cta: "Start with Starter",
    features: [
      { label: "All free components", included: true },
      { label: "Pro blocks", included: "20 / month" },
      { label: "Figma-ready tokens", included: true },
      { label: "Private registry", included: false },
      { label: "Priority support", included: false },
    ],
  },
  {
    id: "team",
    name: "Team",
    description: "Every Pro block, a private registry and help when you need it.",
    monthly: 24,
    yearly: 19,
    cta: "Choose Team",
    featured: true,
    badge: "Most popular",
    features: [
      { label: "All free components", included: true },
      { label: "Pro blocks", included: "Unlimited" },
      { label: "Figma-ready tokens", included: true },
      { label: "Private registry", included: true },
      { label: "Priority support", included: "4h reply" },
    ],
  },
];

const DEFAULT_TIERS: SeatTier[] = [
  { from: 1, discount: 0 },
  { from: 10, discount: 0.1 },
  { from: 25, discount: 0.15 },
  { from: 40, discount: 0.2 },
];

function tierFor(tiers: SeatTier[], seats: number) {
  let found: SeatTier | undefined;
  for (const t of tiers) if (seats >= t.from) found = t;
  return found;
}

/** Pricing table: volt billing toggle, seat slider with volume tiers, and plan prices that roll digit by digit as inputs change. */
export function PricingSection({
  eyebrow = "Pricing",
  heading = "Pay per seat, save as you grow",
  subheading = "Every plan includes lifetime access to the free library. Switch or cancel any time.",
  plans = DEFAULT_PLANS,
  billing,
  defaultBilling = "yearly",
  onBillingChange,
  minSeats = 1,
  maxSeats = 50,
  defaultSeats = 8,
  tiers = DEFAULT_TIERS,
  yearlyNote = "Save 20%",
  currency = "$",
  onSelectPlan,
  className,
}: PricingSectionProps) {
  const [innerBilling, setInnerBilling] = React.useState<Billing>(defaultBilling);
  const cycle = billing ?? innerBilling;
  const [seats, setSeats] = React.useState(defaultSeats);
  const showSeats = tiers.length > 0;
  const effectiveSeats = showSeats ? seats : 1;
  const tier = tierFor(tiers, effectiveSeats);
  const discount = tier?.discount ?? 0;
  const tierGroup = React.useId();

  function changeBilling(v: string) {
    const next = v as Billing;
    if (billing === undefined) setInnerBilling(next);
    onBillingChange?.(next);
  }

  return (
    <section className={cn("@container w-full px-4 py-16 sm:px-6 sm:py-24", className)}>
      <div className="mx-auto grid max-w-5xl gap-10">
        <header className="mx-auto grid max-w-2xl justify-items-center gap-3 text-center">
          {eyebrow && <span className="text-[13px] font-semibold uppercase tracking-[1px] text-volt-ink">{eyebrow}</span>}
          <h2 className="text-balance font-display text-3xl font-semibold tracking-[-0.8px] text-ink @xl:text-[40px] @xl:leading-[1.1]">{heading}</h2>
          {subheading && <p className="text-balance text-base leading-7 text-ink-muted">{subheading}</p>}
          <Tabs
            variant="volt"
            aria-label="Billing period"
            className="mt-3"
            value={cycle}
            onValueChange={changeBilling}
            items={[
              { value: "monthly", label: "Monthly" },
              {
                value: "yearly",
                label: (
                  <>
                    Yearly
                    {yearlyNote && (
                      <span className={cn("rounded-full px-1.5 text-[10.5px] font-semibold", cycle === "yearly" ? "bg-on-volt/15" : "bg-volt-soft text-volt-ink")}>
                        {yearlyNote}
                      </span>
                    )}
                  </>
                ),
              },
            ]}
          />
        </header>

        {showSeats && (
          <div className="mx-auto grid w-full max-w-xl gap-4 rounded-lg border border-border bg-surface p-5">
            <RangeSlider
              label="Team size"
              min={minSeats}
              max={maxSeats}
              value={seats}
              onValueChange={setSeats}
              format={(v) => `${v} ${v === 1 ? "seat" : "seats"}`}
            />
            <div className="flex flex-wrap gap-1.5" role="list" aria-label="Volume discounts">
              {tiers.map((t, i) => {
                const next = tiers[i + 1];
                const on = tier === t;
                const range = next ? `${t.from}–${next.from - 1}` : `${t.from}+`;
                return (
                  <span
                    key={t.from}
                    role="listitem"
                    aria-current={on || undefined}
                    className={cn(
                      "relative inline-flex h-7 items-center rounded-full px-3 text-[12px] font-medium transition-colors duration-200",
                      on ? "text-volt-ink" : "text-ink-subtle",
                    )}
                  >
                    {on && (
                      <motion.span
                        layoutId={`tier-${tierGroup}`}
                        className="absolute inset-0 rounded-full bg-volt-soft ring-1 ring-inset ring-volt-ink/40"
                        transition={{ type: "spring", stiffness: 420, damping: 32 }}
                      />
                    )}
                    <span className="relative">
                      {range} seats{t.discount > 0 ? ` · ${Math.round(t.discount * 100)}% off` : ""}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className={cn("grid gap-4", plans.length >= 3 ? "@2xl:grid-cols-2 @4xl:grid-cols-3" : "@2xl:grid-cols-2")}>
          {plans.map((plan) => {
            const perSeat = cycle === "yearly" ? plan.yearly : plan.monthly;
            const total = Math.round(perSeat * effectiveSeats * (1 - discount));
            return (
              <motion.article
                key={plan.id}
                layout
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={cn(
                  "relative flex flex-col gap-6 rounded-xl border p-6 @xl:p-7",
                  plan.featured ? "border-volt-ink/60 bg-surface-raised shadow-glow" : "border-border bg-surface",
                )}
              >
                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display text-xl font-semibold tracking-[-0.3px] text-ink">{plan.name}</h3>
                    {plan.featured && plan.badge && <Badge tone="new">{plan.badge}</Badge>}
                  </div>
                  <p className="text-sm leading-[22px] text-ink-muted">{plan.description}</p>
                </div>

                <div className="grid gap-1.5">
                  <div className="flex items-baseline gap-1.5">
                    <NumberTicker
                      value={total}
                      prefix={currency}
                      className="font-display text-[44px] font-semibold tracking-[-1.4px] text-ink"
                    />
                    <span className="text-sm text-ink-muted">/ month</span>
                  </div>
                  <div className="relative h-5 text-[13px] text-ink-subtle">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={`${cycle}-${effectiveSeats}`}
                        className="absolute inset-x-0 top-0 truncate"
                        initial={{ opacity: 0, y: 6, filter: "blur(8px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: -6, filter: "blur(8px)" }}
                        transition={{ duration: 0.25 }}
                      >
                        {currency}
                        {perSeat} per seat
                        {showSeats ? ` × ${effectiveSeats}` : ""}
                        {cycle === "yearly" ? ` · billed ${currency}${(total * 12).toLocaleString("en-US")} yearly` : " · billed monthly"}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                </div>

                <Button
                  block
                  size="lg"
                  variant={plan.featured ? "primary" : "secondary"}
                  trailing="arrow"
                  onClick={() => onSelectPlan?.({ planId: plan.id, billing: cycle, seats: effectiveSeats, total })}
                >
                  {plan.cta ?? `Choose ${plan.name}`}
                </Button>

                <ul className="grid gap-3 border-t border-border pt-6">
                  {plan.features.map((f) => {
                    const on = f.included !== false;
                    return (
                      <li key={f.label} className={cn("flex items-start gap-3 text-sm leading-5", on ? "text-ink" : "text-ink-subtle")}>
                        {on ? (
                          <span className="mt-px grid size-[18px] shrink-0 place-items-center rounded-full bg-volt-soft text-volt-ink">
                            <Check className="size-3" strokeWidth={3} aria-hidden />
                          </span>
                        ) : (
                          <span className="mt-px grid size-[18px] shrink-0 place-items-center rounded-full bg-surface-sunken text-ink-subtle">
                            <Minus className="size-3" strokeWidth={3} aria-hidden />
                          </span>
                        )}
                        <span className="flex-1">
                          <span className="sr-only">{on ? "Included: " : "Not included: "}</span>
                          {f.label}
                          {typeof f.included === "string" && <span className="ml-1.5 text-ink-muted">· {f.included}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
