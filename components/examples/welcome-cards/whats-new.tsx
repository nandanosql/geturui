"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WhatsNewSlide {
  title: string;
  body: string;
  art?: "branches" | "search" | "audit";
  /** Marks the feature as Pro; its button becomes an upgrade. */
  pro?: boolean;
}

export interface WhatsNewCardProps {
  version?: string;
  slides?: WhatsNewSlide[];
  onTry?: (slide: WhatsNewSlide) => void;
  onUpgrade?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const DEFAULT_SLIDES: WhatsNewSlide[] = [
  { title: "Branches for docs", body: "Draft big changes on a branch, get a review, and merge when it reads right.", art: "branches" },
  { title: "Search that reads your mind", body: "Fuzzy matching across tasks, docs and comments. Press / anywhere to start.", art: "search" },
  { title: "Audit log with export", body: "Every permission change and sign-in, filterable and exportable to CSV.", art: "audit", pro: true },
];

const focus = "outline-none focus-visible:shadow-[var(--focus-ring)]";

function Art({ kind }: { kind: WhatsNewSlide["art"] }) {
  return (
    <svg viewBox="0 0 320 120" className="size-full" aria-hidden>
      <rect width="320" height="120" className="fill-surface-sunken" />
      {kind === "search" ? (
        <g>
          <rect x="50" y="26" width="220" height="30" rx="10" className="fill-surface-raised stroke-border" />
          <circle cx="68" cy="41" r="5" fill="none" strokeWidth="2" className="stroke-ink-subtle" />
          <rect x="82" y="38" width="70" height="6" rx="3" className="fill-ink/70" />
          <rect x="50" y="64" width="220" height="38" rx="10" className="fill-surface-raised stroke-border" />
          <rect x="62" y="74" width="8" height="8" rx="2" className="fill-volt" />
          <rect x="78" y="76" width="110" height="5" rx="2.5" className="fill-ink/50" />
          <rect x="62" y="88" width="8" height="8" rx="2" className="fill-ink-subtle/40" />
          <rect x="78" y="90" width="80" height="5" rx="2.5" className="fill-ink/25" />
        </g>
      ) : kind === "audit" ? (
        <g>
          {[0, 1, 2, 3].map((r) => (
            <g key={r} transform={`translate(40 ${20 + r * 22})`}>
              <rect width="240" height="16" rx="5" className={r === 1 ? "fill-ember-soft" : "fill-surface-raised"} />
              <circle cx="12" cy="8" r="4" className={r === 1 ? "fill-ember" : "fill-ink-subtle/50"} />
              <rect x="24" y="5.5" width={90 - r * 10} height="5" rx="2.5" className="fill-ink/40" />
              <rect x="190" y="5.5" width="38" height="5" rx="2.5" className="fill-ink/20" />
            </g>
          ))}
        </g>
      ) : (
        <g fill="none" strokeWidth="2.5" strokeLinecap="round">
          <path d="M30 70h260" className="stroke-ink/30" />
          <path d="M90 70c20 0 20-34 46-34h70c26 0 26 34 46 34" className="stroke-volt-ink" />
          {[30, 90, 290].map((x) => (
            <circle key={x} cx={x} cy="70" r="7" className="fill-surface-raised stroke-ink/40" />
          ))}
          {[150, 200].map((x) => (
            <circle key={x} cx={x} cy="36" r="7" className="fill-volt stroke-volt-ink" />
          ))}
          <circle cx="252" cy="70" r="7" className="fill-surface-raised stroke-volt-ink" />
        </g>
      )}
    </svg>
  );
}

/** Release card: swipe or step through what shipped, with drawn art per feature and a Pro feature that turns the button into an upgrade. */
export function WhatsNewCard({ version = "Version 4.2 · Oct 2", slides = DEFAULT_SLIDES, onTry, onUpgrade, onDismiss, className }: WhatsNewCardProps) {
  const reduce = useReducedMotion() ?? false;
  const [[i, dir], setPage] = React.useState<[number, number]>([0, 1]);
  const slide = slides[i];
  const last = i === slides.length - 1;

  function go(d: number) {
    const n = i + d;
    if (n < 0 || n >= slides.length) return;
    setPage([n, d]);
  }

  const fade = (key: string, content: React.ReactNode, cls?: string) => (
    <motion.div
      key={key}
      initial={reduce ? { opacity: 0 } : { opacity: 0, x: dir * 28, filter: "blur(6px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: dir * -28, filter: "blur(6px)" }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      className={cls}
    >
      {content}
    </motion.div>
  );

  return (
    <section
      aria-roledescription="carousel"
      aria-label="What’s new"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
      className={cn("w-full max-w-[400px] overflow-hidden rounded-xl border border-border bg-surface-raised shadow-sm", className)}
    >
      <div className="flex items-center justify-between px-5 pt-4">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink">
          <Sparkles aria-hidden className="size-3.5 text-volt-ink" />
          What’s new
          <span className="font-normal text-ink-subtle">· {version}</span>
        </span>
        <button type="button" aria-label="Dismiss" onClick={onDismiss} className={cn("grid size-7 place-items-center rounded-full text-ink-subtle hover:bg-surface-hover hover:text-ink", focus)}>
          <X aria-hidden className="size-4" />
        </button>
      </div>

      <motion.div
        drag={reduce ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.18}
        onDragEnd={(_, info) => {
          if (info.offset.x < -50) go(1);
          else if (info.offset.x > 50) go(-1);
        }}
        className="mx-5 mt-3 h-[120px] cursor-grab overflow-hidden rounded-lg border border-border active:cursor-grabbing"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {fade(`art-${i}`, <Art kind={slide.art} />, "size-full")}
        </AnimatePresence>
      </motion.div>

      <div className="relative h-[92px] overflow-hidden px-5 pt-4" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          {fade(
            `t-${i}`,
            <>
              <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                {slide.title}
                {slide.pro && <span className="rounded-full bg-ember-soft px-2 py-0.5 text-[10.5px] font-semibold text-ember-ink">Pro</span>}
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{slide.body}</p>
            </>,
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3.5">
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Previous update" disabled={i === 0} onClick={() => go(-1)} className={cn("grid size-8 place-items-center rounded-full text-ink-muted hover:bg-surface-hover disabled:opacity-30", focus)}>
            <ChevronLeft aria-hidden className="size-4" />
          </button>
          <div className="flex gap-1.5" aria-label={`Update ${i + 1} of ${slides.length}`} role="img">
            {slides.map((_, k) => (
              <motion.span key={k} animate={{ width: k === i ? 16 : 6 }} transition={{ type: "spring", stiffness: 420, damping: 30 }} className={cn("h-1.5 rounded-full", k === i ? "bg-ink" : "bg-ink-subtle/35")} />
            ))}
          </div>
          <button type="button" aria-label="Next update" disabled={last} onClick={() => go(1)} className={cn("grid size-8 place-items-center rounded-full text-ink-muted hover:bg-surface-hover disabled:opacity-30", focus)}>
            <ChevronRight aria-hidden className="size-4" />
          </button>
        </div>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.button
            key={slide.pro ? "pro" : "try"}
            type="button"
            initial={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
            whileTap={reduce ? undefined : { scale: 0.96 }}
            onClick={() => (slide.pro ? onUpgrade?.() : onTry?.(slide))}
            className={cn("inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold", slide.pro ? "bg-ember text-on-ember" : "bg-volt text-on-volt", focus)}
          >
            {slide.pro ? "Upgrade to Pro" : "Try it now"}
            <ArrowRight aria-hidden className="size-3.5" />
          </motion.button>
        </AnimatePresence>
      </div>
    </section>
  );
}
