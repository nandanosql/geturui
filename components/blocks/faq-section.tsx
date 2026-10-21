"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Accordion, type AccordionItem } from "@/components/ui/accordion";
import { buttonClasses, Button } from "@/components/ui/button";

export interface FaqContact {
  title: string;
  description: string;
  actionLabel: string;
  /** Renders the action as a link when set. */
  href?: string;
  onAction?: () => void;
  /** Names for the initials avatar stack. */
  team?: string[];
  /** Small status line, e.g. "Replies in about 2 hours". */
  responseTime?: string;
}

export interface FaqSectionProps {
  eyebrow?: string;
  heading?: string;
  subheading?: string;
  items?: AccordionItem[];
  /** Index open on mount; -1 for none. */
  defaultOpen?: number;
  /** Contact card under the heading. Pass null to hide. */
  contact?: FaqContact | null;
  /** "split" puts heading + contact beside the list on large screens; "stacked" centres everything. */
  layout?: "split" | "stacked";
  className?: string;
}

const DEFAULT_ITEMS: AccordionItem[] = [
  {
    q: "Do I need to install a package?",
    a: "No. The CLI copies the component source into your project, so you own it. The only runtime dependencies are motion and lucide-react.",
  },
  {
    q: "Does it work with my design system?",
    a: "Every component reads CSS variables for surfaces, ink, brand and radii. Map them to your tokens once and the whole library follows.",
  },
  {
    q: "How do Pro blocks get updated?",
    a: "Run the add command again and review the diff. We note breaking changes in the changelog, and older versions stay available.",
  },
  {
    q: "What about reduced motion?",
    a: "Anything bigger than a fade checks the user's reduced-motion preference and falls back to a simple opacity change.",
  },
  {
    q: "Can I use it in client projects?",
    a: "Yes. Free components are MIT licensed, and the Pro licence covers unlimited client projects for your seats.",
  },
];

const DEFAULT_CONTACT: FaqContact = {
  title: "Still have questions?",
  description: "Talk to the people who build GetUrUI. We answer every message ourselves.",
  actionLabel: "Message the team",
  team: ["Nadia Kim", "Theo Laurent", "Ravi Shah"],
  responseTime: "Replies in about 2 hours",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function ContactCard({ contact }: { contact: FaqContact }) {
  const reduce = useReducedMotion() ?? false;
  const tones = ["bg-volt-soft text-volt-ink", "bg-ember-soft text-ember-ink", "bg-surface-raised text-ink"];
  return (
    <motion.aside
      className="grid gap-4 rounded-lg border border-border bg-surface p-5"
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 280, damping: 30, delay: 0.1 }}
    >
      {contact.team && contact.team.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2" aria-hidden>
            {contact.team.slice(0, 4).map((n, i) => (
              <motion.span
                key={n}
                className={cn("grid size-9 place-items-center rounded-full text-[12px] font-semibold ring-2 ring-surface", tones[i % tones.length])}
                initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 420, damping: 22, delay: 0.2 + i * 0.07 }}
              >
                {initials(n)}
              </motion.span>
            ))}
          </div>
          {contact.responseTime && (
            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-muted">
              <span className="size-1.5 rounded-full bg-success text-success animate-pulse-dot" aria-hidden />
              {contact.responseTime}
            </span>
          )}
        </div>
      )}
      <div className="grid gap-1">
        <h3 className="text-[15px] font-semibold text-ink">{contact.title}</h3>
        <p className="text-sm leading-[22px] text-ink-muted">{contact.description}</p>
      </div>
      {contact.href ? (
        <a href={contact.href} onClick={contact.onAction} className={buttonClasses({ variant: "secondary", className: "justify-self-start" })}>
          <MessageCircle className="size-4" aria-hidden />
          {contact.actionLabel}
        </a>
      ) : (
        <Button variant="secondary" className="justify-self-start" onClick={contact.onAction}>
          <MessageCircle className="size-4" aria-hidden />
          {contact.actionLabel}
        </Button>
      )}
    </motion.aside>
  );
}

/** FAQ section: heading, a spring accordion of questions and a "still have questions" contact card with an avatar stack. */
export function FaqSection({
  eyebrow = "FAQ",
  heading = "Questions, answered",
  subheading = "Everything teams usually ask before they add their first component.",
  items = DEFAULT_ITEMS,
  defaultOpen = 0,
  contact = DEFAULT_CONTACT,
  layout = "split",
  className,
}: FaqSectionProps) {
  const split = layout === "split";
  return (
    <section className={cn("@container w-full px-4 py-16 sm:px-6 sm:py-24", className)}>
      <div className={cn("mx-auto grid gap-10", split ? "max-w-6xl @4xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] @4xl:gap-16" : "max-w-3xl")}>
        <div className={cn("grid content-start gap-6", split ? "@4xl:sticky @4xl:top-24" : "justify-items-center text-center")}>
          <header className="grid gap-3">
            {eyebrow && <span className="text-[13px] font-semibold uppercase tracking-[1px] text-volt-ink">{eyebrow}</span>}
            <h2 className="text-balance font-display text-3xl font-semibold tracking-[-0.8px] text-ink @xl:text-[40px] @xl:leading-[1.1]">{heading}</h2>
            {subheading && <p className="text-balance text-base leading-7 text-ink-muted">{subheading}</p>}
          </header>
          {split && contact && <ContactCard contact={contact} />}
        </div>
        <div className="grid content-start gap-6">
          <Accordion items={items} defaultOpen={defaultOpen} />
          {!split && contact && (
            <div className="text-left">
              <ContactCard contact={contact} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
