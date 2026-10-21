"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PollOption {
  id: string;
  label: string;
  votes: number;
}

export interface PollPostProps {
  author?: string;
  handle?: string;
  time?: string;
  question?: string;
  options?: PollOption[];
  /** Label for the time left, e.g. "2 days left". */
  remaining?: string;
  /** Option id the viewer already voted for. */
  defaultVote?: string | null;
  onVote?: (optionId: string | null) => void;
  className?: string;
}

const DEFAULT_OPTIONS: PollOption[] = [
  { id: "o1", label: "Spring, stiffness 400", votes: 412 },
  { id: "o2", label: "Ease out, 200ms", votes: 268 },
  { id: "o3", label: "Ease in-out, 300ms", votes: 157 },
  { id: "o4", label: "No motion by default", votes: 89 },
];

function Percent({ value, reduce }: { value: number; reduce: boolean }) {
  const mv = useSpring(reduce ? value : 0, { stiffness: 120, damping: 22 });
  const text = useTransform(mv, (v) => `${Math.round(v)}%`);
  React.useEffect(() => {
    if (reduce) mv.jump(value);
    else mv.set(value);
  }, [mv, value, reduce]);
  return <motion.span className="tabular-nums">{text}</motion.span>;
}

/** Poll post: pick an option and the results bars grow in with percentages counting up, your choice marked, with undo while the poll is open. */
export function PollPost({
  author = "Jonah Reyes",
  handle = "@jonahbuilds",
  time = "1h",
  question = "Which motion default should ship in our design system v2?",
  options = DEFAULT_OPTIONS,
  remaining = "2 days left",
  defaultVote = null,
  onVote,
  className,
}: PollPostProps) {
  const reduce = useReducedMotion() ?? false;
  const [vote, setVote] = React.useState<string | null>(defaultVote);
  const id = React.useId();

  const counts = options.map((o) => o.votes + (vote === o.id && defaultVote !== o.id ? 1 : 0) - (defaultVote === o.id && vote !== o.id ? 1 : 0));
  const total = counts.reduce((a, b) => a + b, 0);
  const pct = counts.map((c) => (total ? (c / total) * 100 : 0));
  const lead = Math.max(...counts);

  function choose(next: string | null) {
    setVote(next);
    onVote?.(next);
  }

  return (
    <article aria-labelledby={`${id}-q`} className={cn("w-full max-w-[480px] rounded-xl border border-border bg-surface-raised p-4 shadow-sm", className)}>
      <header className="flex items-center gap-3">
        <span aria-hidden className="grid size-10 place-items-center rounded-full bg-ink font-display text-[13px] font-semibold text-bg">
          {author.split(" ").map((p) => p[0]).join("")}
        </span>
        <p className="min-w-0 text-[14px] font-semibold text-ink">
          {author}
          <span className="block text-[12.5px] font-normal text-ink-subtle">
            {handle} · {time}
          </span>
        </p>
      </header>
      <h3 id={`${id}-q`} className="mt-3 text-[15px] font-medium leading-[1.45] text-ink">
        {question}
      </h3>

      <AnimatePresence mode="wait" initial={false}>
        {vote === null ? (
          <motion.ul key="vote" exit={{ opacity: 0, filter: "blur(6px)" }} transition={{ duration: 0.15 }} className="mt-3 flex flex-col gap-2">
            {options.map((o) => (
              <li key={o.id}>
                <motion.button
                  type="button"
                  onClick={() => choose(o.id)}
                  whileTap={reduce ? undefined : { scale: 0.98 }}
                  className="h-10 w-full rounded-full border border-border-strong px-4 text-left text-[13.5px] font-medium text-ink outline-none transition-colors hover:bg-surface-hover focus-visible:shadow-[var(--focus-ring)]"
                >
                  {o.label}
                </motion.button>
              </li>
            ))}
          </motion.ul>
        ) : (
          <motion.ul key="results" aria-label="Poll results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 flex flex-col gap-2">
            {options.map((o, i) => {
              const mine = vote === o.id;
              const top = counts[i] === lead;
              return (
                <li key={o.id} className="relative flex h-10 items-center overflow-hidden rounded-sm px-3.5">
                  <span aria-hidden className="absolute inset-0 bg-surface" />
                  <motion.span
                    aria-hidden
                    initial={{ scaleX: reduce ? pct[i] / 100 : 0 }}
                    animate={{ scaleX: pct[i] / 100 }}
                    transition={{ type: "spring", stiffness: 120, damping: 22, delay: reduce ? 0 : i * 0.05 }}
                    className={cn("absolute inset-y-0 left-0 w-full origin-left", mine ? "bg-volt/30" : top ? "bg-ink/15" : "bg-ink/[0.07]")}
                  />
                  <span className={cn("relative flex min-w-0 flex-1 items-center gap-1.5 text-[13.5px]", top ? "font-semibold text-ink" : "text-ink-muted")}>
                    <span className="truncate">{o.label}</span>
                    {mine && (
                      <>
                        <CheckCircle2 aria-hidden className="size-4 shrink-0 text-volt-ink" />
                        <span className="sr-only">Your vote</span>
                      </>
                    )}
                  </span>
                  <span className={cn("relative text-[13px]", top ? "font-semibold text-ink" : "text-ink-muted")}>
                    <Percent value={pct[i]} reduce={reduce} />
                  </span>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>

      <div className="mt-3 flex items-center gap-2 text-[12.5px] text-ink-subtle">
        <span className="tabular-nums">{total.toLocaleString("en-US")} votes</span>
        <span aria-hidden>·</span>
        <span className="inline-flex items-center gap-1">
          <Clock aria-hidden className="size-3.5" />
          {remaining}
        </span>
        {vote !== null && (
          <button type="button" onClick={() => choose(null)} className="ml-auto rounded-xs px-1 font-medium text-ink outline-none underline-offset-2 hover:underline focus-visible:shadow-[var(--focus-ring)]">
            Undo vote
          </button>
        )}
      </div>
      <p aria-live="polite" className="sr-only">
        {vote ? `Voted for ${options.find((o) => o.id === vote)?.label}. ${options.map((o, i) => `${o.label} ${Math.round(pct[i])}%`).join(", ")}` : ""}
      </p>
    </article>
  );
}
