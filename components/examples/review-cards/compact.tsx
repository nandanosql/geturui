"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CompactReview {
  id: string;
  author: string;
  initials: string;
  rating: number;
  /** Formatted date, e.g. "2 days ago" or "Sep 28". */
  date: string;
  text: string;
  /** Existing helpful votes. */
  up: number;
  down: number;
}

export interface CompactReviewListProps {
  title?: string;
  reviews?: CompactReview[];
  onVote?: (id: string, vote: "up" | "down" | null) => void;
  className?: string;
}

const DEFAULT_REVIEWS: CompactReview[] = [
  { id: "r1", author: "Jonas Weber", initials: "JW", rating: 5, date: "Sep 29", text: "Battery easily lasts a full week of commuting. The case magnets are strong without being fiddly.", up: 24, down: 1 },
  { id: "r2", author: "Amara Osei", initials: "AO", rating: 4, date: "Sep 26", text: "Great noise cancelling on trains. Ear tips run a little small, the medium pair is tight for me.", up: 11, down: 2 },
  { id: "r3", author: "Leo Martín", initials: "LM", rating: 3, date: "Sep 21", text: "Sound is good, but the touch controls trigger when I adjust them. Turned gestures off in the app.", up: 7, down: 4 },
];

const focus = "outline-none focus-visible:shadow-[var(--focus-ring)]";

function Count({ value, reduce }: { value: number; reduce: boolean }) {
  return (
    <span className="relative inline-flex h-4 min-w-[1.25rem] overflow-hidden tabular-nums">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={reduce ? { opacity: 0 } : { y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: "-100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 34 }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Dense review list: one row per review with a star line, and optimistic helpful votes whose counts roll as you tap. */
export function CompactReviewList({ title = "Most helpful reviews", reviews = DEFAULT_REVIEWS, onVote, className }: CompactReviewListProps) {
  const reduce = useReducedMotion() ?? false;
  const [votes, setVotes] = React.useState<Record<string, "up" | "down" | undefined>>({});

  function vote(id: string, v: "up" | "down") {
    const next = votes[id] === v ? undefined : v;
    setVotes((s) => ({ ...s, [id]: next }));
    onVote?.(id, next ?? null);
  }

  return (
    <section aria-label={title} className={cn("w-full max-w-[460px] rounded-xl border border-border bg-surface-raised shadow-sm", className)}>
      <header className="flex items-center justify-between px-5 pb-2 pt-4">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <span className="font-mono text-[11px] text-ink-subtle">{reviews.length} reviews</span>
      </header>
      <ul className="divide-y divide-border">
        {reviews.map((r, i) => {
          const mine = votes[r.id];
          return (
            <motion.li
              key={r.id}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 30, delay: reduce ? 0 : i * 0.06 }}
              className="flex gap-3 px-5 py-4"
            >
              <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-sunken font-mono text-[11px] font-semibold text-ink">
                {r.initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <p className="text-[13px] font-semibold text-ink">{r.author}</p>
                  <span className="flex gap-px" role="img" aria-label={`${r.rating} out of 5`}>
                    {Array.from({ length: 5 }, (_, s) => (
                      <Star key={s} aria-hidden className={cn("size-3", s < r.rating ? "text-volt-ink" : "text-ink-subtle/35")} fill="currentColor" strokeWidth={0} />
                    ))}
                  </span>
                  <span className="ml-auto text-[11px] text-ink-subtle">{r.date}</span>
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{r.text}</p>
                <div className="mt-2.5 flex items-center gap-1.5 text-[11.5px] text-ink-subtle">
                  <span className="mr-1">Helpful?</span>
                  {(["up", "down"] as const).map((v) => {
                    const on = mine === v;
                    const Icon = v === "up" ? ThumbsUp : ThumbsDown;
                    const n = (v === "up" ? r.up : r.down) + (on ? 1 : 0);
                    return (
                      <motion.button
                        key={v}
                        type="button"
                        aria-pressed={on}
                        aria-label={`${v === "up" ? "Yes" : "No"}, ${n} votes`}
                        whileTap={reduce ? undefined : { scale: 0.9 }}
                        onClick={() => vote(r.id, v)}
                        className={cn(
                          "inline-flex h-7 items-center gap-1 rounded-full px-2 font-medium transition-colors",
                          on ? (v === "up" ? "bg-volt-soft text-volt-ink" : "bg-surface-sunken text-ink") : "hover:bg-surface-hover hover:text-ink",
                          focus,
                        )}
                      >
                        <Icon aria-hidden className="size-3.5" fill={on ? "currentColor" : "none"} />
                        <Count value={n} reduce={reduce} />
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
