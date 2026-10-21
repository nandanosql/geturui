"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BadgeCheck, BarChart2, Bookmark, Heart, MessageCircle, MoreHorizontal, Repeat2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TextPostProps {
  author?: string;
  handle?: string;
  verified?: boolean;
  /** Relative time label, e.g. "2h". */
  time?: string;
  /** Paragraphs of the post. */
  body?: string[];
  replies?: number;
  reposts?: number;
  likes?: number;
  views?: number;
  defaultLiked?: boolean;
  defaultReposted?: boolean;
  defaultBookmarked?: boolean;
  onReply?: () => void;
  onChange?: (state: { liked: boolean; reposted: boolean; bookmarked: boolean }) => void;
  className?: string;
}

const compact = (n: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
const spring = { type: "spring", stiffness: 480, damping: 30 } as const;
const BURST = Array.from({ length: 6 }, (_, i) => ({ x: Math.cos((i / 6) * Math.PI * 2) * 16, y: Math.sin((i / 6) * Math.PI * 2) * 16 }));

function Rolling({ value, up, reduce }: { value: number; up: boolean; reduce: boolean }) {
  return (
    <span className="relative inline-flex overflow-hidden tabular-nums">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={value} initial={reduce ? { opacity: 0 } : { y: up ? 12 : -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={reduce ? { opacity: 0 } : { y: up ? -12 : 12, opacity: 0 }} transition={spring}>
          {compact(value)}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Pop({ on, Icon, fill, reduce }: { on: boolean; Icon: LucideIcon; fill?: boolean; reduce: boolean }) {
  return (
    <motion.span initial={reduce || !on ? false : { scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 600, damping: 13 }} className="grid">
      <Icon aria-hidden className={cn("size-[18px]", on && fill && "fill-current")} strokeWidth={on && !fill ? 2.6 : 2} />
    </motion.span>
  );
}

/** Text post with optimistic like, repost and bookmark toggles: icons pop, the like bursts and every count rolls to its new value. */
export function TextPost({
  author = "Maya Kerrigan",
  handle = "@mayamakes",
  verified = true,
  time = "2h",
  body = [
    "Hot take after a year of shipping motion in production: most interfaces don't need more animation, they need shorter animation.",
    "We cut our default duration from 400ms to 180ms and support tickets about the app feeling slow dropped by a third.",
  ],
  replies = 48,
  reposts = 212,
  likes = 1840,
  views = 48200,
  defaultLiked = false,
  defaultReposted = false,
  defaultBookmarked = false,
  onReply,
  onChange,
  className,
}: TextPostProps) {
  const reduce = useReducedMotion() ?? false;
  const [state, setState] = React.useState({ liked: defaultLiked, reposted: defaultReposted, bookmarked: defaultBookmarked });
  const [burst, setBurst] = React.useState(0);
  const id = React.useId();

  function flip(key: keyof typeof state) {
    const next = { ...state, [key]: !state[key] };
    setState(next);
    onChange?.(next);
    if (key === "liked" && next.liked && !reduce) setBurst((b) => b + 1);
  }

  const likeCount = likes + (state.liked ? 1 : 0) - (defaultLiked ? 1 : 0);
  const repostCount = reposts + (state.reposted ? 1 : 0) - (defaultReposted ? 1 : 0);
  const action = "group/a inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-[12.5px] outline-none transition-colors focus-visible:shadow-[var(--focus-ring)]";

  return (
    <article aria-labelledby={`${id}-a`} className={cn("w-full max-w-[520px] rounded-xl border border-border bg-surface-raised p-4 shadow-sm", className)}>
      <header className="flex items-start gap-3">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-ink font-display text-[13px] font-semibold text-bg">
          {author.split(" ").map((p) => p[0]).join("").slice(0, 2)}
        </span>
        <div className="min-w-0 flex-1">
          <p id={`${id}-a`} className="flex items-center gap-1 text-[14px] font-semibold text-ink">
            <span className="truncate">{author}</span>
            {verified && <BadgeCheck aria-label="Verified" className="size-4 shrink-0 text-volt-ink" />}
          </p>
          <p className="text-[12.5px] text-ink-subtle">
            {handle} · {time}
          </p>
        </div>
        <button type="button" aria-label="More options" className="grid size-8 place-items-center rounded-full text-ink-subtle outline-none transition-colors hover:bg-surface-hover hover:text-ink focus-visible:shadow-[var(--focus-ring)]">
          <MoreHorizontal aria-hidden className="size-4" />
        </button>
      </header>

      <div className="mt-3 space-y-2.5 text-[14.5px] leading-[1.55] text-ink">
        {body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <div className="-mx-2 mt-3 flex items-center justify-between">
        <button type="button" onClick={onReply} aria-label={`Reply, ${replies} replies`} className={cn(action, "text-ink-subtle hover:bg-surface-hover hover:text-ink")}>
          <MessageCircle aria-hidden className="size-[18px]" />
          {compact(replies)}
        </button>
        <button type="button" aria-pressed={state.reposted} aria-label={`Repost, ${repostCount} reposts`} onClick={() => flip("reposted")} className={cn(action, state.reposted ? "font-semibold text-ink" : "text-ink-subtle", "hover:bg-surface-hover hover:text-ink")}>
          <Pop key={`r${state.reposted}`} on={state.reposted} Icon={Repeat2} reduce={reduce} />
          <Rolling value={repostCount} up={state.reposted} reduce={reduce} />
        </button>
        <button type="button" aria-pressed={state.liked} aria-label={`Like, ${likeCount} likes`} onClick={() => flip("liked")} className={cn(action, state.liked ? "font-semibold text-volt-ink" : "text-ink-subtle", "relative hover:bg-surface-hover")}>
          <span className="relative grid">
            <AnimatePresence>
              {burst > 0 &&
                BURST.map((b, i) => (
                  <motion.span
                    key={`${burst}-${i}`}
                    aria-hidden
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{ x: b.x, y: b.y, opacity: 0, scale: 0.3 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute left-1/2 top-1/2 -ml-0.5 -mt-0.5 size-1 rounded-full bg-volt-ink"
                  />
                ))}
            </AnimatePresence>
            <Pop key={`l${state.liked}`} on={state.liked} Icon={Heart} fill reduce={reduce} />
          </span>
          <Rolling value={likeCount} up={state.liked} reduce={reduce} />
        </button>
        <span className="inline-flex items-center gap-1.5 px-2 text-[12.5px] text-ink-subtle">
          <BarChart2 aria-hidden className="size-[18px]" />
          <span className="sr-only">Views</span>
          {compact(views)}
        </span>
        <button type="button" aria-pressed={state.bookmarked} aria-label={state.bookmarked ? "Remove bookmark" : "Bookmark"} onClick={() => flip("bookmarked")} className={cn(action, state.bookmarked ? "text-ink" : "text-ink-subtle", "hover:bg-surface-hover hover:text-ink")}>
          <Pop key={`b${state.bookmarked}`} on={state.bookmarked} Icon={Bookmark} fill reduce={reduce} />
        </button>
      </div>
    </article>
  );
}
