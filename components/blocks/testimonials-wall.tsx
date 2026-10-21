"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Marquee } from "@/components/ui/marquee";

export interface Testimonial {
  quote: string;
  name: string;
  /** Social handle, shown under the name, e.g. "@mira.codes". */
  handle: string;
  /** Optional role or company shown after the handle. */
  role?: string;
  /** 1–5; renders a star row when set. */
  rating?: number;
}

export interface TestimonialsWallProps {
  eyebrow?: string;
  heading?: string;
  subheading?: string;
  testimonials?: Testimonial[];
  /** Two opposing marquee rows, or a static masonry wall that staggers in. */
  variant?: "marquee" | "masonry";
  /** Seconds per marquee loop. */
  duration?: number;
  className?: string;
}

const DEFAULT_TESTIMONIALS: Testimonial[] = [
  { quote: "We replaced three hand-rolled animation helpers with GetUrUI in an afternoon. The springs just feel right.", name: "Mira Okafor", handle: "@mira.codes", role: "Design engineer, Halcyon", rating: 5 },
  { quote: "The pricing block converted better than our old page on day one. The rolling numbers make people play with the slider.", name: "Jonas Weber", handle: "@jonasbuilds", role: "Founder, Tidewave", rating: 5 },
  { quote: "Keyboard support is not an afterthought here. Our accessibility audit came back with nothing to fix.", name: "Priya Raman", handle: "@priyaux", role: "Accessibility lead", rating: 5 },
  { quote: "Copy-paste means I can actually read and change the code. No black-box package to fight.", name: "Leo Martins", handle: "@leom", role: "Staff engineer, Kestrel", rating: 5 },
  { quote: "Our docs finally feel alive. The marquee and the reveal text did more than any rebrand.", name: "Hana Sato", handle: "@hana.dev", role: "DevRel, Quillfire", rating: 4 },
  { quote: "Tokens map one to one to our design system, so dark mode shipped the same day as light.", name: "Ade Bello", handle: "@adebello", role: "Product designer", rating: 5 },
  { quote: "The notification stack is the most-copied thing in our internal Storybook. Everyone wants the swipe.", name: "Clara Novak", handle: "@claranovak", role: "Frontend, Mosswood", rating: 5 },
  { quote: "Reduced motion is respected everywhere. That alone saved us a sprint.", name: "Sam Whitfield", handle: "@samw", role: "Engineering manager", rating: 5 },
];

const AVATAR_TONES = ["bg-volt-soft text-volt-ink", "bg-ember-soft text-ember-ink", "bg-surface-raised text-ink ring-1 ring-inset ring-border"];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function QuoteCard({ t, index, className }: { t: Testimonial; index: number; className?: string }) {
  return (
    <figure className={cn("flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 transition-colors duration-200 hover:border-border-strong", className)}>
      {t.rating !== undefined && (
        <div className="flex gap-0.5 text-volt-ink" role="img" aria-label={`Rated ${t.rating} out of 5`}>
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} aria-hidden className={cn("size-3.5", i < (t.rating ?? 0) ? "fill-current" : "text-ink-subtle/50")} />
          ))}
        </div>
      )}
      <blockquote className="text-[14.5px] leading-[23px] text-ink">&ldquo;{t.quote}&rdquo;</blockquote>
      <figcaption className="mt-auto flex items-center gap-3">
        <span aria-hidden className={cn("grid size-9 shrink-0 place-items-center rounded-full text-[12px] font-semibold", AVATAR_TONES[index % AVATAR_TONES.length])}>
          {initials(t.name)}
        </span>
        <span className="grid min-w-0">
          <span className="truncate text-sm font-semibold text-ink">{t.name}</span>
          <span className="truncate text-[12.5px] text-ink-subtle">
            {t.handle}
            {t.role ? ` · ${t.role}` : ""}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}

/** Wall of quote cards: two marquee rows drifting in opposite directions, or a masonry grid whose cards stagger up into view. */
export function TestimonialsWall({
  eyebrow = "Loved by builders",
  heading = "Teams ship calmer interfaces with GetUrUI",
  subheading = "Thousands of developers use our components in dashboards, docs and storefronts.",
  testimonials = DEFAULT_TESTIMONIALS,
  variant = "marquee",
  duration = 48,
  className,
}: TestimonialsWallProps) {
  const reduce = useReducedMotion() ?? false;
  const half = Math.ceil(testimonials.length / 2);
  const rows = [testimonials.slice(0, half), testimonials.slice(half)];

  return (
    <section className={cn("@container w-full overflow-hidden py-16 sm:py-24", className)}>
      <header className="mx-auto mb-12 grid max-w-2xl gap-3 px-4 text-center @xl:px-6">
        {eyebrow && <span className="text-[13px] font-semibold uppercase tracking-[1px] text-volt-ink">{eyebrow}</span>}
        <h2 className="text-balance font-display text-3xl font-semibold tracking-[-0.8px] text-ink @xl:text-[40px] @xl:leading-[1.1]">{heading}</h2>
        {subheading && <p className="text-balance text-base leading-7 text-ink-muted">{subheading}</p>}
      </header>

      {variant === "marquee" ? (
        <div className="grid gap-4">
          {rows.map((row, r) =>
            row.length ? (
              <Marquee key={r} reverse={r === 1} duration={duration + r * 6}>
                {row.map((t, i) => (
                  <QuoteCard key={t.handle + i} t={t} index={i + r * half} className="w-[300px] shrink-0 @xl:w-[340px]" />
                ))}
              </Marquee>
            ) : null,
          )}
        </div>
      ) : (
        <div className="mx-auto max-w-6xl columns-1 gap-4 px-4 @xl:columns-2 @xl:px-6 @4xl:columns-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.handle + i}
              className="mb-4 break-inside-avoid"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20, filter: "blur(6px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ type: "spring", stiffness: 260, damping: 30, delay: (i % 3) * 0.08 }}
            >
              <QuoteCard t={t} index={i} />
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
