"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ReviewDraft {
  rating: number;
  text: string;
  tags: string[];
}

export interface WriteReviewCardProps {
  /** What is being reviewed. */
  product?: string;
  /** Words shown for 1–5 stars. */
  labels?: [string, string, string, string, string];
  /** Quick tags the reviewer can toggle. */
  tags?: string[];
  maxLength?: number;
  onSubmit?: (review: ReviewDraft) => void;
  className?: string;
}

const focus = "outline-none focus-visible:shadow-[var(--focus-ring)]";
const fade = { initial: { opacity: 0, filter: "blur(8px)" }, animate: { opacity: 1, filter: "blur(0px)" }, exit: { opacity: 0, filter: "blur(8px)" } };

/** Review composer: a keyboard-friendly star radio group that pops on select, quick tags, a counted text box and a crossfade to a thank-you state. */
export function WriteReviewCard({
  product = "Arden Wool Throw",
  labels = ["Not for me", "Below expectations", "It’s fine", "Really good", "Love it"],
  tags = ["Soft", "True to colour", "Warm", "Well packaged", "Pills easily"],
  maxLength = 400,
  onSubmit,
  className,
}: WriteReviewCardProps) {
  const reduce = useReducedMotion() ?? false;
  const [rating, setRating] = React.useState(0);
  const [hover, setHover] = React.useState(0);
  const [text, setText] = React.useState("");
  const [picked, setPicked] = React.useState<string[]>([]);
  const [sent, setSent] = React.useState(false);
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const textId = React.useId();
  const shown = hover || rating;

  function pick(n: number) {
    setRating(n);
    refs.current[n - 1]?.focus();
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      pick(Math.min(5, (rating || 0) + 1));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      pick(Math.max(1, (rating || 2) - 1));
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return;
    onSubmit?.({ rating, text: text.trim(), tags: picked });
    setSent(true);
  }

  function reset() {
    setSent(false);
    setRating(0);
    setText("");
    setPicked([]);
  }

  return (
    <section aria-label={`Review ${product}`} className={cn("w-full max-w-[400px] overflow-hidden rounded-xl border border-border bg-surface-raised shadow-sm", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        {sent ? (
          <motion.div key="done" {...fade} className="flex flex-col items-center px-6 py-10 text-center">
            <motion.span
              initial={reduce ? false : { scale: 0.4, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 16 }}
              className="grid size-12 place-items-center rounded-full bg-volt text-on-volt"
            >
              <Check aria-hidden className="size-6" strokeWidth={2.5} />
            </motion.span>
            <h3 className="mt-4 text-base font-semibold text-ink">Thanks, your review is in</h3>
            <p className="mt-1 max-w-[260px] text-sm text-ink-muted">It will appear on {product} after a quick check, usually within an hour.</p>
            <button type="button" onClick={reset} className={cn("mt-5 h-9 rounded-full border border-border-strong/50 px-4 text-[13px] font-medium text-ink hover:bg-surface-hover", focus)}>
              Edit your review
            </button>
          </motion.div>
        ) : (
          <motion.form key="form" {...fade} onSubmit={submit} className="p-5">
            <p className="text-xs font-medium text-ink-subtle">Your review</p>
            <h3 className="mt-0.5 text-base font-semibold text-ink">{product}</h3>

            <div className="mt-4 flex items-center gap-3">
              <div role="radiogroup" aria-label="Rating" onKeyDown={onKey} onMouseLeave={() => setHover(0)} className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => {
                  const lit = n <= shown;
                  return (
                    <motion.button
                      key={n}
                      ref={(el) => {
                        refs.current[n - 1] = el;
                      }}
                      type="button"
                      role="radio"
                      aria-checked={rating === n}
                      aria-label={`${n} star${n > 1 ? "s" : ""}, ${labels[n - 1]}`}
                      tabIndex={rating ? (rating === n ? 0 : -1) : n === 1 ? 0 : -1}
                      onMouseEnter={() => setHover(n)}
                      onClick={() => setRating(n)}
                      whileTap={reduce ? undefined : { scale: 0.85 }}
                      animate={reduce ? undefined : { scale: rating === n ? [1, 1.25, 1] : 1 }}
                      transition={{ duration: 0.35 }}
                      className={cn("grid size-9 place-items-center rounded-sm", focus)}
                    >
                      <Star aria-hidden className={cn("size-7 transition-colors duration-150", lit ? "text-volt-ink" : "text-ink-subtle/35")} fill="currentColor" strokeWidth={0} />
                    </motion.button>
                  );
                })}
              </div>
              <div className="relative h-5 min-w-0 flex-1">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span key={shown} {...fade} transition={{ duration: 0.18 }} className={cn("absolute inset-0 truncate text-sm", shown ? "font-medium text-ink" : "text-ink-subtle")}>
                    {shown ? labels[shown - 1] : "Tap to rate"}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>

            <div role="group" aria-label="Quick tags" className="mt-4 flex flex-wrap gap-1.5">
              {tags.map((t) => {
                const on = picked.includes(t);
                return (
                  <motion.button
                    key={t}
                    type="button"
                    aria-pressed={on}
                    whileTap={reduce ? undefined : { scale: 0.94 }}
                    onClick={() => setPicked((p) => (on ? p.filter((x) => x !== t) : [...p, t]))}
                    className={cn(
                      "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs transition-colors",
                      on ? "border-ink bg-ink text-bg" : "border-border-strong/40 text-ink-muted hover:text-ink",
                      focus,
                    )}
                  >
                    {on && <Check aria-hidden className="size-3" strokeWidth={3} />}
                    {t}
                  </motion.button>
                );
              })}
            </div>

            <label htmlFor={textId} className="mt-4 block text-xs font-medium text-ink-muted">
              Tell others what stood out
            </label>
            <div className="relative mt-1.5">
              <textarea
                id={textId}
                value={text}
                maxLength={maxLength}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                placeholder="How does it feel after a few weeks of use?"
                className="w-full resize-none rounded-md border border-border-strong/40 bg-surface px-3 py-2.5 pb-6 text-sm text-ink placeholder:text-ink-subtle outline-none transition-colors focus:border-volt-ink"
              />
              <span aria-live="polite" className={cn("pointer-events-none absolute bottom-2 right-3 font-mono text-[10.5px] tabular-nums", text.length > maxLength * 0.9 ? "text-warning" : "text-ink-subtle")}>
                {text.length}/{maxLength}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-[11.5px] text-ink-subtle">{rating ? "Posted with your first name" : "Choose a rating to post"}</p>
              <motion.button
                type="submit"
                disabled={!rating}
                whileTap={rating && !reduce ? { scale: 0.96 } : undefined}
                className={cn("h-9 shrink-0 rounded-full bg-volt px-4 text-[13px] font-semibold text-on-volt transition-opacity disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-subtle", focus)}
              >
                Post review
              </motion.button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </section>
  );
}
