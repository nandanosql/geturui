"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Check, Globe, Heart, Link2, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LinkPreview {
  url: string;
  domain: string;
  title: string;
  description: string;
  /** Short label drawn on the preview image. */
  kicker?: string;
}

export interface LinkPreviewPostProps {
  author?: string;
  role?: string;
  time?: string;
  /** Always-visible opening of the post. */
  text?: string;
  /** Revealed by "Show more". */
  more?: string;
  link?: LinkPreview;
  likes?: number;
  comments?: number;
  onLikeChange?: (liked: boolean) => void;
  className?: string;
}

const DEFAULT_LINK: LinkPreview = {
  url: "https://geturui.com/journal/motion-budget",
  domain: "geturui.com",
  title: "A motion budget for product teams",
  description: "How to decide what moves, for how long, and what stays still. With a one-page worksheet.",
  kicker: "Journal",
};

/** Post with an expandable body and a rich link preview whose drawn image drifts on hover, plus like and copy-link actions. */
export function LinkPreviewPost({
  author = "Priya Nair",
  role = "Head of design, Kestrel",
  time = "3h",
  text = "We gave every squad a motion budget this quarter: three signature moments per flow, everything else under 200ms.",
  more = "The result was calmer screens and faster reviews. Nobody argued about easing curves anymore because the budget made the trade-offs visible. Write-up below, worksheet included.",
  link = DEFAULT_LINK,
  likes = 94,
  comments = 12,
  onLikeChange,
  className,
}: LinkPreviewPostProps) {
  const reduce = useReducedMotion() ?? false;
  const [expanded, setExpanded] = React.useState(false);
  const [liked, setLiked] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const moreId = React.useId();

  React.useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard?.writeText(link.url);
    } catch {
      // Clipboard may be blocked; still confirm so the action feels finished.
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  }

  const action = "inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-[12.5px] outline-none transition-colors hover:bg-surface-hover focus-visible:shadow-[var(--focus-ring)]";

  return (
    <article aria-label={`Post by ${author}`} className={cn("w-full max-w-[520px] rounded-xl border border-border bg-surface-raised p-4 shadow-sm", className)}>
      <header className="flex items-center gap-3">
        <span aria-hidden className="grid size-10 place-items-center rounded-full bg-ink font-display text-[13px] font-semibold text-bg">
          {author.split(" ").map((p) => p[0]).join("")}
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-ink">{author}</p>
          <p className="truncate text-[12.5px] text-ink-subtle">
            {role} · {time}
          </p>
        </div>
      </header>

      <div className="mt-3 text-[14px] leading-[1.55] text-ink">
        <p>
          {text}
          {!expanded && more && (
            <>
              {" "}
              <button type="button" aria-expanded={false} aria-controls={moreId} onClick={() => setExpanded(true)} className="rounded-xs font-medium text-ink-muted outline-none underline-offset-2 hover:text-ink hover:underline focus-visible:shadow-[var(--focus-ring)]">
                Show more
              </button>
            </>
          )}
        </p>
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.p
              id={moreId}
              initial={{ height: 0, opacity: 0, filter: "blur(4px)" }}
              animate={{ height: "auto", opacity: 1, filter: "blur(0px)" }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30 }}
              className="overflow-hidden"
            >
              <span className="block pt-2">{more}</span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <a
        href={link.url}
        target="_blank"
        rel="noreferrer"
        className="group mt-3 block overflow-hidden rounded-lg border border-border bg-surface outline-none transition-colors hover:border-border-strong focus-visible:shadow-[var(--focus-ring)]"
      >
        <div aria-hidden className="relative h-36 overflow-hidden bg-surface-sunken">
          <div className="absolute inset-0 transition-transform duration-700 ease-spring-soft group-hover:scale-[1.04]">
            <span className="absolute -right-6 -top-10 size-40 rounded-full border-[16px] border-ink/[0.07]" />
            <span className="absolute bottom-5 right-10 h-14 w-24 rounded-md bg-ink/10" />
            <span className="absolute bottom-11 right-24 size-9 rounded-full bg-volt transition-[translate] duration-700 ease-spring group-hover:-translate-x-3 group-hover:-translate-y-1" />
          </div>
          <span className="absolute left-4 top-4 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-subtle">{link.kicker}</span>
          <span className="absolute bottom-4 left-4 max-w-[55%] font-display text-[19px] font-semibold leading-[1.1] tracking-[-0.4px] text-ink">{link.title}</span>
        </div>
        <div className="flex items-start gap-3 px-3.5 py-3">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-[11.5px] text-ink-subtle">
              <Globe aria-hidden className="size-3" />
              {link.domain}
            </p>
            <p className="mt-0.5 truncate text-[13.5px] font-semibold text-ink">{link.title}</p>
            <p className="line-clamp-2 text-[12.5px] leading-[1.45] text-ink-muted">{link.description}</p>
          </div>
          <ArrowUpRight aria-hidden className="mt-1 size-4 shrink-0 text-ink-subtle transition-[translate,color] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
        </div>
      </a>

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
          className={cn(action, liked ? "font-semibold text-volt-ink" : "text-ink-subtle")}
        >
          <Heart aria-hidden className={cn("size-[18px]", liked && "fill-current")} />
          {likes + (liked ? 1 : 0)}
        </motion.button>
        <span className="inline-flex h-8 items-center gap-1.5 px-2 text-[12.5px] text-ink-subtle">
          <MessageCircle aria-hidden className="size-[18px]" />
          {comments}
          <span className="sr-only">comments</span>
        </span>
        <motion.button type="button" onClick={copy} whileTap={reduce ? undefined : { scale: 0.94 }} className={cn(action, "ml-auto text-ink-muted hover:text-ink")}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={String(copied)} initial={{ opacity: 0, filter: "blur(6px)" }} animate={{ opacity: 1, filter: "blur(0px)" }} exit={{ opacity: 0, filter: "blur(6px)" }} transition={{ duration: 0.18 }} className="inline-flex items-center gap-1.5">
              {copied ? <Check aria-hidden className="size-4 text-volt-ink" strokeWidth={2.5} /> : <Link2 aria-hidden className="size-4" />}
              {copied ? "Link copied" : "Copy link"}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>
    </article>
  );
}
