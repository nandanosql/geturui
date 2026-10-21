"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BadgeCheck, ChevronDown, Star, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ReviewQuoteCardProps {
  author?: string;
  /** Role or context, e.g. "Bought in Sage, size M". */
  meta?: string;
  /** Initials used for the avatar. */
  initials?: string;
  rating?: number;
  headline?: string;
  /** Full review text; paragraphs separated by blank lines. */
  body?: string;
  /** Formatted date, e.g. "Sep 14, 2026". */
  date?: string;
  verified?: boolean;
  helpful?: number;
  /** Characters shown before "Read more". */
  previewLength?: number;
  onHelpfulChange?: (helpful: boolean) => void;
  className?: string;
}

const focus = "outline-none focus-visible:shadow-[var(--focus-ring)]";

/** A single standout review: verified badge, star line, and a body that springs open in place with "Read more". */
export function ReviewQuoteCard({
  author = "Noor Halabi",
  meta = "Product designer · Owned for 4 months",
  initials = "NH",
  rating = 5,
  headline = "The first standing desk that disappears into the room",
  body = "I was worried the motor would be loud on calls, but it is quieter than my laptop fan. The presets took a minute to learn and now I switch heights three or four times a day without thinking about it.\n\nCable tray is generous enough for a dock, two chargers and a power strip. The only thing I would change is the finish on the crossbar, which shows fingerprints. Still an easy five stars.",
  date = "Sep 14, 2026",
  verified = true,
  helpful = 38,
  previewLength = 180,
  onHelpfulChange,
  className,
}: ReviewQuoteCardProps) {
  const reduce = useReducedMotion() ?? false;
  const [open, setOpen] = React.useState(false);
  const [voted, setVoted] = React.useState(false);
  const bodyId = React.useId();
  const long = body.length > previewLength;
  const preview = long ? body.slice(0, previewLength).replace(/\s+\S*$/, "") + "…" : body;

  function vote() {
    const next = !voted;
    setVoted(next);
    onHelpfulChange?.(next);
  }

  return (
    <figure className={cn("relative w-full max-w-[440px] overflow-hidden rounded-xl border border-border bg-surface-raised p-6 shadow-sm", className)}>
      <svg aria-hidden viewBox="0 0 48 36" className="absolute right-5 top-5 h-9 w-12 text-ink/[0.06]">
        <path fill="currentColor" d="M0 36V20C0 8 7 1 19 0l2 5c-7 2-10 6-10 12h9v19H0Zm27 0V20C27 8 34 1 46 0l2 5c-7 2-10 6-10 12h9v19H27Z" />
      </svg>

      <div className="flex items-center gap-1" role="img" aria-label={`Rated ${rating} out of 5`}>
        {Array.from({ length: 5 }, (_, i) => (
          <motion.span
            key={i}
            initial={reduce ? false : { opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 480, damping: 18, delay: reduce ? 0 : 0.05 * i }}
          >
            <Star aria-hidden className={cn("size-4", i < rating ? "text-volt-ink" : "text-ink-subtle/40")} fill="currentColor" strokeWidth={0} />
          </motion.span>
        ))}
      </div>

      <blockquote className="mt-3">
        <p className="font-display text-lg font-semibold leading-snug tracking-[-0.3px] text-ink">{headline}</p>
        <motion.div
          id={bodyId}
          layout={!reduce}
          transition={{ type: "spring", stiffness: 300, damping: 32 }}
          className="mt-2 overflow-hidden text-[14px] leading-relaxed text-ink-muted"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={open ? "full" : "preview"}
              initial={{ opacity: 0, filter: "blur(8px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(8px)" }}
              transition={{ duration: 0.25 }}
              className="space-y-3"
            >
              {(open ? body : preview).split(/\n\n+/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </motion.div>
          </AnimatePresence>
        </motion.div>
        {long && (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => setOpen((o) => !o)}
            className={cn("mt-2 inline-flex items-center gap-1 rounded-xs text-[13px] font-medium text-ink underline-offset-4 hover:underline", focus)}
          >
            {open ? "Show less" : "Read more"}
            <ChevronDown aria-hidden className={cn("size-3.5 transition-transform duration-300 ease-spring", open && "rotate-180")} />
          </button>
        )}
      </blockquote>

      <figcaption className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-sunken font-mono text-xs font-semibold text-ink">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              {author}
              {verified && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
                  <BadgeCheck aria-hidden className="size-3.5" />
                  Verified buyer
                </span>
              )}
            </p>
            <p className="truncate text-xs text-ink-subtle">
              {meta} · {date}
            </p>
          </div>
        </div>
        <motion.button
          type="button"
          aria-pressed={voted}
          whileTap={reduce ? undefined : { scale: 0.94 }}
          onClick={vote}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
            voted ? "border-transparent bg-volt-soft text-volt-ink" : "border-border-strong/40 text-ink-muted hover:text-ink",
            focus,
          )}
        >
          <motion.span key={voted ? "on" : "off"} initial={reduce || !voted ? false : { rotate: -24, scale: 1.3 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 14 }}>
            <ThumbsUp aria-hidden className="size-3.5" fill={voted ? "currentColor" : "none"} />
          </motion.span>
          Helpful
          <span className="tabular-nums">{helpful + (voted ? 1 : 0)}</span>
        </motion.button>
      </figcaption>
    </figure>
  );
}
