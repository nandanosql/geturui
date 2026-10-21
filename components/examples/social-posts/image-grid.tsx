"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Heart, MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type SceneKind = "dunes" | "harbour" | "ridge" | "market";

export interface PostImage {
  scene: SceneKind;
  alt: string;
}

export interface ImageGridPostProps {
  author?: string;
  place?: string;
  time?: string;
  caption?: string;
  images?: PostImage[];
  likes?: number;
  comments?: number;
  onLikeChange?: (liked: boolean) => void;
  className?: string;
}

const DEFAULT_IMAGES: PostImage[] = [
  { scene: "dunes", alt: "Sand dunes at first light under a pale sun" },
  { scene: "harbour", alt: "Fishing boats in a harbour wrapped in fog" },
  { scene: "ridge", alt: "Pine ridge in layers of blue haze" },
  { scene: "market", alt: "Night market lanterns strung over a street" },
];

function Scene({ kind }: { kind: SceneKind }) {
  return (
    <svg viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice" className="size-full" aria-hidden>
      {kind === "dunes" && (
        <>
          <rect width="160" height="120" fill="#f1d9b5" />
          <circle cx="112" cy="40" r="16" fill="#fff4dd" />
          <path d="M0 78 Q40 58 84 76 T160 70 V120 H0 Z" fill="#d9a46a" />
          <path d="M0 96 Q50 80 100 98 T160 92 V120 H0 Z" fill="#b97a45" />
        </>
      )}
      {kind === "harbour" && (
        <>
          <rect width="160" height="120" fill="#c9d3d8" />
          <rect y="74" width="160" height="46" fill="#8fa3ad" />
          <path d="M30 74 L40 52 L40 74 Z M90 74 L102 44 L102 74 Z" fill="#4c5f69" />
          <path d="M22 74 H54 L50 82 H26 Z M82 74 H118 L113 83 H87 Z" fill="#33434b" />
          <rect y="60" width="160" height="10" fill="#ffffff" opacity="0.35" />
        </>
      )}
      {kind === "ridge" && (
        <>
          <rect width="160" height="120" fill="#dfe8ee" />
          <path d="M0 70 L30 44 L56 62 L88 34 L124 60 L160 40 V120 H0 Z" fill="#9db3c4" />
          <path d="M0 88 L24 70 L52 84 L80 64 L112 86 L140 70 L160 80 V120 H0 Z" fill="#5d7a8f" />
          <path d="M0 104 L36 90 L70 104 L110 92 L160 102 V120 H0 Z" fill="#2f4656" />
        </>
      )}
      {kind === "market" && (
        <>
          <rect width="160" height="120" fill="#1f1d2b" />
          <path d="M0 26 Q80 50 160 22" fill="none" stroke="#3a3650" strokeWidth="1.5" />
          {[16, 40, 64, 88, 112, 136].map((x, i) => (
            <circle key={x} cx={x} cy={30 + Math.sin(i) * 3 + (i === 2 || i === 3 ? 9 : 4)} r="5" fill={i % 2 ? "#ffb35c" : "#ff7a45"} />
          ))}
          <rect x="10" y="78" width="44" height="42" fill="#2c2940" />
          <rect x="104" y="72" width="48" height="48" fill="#2c2940" />
          <rect x="16" y="84" width="32" height="8" fill="#ffb35c" opacity="0.6" />
        </>
      )}
    </svg>
  );
}

/** Photo post with a drawn image grid: a tile expands into a viewer with a shared-layout morph, arrow-key paging and Escape to close. */
export function ImageGridPost({
  author = "Lena Ortiz",
  place = "Field notes, week 38",
  time = "5h",
  caption = "Four mornings, four places, one camera. The fog in the harbour lifted about ten minutes after this.",
  images = DEFAULT_IMAGES,
  likes = 326,
  comments = 18,
  onLikeChange,
  className,
}: ImageGridPostProps) {
  const reduce = useReducedMotion() ?? false;
  const [view, setView] = React.useState<{ origin: number; index: number } | null>(null);
  const open = view?.index ?? null;
  const [liked, setLiked] = React.useState(false);
  const tiles = React.useRef<(HTMLButtonElement | null)[]>([]);
  const closeBtn = React.useRef<HTMLButtonElement>(null);
  const id = React.useId();
  const shown = images.slice(0, 4);

  const isOpen = view !== null;
  React.useEffect(() => {
    if (isOpen) closeBtn.current?.focus();
  }, [isOpen]);

  function close() {
    const i = view?.index;
    setView(null);
    if (i !== undefined) requestAnimationFrame(() => tiles.current[i]?.focus());
  }

  const page = (d: number) => setView((v) => (v ? { ...v, index: (v.index + d + shown.length) % shown.length } : v));
  const navBtn = "grid size-9 place-items-center rounded-full bg-glass text-ink shadow-sm outline-none backdrop-blur focus-visible:shadow-[var(--focus-ring)]";
  const layout = (i: number) => (reduce ? undefined : `${id}-img-${i}`);

  return (
    <article aria-label={`Photos from ${author}`} className={cn("w-full max-w-[520px] rounded-xl border border-border bg-surface-raised p-4 shadow-sm", className)}>
      <header className="flex items-center gap-3">
        <span aria-hidden className="grid size-10 place-items-center rounded-full bg-ink font-display text-[13px] font-semibold text-bg">
          {author.split(" ").map((p) => p[0]).join("")}
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-ink">{author}</p>
          <p className="text-[12.5px] text-ink-subtle">
            {place} · {time}
          </p>
        </div>
      </header>
      <p className="mt-3 text-[14px] leading-[1.5] text-ink">{caption}</p>

      <div
        className="relative mt-3 aspect-[4/3] overflow-hidden rounded-lg"
        onKeyDown={(e) => {
          if (open === null) return;
          if (e.key === "Escape") close();
          if (e.key === "ArrowRight") page(1);
          if (e.key === "ArrowLeft") page(-1);
        }}
      >
        <div className={cn("grid size-full gap-1", shown.length > 1 && "grid-cols-2", shown.length > 2 && "grid-rows-2")}>
          {shown.map((img, i) => (
            <button
              key={i}
              ref={(el) => {
                tiles.current[i] = el;
              }}
              type="button"
              aria-label={`Open photo ${i + 1} of ${shown.length}: ${img.alt}`}
              onClick={() => setView({ origin: i, index: i })}
              className={cn("group relative overflow-hidden outline-none focus-visible:shadow-[inset_0_0_0_3px_var(--volt-ink)]", shown.length === 3 && i === 0 && "row-span-2")}
            >
              {view?.origin !== i && (
                <motion.div layoutId={layout(i)} transition={{ type: "spring", stiffness: 300, damping: 32 }} className="absolute inset-0 transition-transform duration-500 group-hover:scale-105">
                  <Scene kind={img.scene} />
                </motion.div>
              )}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {view !== null && open !== null && (
            <motion.div key="viewer" role="dialog" aria-label={shown[open].alt} exit={view.origin === open ? undefined : { opacity: 0 }} className="absolute inset-0 z-10">
              <motion.div layoutId={view.origin === open ? layout(view.origin) : undefined} transition={{ type: "spring", stiffness: 300, damping: 32 }} className="absolute inset-0">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div key={open} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                    <Scene kind={shown[open].scene} />
                  </motion.div>
                </AnimatePresence>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.15 } }} exit={{ opacity: 0, transition: { duration: 0.1 } }} className="absolute inset-0">
                <button ref={closeBtn} type="button" aria-label="Close photo" onClick={close} className={cn(navBtn, "absolute right-3 top-3")}>
                  <X aria-hidden className="size-4" />
                </button>
                <button type="button" aria-label="Previous photo" onClick={() => page(-1)} className={cn(navBtn, "absolute left-3 top-1/2 -translate-y-1/2")}>
                  <ChevronLeft aria-hidden className="size-4" />
                </button>
                <button type="button" aria-label="Next photo" onClick={() => page(1)} className={cn(navBtn, "absolute right-3 top-1/2 -translate-y-1/2")}>
                  <ChevronRight aria-hidden className="size-4" />
                </button>
                <p aria-live="polite" className="absolute bottom-3 left-3 right-3 truncate rounded-full bg-glass px-3 py-1.5 text-[12px] text-ink backdrop-blur">
                  {open + 1} of {shown.length} · {shown[open].alt}
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="-mx-2 mt-2 flex items-center gap-1">
        <motion.button
          type="button"
          aria-pressed={liked}
          aria-label={liked ? "Unlike" : "Like"}
          onClick={() => {
            setLiked(!liked);
            onLikeChange?.(!liked);
          }}
          whileTap={reduce ? undefined : { scale: 0.85 }}
          className={cn("inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-[12.5px] outline-none transition-colors hover:bg-surface-hover focus-visible:shadow-[var(--focus-ring)]", liked ? "font-semibold text-volt-ink" : "text-ink-subtle")}
        >
          <Heart aria-hidden className={cn("size-[18px]", liked && "fill-current")} />
          {(likes + (liked ? 1 : 0)).toLocaleString("en-US")}
        </motion.button>
        <span className="inline-flex h-8 items-center gap-1.5 px-2 text-[12.5px] text-ink-subtle">
          <MessageCircle aria-hidden className="size-[18px]" />
          {comments}
          <span className="sr-only">comments</span>
        </span>
      </div>
    </article>
  );
}
