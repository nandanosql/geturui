"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BadgeCheck, ChevronLeft, ChevronRight, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ReviewPhoto {
  alt: string;
  /** Real image URL. When omitted a drawn placeholder scene is used. */
  src?: string;
  /** Placeholder scene and its three tones (background, surface, object). */
  scene?: "still" | "detail" | "stack" | "window";
  tones?: [string, string, string];
}

export interface PhotoReviewCardProps {
  author?: string;
  initials?: string;
  date?: string;
  rating?: number;
  title?: string;
  body?: string;
  photos?: ReviewPhoto[];
  className?: string;
}

const DEFAULT_PHOTOS: ReviewPhoto[] = [
  { alt: "Mug on an oak table in morning light", scene: "still", tones: ["#d8cdbd", "#a98a66", "#3f4b41"] },
  { alt: "Close-up of the speckled glaze", scene: "detail", tones: ["#33403a", "#56665b", "#e7dfd1"] },
  { alt: "Three mugs stacked on a shelf", scene: "stack", tones: ["#e9e3d8", "#c8bba6", "#4a5a4e"] },
  { alt: "Mug by a window with steam rising", scene: "window", tones: ["#bfae96", "#efe8dc", "#2e3a32"] },
];

const focus = "outline-none focus-visible:shadow-[var(--focus-ring)]";
const ctl = cn("grid size-8 place-items-center rounded-full border border-border bg-surface text-ink hover:border-border-strong", focus);

function Scene({ photo }: { photo: ReviewPhoto }) {
  if (photo.src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo.src} alt="" className="size-full object-cover" />;
  }
  const [bg, mid, obj] = photo.tones ?? ["#d8cdbd", "#a98a66", "#3f4b41"];
  return (
    <svg viewBox="0 0 120 120" preserveAspectRatio="xMidYMid slice" className="size-full" aria-hidden>
      <rect width="120" height="120" fill={bg} />
      {photo.scene === "detail" ? (
        <>
          <circle cx="60" cy="60" r="70" fill={mid} />
          {[[30, 34, 3], [72, 28, 2], [88, 66, 4], [44, 80, 2.5], [64, 54, 1.8], [20, 70, 2], [96, 98, 3]].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill={obj} opacity={0.85} />
          ))}
          <path d="M0 96c20-8 40 6 60-2s40-10 60 0v26H0z" fill={bg} opacity={0.6} />
        </>
      ) : photo.scene === "stack" ? (
        <>
          <rect y="84" width="120" height="36" fill={mid} />
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${30 + i * 4} ${74 - i * 18})`}>
              <rect width="44" height="20" rx="4" fill={obj} opacity={1 - i * 0.18} />
              <ellipse cx="22" cy="1" rx="22" ry="3" fill={bg} opacity={0.35} />
            </g>
          ))}
        </>
      ) : photo.scene === "window" ? (
        <>
          <rect x="62" y="10" width="46" height="62" rx="2" fill={mid} />
          <path d="M85 10v62M62 41h46" stroke={bg} strokeWidth="2" />
          <rect y="88" width="120" height="32" fill={obj} opacity={0.25} />
          <path d="M28 60h34v26a8 8 0 0 1-8 8H36a8 8 0 0 1-8-8z" fill={obj} />
          <path d="M62 66h4a7 7 0 0 1 0 14h-4" fill="none" stroke={obj} strokeWidth="3.5" />
          <path d="M40 52c-4-6 4-8 0-14M50 52c-4-6 4-8 0-14" fill="none" stroke={mid} strokeWidth="2" strokeLinecap="round" opacity={0.8} />
        </>
      ) : (
        <>
          <rect y="78" width="120" height="42" fill={mid} />
          <ellipse cx="58" cy="92" rx="30" ry="5" fill={obj} opacity={0.25} />
          <path d="M38 48h40v34a10 10 0 0 1-10 10H48a10 10 0 0 1-10-10z" fill={obj} />
          <path d="M78 56h5a9 9 0 0 1 0 18h-5" fill="none" stroke={obj} strokeWidth="4" />
          <rect x="38" y="48" width="40" height="5" fill={bg} opacity={0.25} />
        </>
      )}
    </svg>
  );
}

/** Review with a drawn photo strip: tap a thumbnail and it grows into a viewer inside the card, with arrow keys and Escape. */
export function PhotoReviewCard({
  author = "Ines Duarte",
  initials = "ID",
  date = "Sep 30, 2026",
  rating = 5,
  title = "Glaze looks even better in person",
  body = "Ordered four in moss. Each one is slightly different, which I love. They hold heat well and the handle fits two fingers comfortably.",
  photos = DEFAULT_PHOTOS,
  className,
}: PhotoReviewCardProps) {
  const reduce = useReducedMotion() ?? false;
  const [open, setOpen] = React.useState<number | null>(null);
  const baseId = React.useId();
  const viewerRef = React.useRef<HTMLDivElement>(null);
  const thumbs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 340, damping: 32 };

  React.useEffect(() => {
    if (open !== null) viewerRef.current?.focus();
  }, [open]);

  function close() {
    const i = open;
    setOpen(null);
    if (i !== null) requestAnimationFrame(() => thumbs.current[i]?.focus());
  }

  function step(d: number) {
    setOpen((o) => (o === null ? o : (o + d + photos.length) % photos.length));
  }

  return (
    <article className={cn("relative w-full max-w-[420px] overflow-hidden rounded-xl border border-border bg-surface-raised p-5 shadow-sm", className)}>
      <header className="flex items-center gap-3">
        <span aria-hidden className="grid size-9 place-items-center rounded-full bg-surface-sunken font-mono text-[11px] font-semibold text-ink">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{author}</p>
          <p className="inline-flex items-center gap-1 text-[11.5px] text-success">
            <BadgeCheck aria-hidden className="size-3.5" />
            Verified buyer <span className="text-ink-subtle">· {date}</span>
          </p>
        </div>
        <span className="flex gap-px" role="img" aria-label={`${rating} out of 5`}>
          {Array.from({ length: 5 }, (_, s) => (
            <Star key={s} aria-hidden className={cn("size-3.5", s < rating ? "text-volt-ink" : "text-ink-subtle/35")} fill="currentColor" strokeWidth={0} />
          ))}
        </span>
      </header>
      <h3 className="mt-4 text-[15px] font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-[13.5px] leading-relaxed text-ink-muted">{body}</p>

      <ul aria-label={`${photos.length} photos`} className="mt-4 grid grid-cols-4 gap-2">
        {photos.map((p, i) => (
          <li key={i}>
            <motion.button
              ref={(el) => {
                thumbs.current[i] = el;
              }}
              type="button"
              aria-label={`Open photo ${i + 1}: ${p.alt}`}
              onClick={() => setOpen(i)}
              whileHover={reduce ? undefined : { y: -2 }}
              whileTap={reduce ? undefined : { scale: 0.96 }}
              className={cn("block aspect-square w-full overflow-hidden rounded-md", focus)}
            >
              {open !== i ? (
                <motion.span layoutId={`${baseId}-p${i}`} transition={spring} className="block size-full overflow-hidden rounded-md">
                  <Scene photo={p} />
                </motion.span>
              ) : (
                <span className="block size-full rounded-md bg-surface-sunken" />
              )}
            </motion.button>
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {open !== null && (
          <motion.div
            ref={viewerRef}
            role="dialog"
            aria-label={`Photo ${open + 1} of ${photos.length}`}
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === "Escape") close();
              if (e.key === "ArrowRight") step(1);
              if (e.key === "ArrowLeft") step(-1);
            }}
            className="absolute inset-0 z-10 flex flex-col p-3 outline-none"
          >
            <motion.div aria-hidden initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-surface-raised" />
            <motion.div key={open} layoutId={`${baseId}-p${open}`} transition={spring} className="relative min-h-0 flex-1 overflow-hidden rounded-lg shadow-lg">
              <Scene photo={photos[open]} />
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative mt-2 flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-xs text-ink-muted">{photos[open].alt}</p>
              <span className="font-mono text-[11px] text-ink-subtle">
                {open + 1}/{photos.length}
              </span>
              <button type="button" aria-label="Previous photo" onClick={() => step(-1)} className={ctl}>
                <ChevronLeft aria-hidden className="size-4" />
              </button>
              <button type="button" aria-label="Next photo" onClick={() => step(1)} className={ctl}>
                <ChevronRight aria-hidden className="size-4" />
              </button>
              <button type="button" aria-label="Close photo" onClick={close} className={ctl}>
                <X aria-hidden className="size-4" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}
