"use client";

import * as React from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "motion/react";
import { ArrowUpRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EditorialBlogCardProps {
  category?: string;
  title?: string;
  excerpt?: string;
  author?: string;
  /** Initials for the author avatar; derived from `author` when omitted. */
  monogram?: string;
  /** ISO date (YYYY-MM-DD), shown as "Oct 2, 2026". */
  date?: string;
  readingMinutes?: number;
  /** Short label printed on the cover, e.g. an issue number. */
  issue?: string;
  href?: string;
  onOpen?: () => void;
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

const formatPostDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

function useDepth(source: MotionValue<number>, depth: number) {
  return useTransform(source, (v) => v * depth);
}

/** Editorial cover card: a drawn type-specimen cover that drifts in layers under the pointer, with category, title, excerpt and byline. */
export function EditorialBlogCard({
  category = "Typography",
  title = "The quiet return of serif type in product interfaces",
  excerpt = "Teams are trading neutral grotesques for warmer serifs in headings. We looked at 40 launches this year to see where it works and where it gets in the way.",
  author = "Iris Calder",
  monogram,
  date = "2026-09-28",
  readingMinutes = 8,
  issue = "Issue 14",
  href = "#",
  onOpen,
  className,
}: EditorialBlogCardProps) {
  const reduce = useReducedMotion() ?? false;
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 150, damping: 20 });
  const sy = useSpring(py, { stiffness: 150, damping: 20 });
  const backX = useDepth(sx, -8);
  const backY = useDepth(sy, -6);
  const midX = useDepth(sx, 10);
  const midY = useDepth(sy, 8);
  const frontX = useDepth(sx, 22);
  const frontY = useDepth(sy, 16);

  function onMove(e: React.PointerEvent<HTMLAnchorElement>) {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  }

  function onLeave() {
    px.set(0);
    py.set(0);
  }

  return (
    <motion.a
      href={href}
      onClick={onOpen}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      whileTap={reduce ? undefined : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      className={cn(
        "group block w-full max-w-[380px] overflow-hidden rounded-xl border border-border bg-surface-raised shadow-sm outline-none transition-shadow duration-300 hover:shadow-md focus-visible:shadow-[var(--focus-ring)]",
        className,
      )}
    >
      <div aria-hidden className="relative m-2 h-48 overflow-hidden rounded-lg bg-surface-sunken">
        <motion.span style={{ x: backX, y: backY }} className="absolute -right-10 -top-12 size-48 rounded-full border-[18px] border-ink/[0.07]" />
        <motion.div style={{ x: midX, y: midY }} className="absolute bottom-6 left-6 right-24 space-y-1.5">
          {[100, 86, 92, 64].map((w, i) => (
            <span key={i} className="block h-1.5 rounded-full bg-ink/10" style={{ width: `${w}%` }} />
          ))}
        </motion.div>
        <motion.span
          style={{ x: midX, y: midY }}
          className="absolute right-7 top-6 font-display text-[88px] font-semibold leading-none tracking-[-4px] text-ink/85 transition-transform duration-500 ease-spring-soft group-hover:scale-105"
        >
          Aa
        </motion.span>
        <motion.span style={{ x: frontX, y: frontY }} className="absolute bottom-8 right-10 size-11 rounded-full bg-volt shadow-glow" />
        <span className="absolute left-5 top-5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-subtle">{issue}</span>
      </div>

      <div className="px-5 pb-5 pt-3">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full border border-border px-2.5 py-0.5 text-[11.5px] font-medium text-ink-muted">{category}</span>
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded-full border border-border text-ink-muted transition-[translate,color,background-color] duration-300 ease-spring group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:bg-ink group-hover:text-bg"
          >
            <ArrowUpRight className="size-4" />
          </span>
        </div>
        <h3 className="mt-3 text-balance font-display text-[21px] font-semibold leading-[1.2] tracking-[-0.5px] text-ink">{title}</h3>
        <p className="mt-2 line-clamp-3 text-[13.5px] leading-5 text-ink-muted">{excerpt}</p>

        <div className="mt-4 flex items-center gap-2.5 border-t border-border pt-4">
          <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-ink font-display text-[11px] font-semibold text-bg">
            {monogram ?? initialsOf(author)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-ink">{author}</p>
            <p className="text-xs text-ink-subtle">
              <time dateTime={date}>{formatPostDate(date)}</time>
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs text-ink-subtle">
            <Clock aria-hidden className="size-3.5" />
            {readingMinutes} min read
          </span>
        </div>
      </div>
    </motion.a>
  );
}
