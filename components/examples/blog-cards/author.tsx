"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Bookmark, Check, Link2, Quote } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AuthorBlogCardProps {
  author?: string;
  role?: string;
  /** Initials for the avatar; derived from `author` when omitted. */
  monogram?: string;
  title?: string;
  /** A line pulled from the post, shown large. */
  quote?: string;
  /** ISO date (YYYY-MM-DD). */
  date?: string;
  readingMinutes?: number;
  href?: string;
  /** Absolute URL copied by the share button. */
  shareUrl?: string;
  saves?: number;
  /** Controlled bookmark state. */
  saved?: boolean;
  defaultSaved?: boolean;
  onSavedChange?: (saved: boolean) => void;
  className?: string;
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const spring = { type: "spring", stiffness: 420, damping: 30 } as const;

/** Author-led card: byline first, a pull quote from the post, and a bookmark that pops and ticks its count with a copy-link action beside it. */
export function AuthorBlogCard({
  author = "Tomás Ferreira",
  role = "Staff engineer, Payments",
  monogram,
  title = "We deleted half our loading spinners. Conversion went up.",
  quote = "A spinner promises progress it can't show. A skeleton shows the shape of what's coming, and people wait for shapes.",
  date = "2026-09-24",
  readingMinutes = 6,
  href = "#",
  shareUrl = "https://geturui.com/journal/fewer-spinners",
  saves = 214,
  saved,
  defaultSaved = false,
  onSavedChange,
  className,
}: AuthorBlogCardProps) {
  const reduce = useReducedMotion() ?? false;
  const [inner, setInner] = React.useState(defaultSaved);
  const isSaved = saved ?? inner;
  const count = saves + (isSaved ? 1 : 0) - (defaultSaved ? 1 : 0);
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = React.useId();

  React.useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function toggleSave() {
    const next = !isSaved;
    if (saved === undefined) setInner(next);
    onSavedChange?.(next);
  }

  async function copy() {
    try {
      await navigator.clipboard?.writeText(shareUrl);
    } catch {
      // Clipboard can be blocked; the confirmation still shows so the action feels complete.
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  }

  const date_ = new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
  const iconBtn =
    "inline-flex h-9 items-center gap-1.5 rounded-full border border-border-strong px-3 text-[13px] font-medium text-ink outline-none transition-colors hover:bg-surface-hover focus-visible:shadow-[var(--focus-ring)]";

  return (
    <article aria-labelledby={`${id}-t`} className={cn("w-full max-w-[400px] rounded-xl border border-border bg-surface-raised p-5 shadow-sm", className)}>
      <header className="flex items-center gap-3">
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-ink font-display text-[15px] font-semibold text-bg">
          {monogram ?? initialsOf(author)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-ink">{author}</p>
          <p className="truncate text-xs text-ink-subtle">{role}</p>
        </div>
      </header>

      <figure className="relative mt-5 rounded-lg bg-surface-sunken px-5 pb-5 pt-11">
        <Quote aria-hidden className="absolute left-5 top-4 size-5 fill-volt-ink/20 text-volt-ink" />
        <blockquote className="font-display text-[18px] font-medium leading-[1.35] tracking-[-0.3px] text-ink">{quote}</blockquote>
      </figure>

      <h3 id={`${id}-t`} className="mt-4 text-[15px] font-semibold leading-snug text-ink">
        <a href={href} className="rounded-xs outline-none decoration-ink/30 underline-offset-4 hover:underline focus-visible:shadow-[var(--focus-ring)]">
          {title}
        </a>
      </h3>
      <p className="mt-1 text-xs text-ink-subtle">
        <time dateTime={date}>{date_}</time> · {readingMinutes} min read
      </p>

      <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
        <motion.button
          type="button"
          aria-pressed={isSaved}
          aria-label={isSaved ? "Remove from saved" : "Save for later"}
          onClick={toggleSave}
          whileTap={reduce ? undefined : { scale: 0.94 }}
          transition={spring}
          className={cn(iconBtn, isSaved && "border-transparent bg-ink text-bg hover:bg-ink")}
        >
          <motion.span key={String(isSaved)} initial={reduce || !isSaved ? false : { scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 520, damping: 14 }}>
            <Bookmark aria-hidden className={cn("size-4", isSaved && "fill-current")} />
          </motion.span>
          <span className="relative inline-flex overflow-hidden tabular-nums">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={count}
                initial={reduce ? { opacity: 0 } : { y: isSaved ? 12 : -12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={reduce ? { opacity: 0 } : { y: isSaved ? -12 : 12, opacity: 0 }}
                transition={spring}
              >
                {count.toLocaleString("en-US")}
              </motion.span>
            </AnimatePresence>
          </span>
        </motion.button>

        <motion.button type="button" onClick={copy} whileTap={reduce ? undefined : { scale: 0.94 }} className={iconBtn}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={copied ? "c" : "l"}
              initial={{ opacity: 0, filter: "blur(6px)", y: reduce ? 0 : 6 }}
              animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              exit={{ opacity: 0, filter: "blur(6px)", y: reduce ? 0 : -6 }}
              transition={{ duration: 0.18 }}
              className="inline-flex items-center gap-1.5"
            >
              {copied ? <Check aria-hidden className="size-4 text-volt-ink" strokeWidth={2.5} /> : <Link2 aria-hidden className="size-4" />}
              {copied ? "Copied" : "Copy link"}
            </motion.span>
          </AnimatePresence>
        </motion.button>
        <span role="status" className="sr-only">
          {copied ? "Link copied" : ""}
        </span>
      </div>
    </article>
  );
}
