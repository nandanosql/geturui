"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CompactPost {
  id: string;
  title: string;
  category: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  readingMinutes: number;
  /** How much the reader has read, 0 to 1. */
  progress?: number;
  href?: string;
}

export interface CompactBlogListProps {
  heading?: string;
  posts?: CompactPost[];
  /** Link for the "View all" action. */
  allHref?: string;
  onSelect?: (post: CompactPost) => void;
  className?: string;
}

const DEFAULT_POSTS: CompactPost[] = [
  { id: "p1", title: "Designing empty states people actually read", category: "Product", date: "2026-09-30", readingMinutes: 6, progress: 1 },
  { id: "p2", title: "A practical guide to spring easing in CSS", category: "Motion", date: "2026-09-26", readingMinutes: 9, progress: 0.45 },
  { id: "p3", title: "What we learned shipping dark mode first", category: "Engineering", date: "2026-09-19", readingMinutes: 7, progress: 0 },
  { id: "p4", title: "Tokens, not themes: naming color for scale", category: "Design systems", date: "2026-09-12", readingMinutes: 11, progress: 0.2 },
];

const shortDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function ProgressRing({ value, reduce }: { value: number; reduce: boolean }) {
  const done = value >= 1;
  return (
    <span className="relative grid size-8 shrink-0 place-items-center">
      <svg viewBox="0 0 32 32" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="16" cy="16" r="13" fill="none" strokeWidth="2.5" className="stroke-ink/10" />
        {value > 0 && (
          <motion.circle
            cx="16"
            cy="16"
            r="13"
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="stroke-volt-ink"
            initial={{ pathLength: reduce ? value : 0 }}
            animate={{ pathLength: value }}
            transition={{ type: "spring", stiffness: 120, damping: 22, delay: 0.15 }}
          />
        )}
      </svg>
      {done ? (
        <Check aria-hidden className="size-3.5 text-volt-ink" strokeWidth={3} />
      ) : value === 0 ? null : (
        <span aria-hidden className="font-mono text-[9px] text-ink-subtle">
          {Math.round(value * 100)}
        </span>
      )}
      <span className="sr-only">{done ? "Finished" : value > 0 ? `${Math.round(value * 100)}% read` : "Not started"}</span>
    </span>
  );
}

/** Compact list of posts with reading-progress rings, a highlight that glides between rows and arrow-key navigation. */
export function CompactBlogList({ heading = "Latest from the journal", posts = DEFAULT_POSTS, allHref = "#", onSelect, className }: CompactBlogListProps) {
  const reduce = useReducedMotion() ?? false;
  const id = React.useId();
  const [active, setActive] = React.useState<number | null>(null);
  const links = React.useRef<(HTMLAnchorElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent<HTMLUListElement>) {
    const current = links.current.findIndex((el) => el === document.activeElement);
    if (current < 0) return;
    const next =
      e.key === "ArrowDown" ? Math.min(posts.length - 1, current + 1) : e.key === "ArrowUp" ? Math.max(0, current - 1) : e.key === "Home" ? 0 : e.key === "End" ? posts.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    links.current[next]?.focus();
  }

  return (
    <section aria-labelledby={`${id}-h`} className={cn("w-full max-w-[460px] rounded-xl border border-border bg-surface-raised p-2 shadow-sm", className)}>
      <div className="flex items-center justify-between px-3 pb-2 pt-2.5">
        <h3 id={`${id}-h`} className="font-display text-[15px] font-semibold tracking-[-0.2px] text-ink">
          {heading}
        </h3>
        <a
          href={allHref}
          className="group inline-flex items-center gap-1 rounded-xs px-1.5 py-0.5 text-[12.5px] font-medium text-ink-muted outline-none transition-colors hover:text-ink focus-visible:shadow-[var(--focus-ring)]"
        >
          View all
          <ArrowRight aria-hidden className="size-3.5 transition-[translate] duration-200 group-hover:translate-x-0.5" />
        </a>
      </div>
      <ul onKeyDown={onKeyDown} onPointerLeave={() => setActive(null)} className="flex flex-col">
        {posts.map((post, i) => (
          <li key={post.id} className="relative">
            {active === i && (
              <motion.span
                layoutId={reduce ? undefined : `${id}-hl`}
                aria-hidden
                className="absolute inset-0 rounded-lg bg-surface-hover"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <a
              ref={(el) => {
                links.current[i] = el;
              }}
              href={post.href ?? "#"}
              onClick={() => onSelect?.(post)}
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              className="relative flex items-center gap-3 rounded-lg px-3 py-3 outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              <ProgressRing value={post.progress ?? 0} reduce={reduce} />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-[14px] font-medium leading-5 text-ink">{post.title}</span>
                <span className="mt-0.5 block text-xs text-ink-subtle">
                  {post.category} · <time dateTime={post.date}>{shortDate(post.date)}</time>
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-surface-sunken px-2 py-0.5 font-mono text-[11px] tabular-nums text-ink-muted">{post.readingMinutes} min</span>
            </a>
            {i < posts.length - 1 && <span aria-hidden className="absolute inset-x-3 bottom-0 h-px bg-border" />}
          </li>
        ))}
      </ul>
    </section>
  );
}
