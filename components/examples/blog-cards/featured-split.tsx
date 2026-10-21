"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SeriesPart {
  title: string;
  excerpt: string;
  readingMinutes: number;
  href?: string;
}

export interface FeaturedBlogCardProps {
  /** Small label above the title. */
  eyebrow?: string;
  series?: string;
  parts?: SeriesPart[];
  defaultIndex?: number;
  onRead?: (part: SeriesPart, index: number) => void;
  className?: string;
}

const DEFAULT_PARTS: SeriesPart[] = [
  { title: "Start with the smallest token", excerpt: "Before components, before themes: how a single spacing scale shaped every decision that came after it.", readingMinutes: 7 },
  { title: "Motion that explains itself", excerpt: "Springs, distances and durations that tell people what just happened without asking them to watch.", readingMinutes: 9 },
  { title: "Layers, not lightboxes", excerpt: "Why we replaced most modals with panels that keep context in view, and what broke along the way.", readingMinutes: 8 },
  { title: "Shipping the system to 40 teams", excerpt: "Versioning, codemods and the release notes nobody skipped. The rollout playbook, step by step.", readingMinutes: 12 },
];

function Art({ index }: { index: number }) {
  const k = index % 4;
  return (
    <svg viewBox="0 0 200 160" className="size-full" aria-hidden>
      {k === 0 &&
        Array.from({ length: 20 }, (_, i) => (
          <rect key={i} x={28 + (i % 5) * 30} y={22 + Math.floor(i / 5) * 30} width="22" height="22" rx="6" className={i === 12 ? "fill-volt" : "fill-ink/10"} />
        ))}
      {k === 1 && (
        <g fill="none" strokeWidth="2">
          {[64, 48, 32].map((r) => (
            <circle key={r} cx="100" cy="80" r={r} className="stroke-ink/15" />
          ))}
          <circle cx="148" cy="56" r="9" className="fill-volt stroke-none" />
          <circle cx="100" cy="80" r="6" className="fill-ink/40 stroke-none" />
        </g>
      )}
      {k === 2 &&
        [0, 1, 2].map((i) => (
          <rect key={i} x={46 + i * 18} y={30 + i * 18} width="92" height="70" rx="12" className={i === 2 ? "fill-volt" : i === 1 ? "fill-ink/20" : "fill-ink/10"} />
        ))}
      {k === 3 &&
        Array.from({ length: 6 }, (_, i) => (
          <path
            key={i}
            d={`M10 ${40 + i * 16} C 60 ${20 + i * 16}, 120 ${70 + i * 16}, 190 ${36 + i * 16}`}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            className={i === 3 ? "stroke-volt" : "stroke-ink/15"}
          />
        ))}
    </svg>
  );
}

/** Featured split card for a multi-part series: step through parts with arrows while art and copy crossfade in the direction of travel. */
export function FeaturedBlogCard({
  eyebrow = "Featured series",
  series = "Building a design system in public",
  parts = DEFAULT_PARTS,
  defaultIndex = 1,
  onRead,
  className,
}: FeaturedBlogCardProps) {
  const reduce = useReducedMotion() ?? false;
  const [[index, dir], setState] = React.useState<[number, number]>([Math.min(defaultIndex, parts.length - 1), 0]);
  const part = parts[index];
  const id = React.useId();

  function go(delta: number) {
    const next = index + delta;
    if (next < 0 || next >= parts.length) return;
    setState([next, delta]);
  }

  const offset = reduce ? 0 : 16;
  const swap = {
    initial: (d: number) => ({ opacity: 0, x: d * offset, filter: "blur(8px)" }),
    animate: { opacity: 1, x: 0, filter: "blur(0px)" },
    exit: (d: number) => ({ opacity: 0, x: d * -offset, filter: "blur(8px)" }),
  };
  const btn =
    "grid size-9 place-items-center rounded-full border border-border-strong text-ink outline-none transition-colors hover:bg-surface-hover focus-visible:shadow-[var(--focus-ring)] disabled:opacity-35 disabled:hover:bg-transparent";

  return (
    <section
      aria-labelledby={`${id}-series`}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
      className={cn("grid w-full max-w-[680px] overflow-hidden rounded-xl border border-border bg-surface-raised shadow-sm sm:grid-cols-[1fr_1.1fr]", className)}
    >
      <div className="relative m-2 h-48 overflow-hidden rounded-lg bg-surface-sunken sm:h-auto sm:min-h-[260px]">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={index}
            custom={dir}
            variants={swap}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-0 p-4"
          >
            <Art index={index} />
          </motion.div>
        </AnimatePresence>
        <span className="absolute left-3 top-3 rounded-full bg-glass px-2.5 py-1 font-mono text-[11px] text-ink-muted backdrop-blur">
          Part {index + 1} of {parts.length}
        </span>
      </div>

      <div className="flex flex-col p-5 sm:p-6">
        <p className="text-xs font-medium text-ink-subtle">{eyebrow}</p>
        <p id={`${id}-series`} className="mt-0.5 text-[13px] text-ink-muted">
          {series}
        </p>
        <div aria-live="polite" className="relative mt-4 min-h-[132px]">
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.div key={index} custom={dir} variants={swap} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.22 }}>
              <h3 className="text-balance font-display text-[22px] font-semibold leading-[1.15] tracking-[-0.5px] text-ink">{part.title}</h3>
              <p className="mt-2 text-[13.5px] leading-5 text-ink-muted">{part.excerpt}</p>
              <p className="mt-3 inline-flex items-center gap-1 text-xs text-ink-subtle">
                <Clock aria-hidden className="size-3.5" />
                {part.readingMinutes} min read
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div aria-hidden className="mt-4 flex gap-1.5">
          {parts.map((_, i) => (
            <span key={i} className="relative h-1 flex-1 overflow-hidden rounded-full bg-ink/10">
              <motion.span
                className="absolute inset-0 origin-left rounded-full bg-ink"
                initial={false}
                animate={{ scaleX: i <= index ? 1 : 0, opacity: i === index ? 1 : 0.35 }}
                transition={{ type: "spring", stiffness: 260, damping: 30 }}
              />
            </span>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-2">
          <motion.a
            href={part.href ?? "#"}
            onClick={() => onRead?.(part, index)}
            whileTap={reduce ? undefined : { scale: 0.96 }}
            className="mr-auto inline-flex h-9 items-center gap-1.5 rounded-full bg-volt px-4 text-[13px] font-medium text-on-volt outline-none transition-shadow hover:shadow-glow focus-visible:shadow-[var(--focus-ring)]"
          >
            Read part {index + 1}
            <ArrowRight aria-hidden className="size-3.5" />
          </motion.a>
          <button type="button" aria-label="Previous part" disabled={index === 0} onClick={() => go(-1)} className={btn}>
            <ChevronLeft aria-hidden className="size-4" />
          </button>
          <button type="button" aria-label="Next part" disabled={index === parts.length - 1} onClick={() => go(1)} className={btn}>
            <ChevronRight aria-hidden className="size-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
