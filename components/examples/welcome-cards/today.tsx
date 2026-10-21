"use client";

import * as React from "react";
import { AnimatePresence, animate, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Video } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TodayStat {
  label: string;
  value: number;
  /** Small caption under the number. */
  hint?: string;
}

export interface TodayEvent {
  title: string;
  /** Formatted time, e.g. "10:30". */
  time: string;
  /** Relative caption, e.g. "in 25 min". */
  relative: string;
  people: string[];
}

export interface WelcomeTodayCardProps {
  name?: string;
  /** Local hour (0–23) used for the greeting; pass it in so render stays deterministic. */
  hour?: number;
  /** Formatted date, e.g. "Friday, October 2". */
  dateLabel?: string;
  stats?: TodayStat[];
  events?: TodayEvent[];
  onJoin?: (event: TodayEvent) => void;
  className?: string;
}

const focus = "outline-none focus-visible:shadow-[var(--focus-ring)]";

function greeting(h: number) {
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function CountUp({ to, delay, reduce }: { to: number; delay: number; reduce: boolean }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || reduce) return;
    el.textContent = "0";
    const c = animate(0, to, { duration: 0.9, delay, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => (el.textContent = String(Math.round(v))) });
    return () => c.stop();
  }, [to, delay, reduce]);
  return <span ref={ref}>{to}</span>;
}

/** Dashboard welcome: time-aware greeting, today’s numbers counting up in a stagger, and an up-next strip you can step through. */
export function WelcomeTodayCard({
  name = "Maya",
  hour = 9,
  dateLabel = "Friday, October 2",
  stats = [
    { label: "Meetings", value: 4, hint: "2h 15m total" },
    { label: "Tasks due", value: 6, hint: "2 overdue" },
    { label: "Unread", value: 18, hint: "3 mentions" },
  ],
  events = [
    { title: "Design review: billing v2", time: "10:30", relative: "in 25 min", people: ["PR", "TH", "KM"] },
    { title: "1:1 with Jordan", time: "13:00", relative: "in 3h 55m", people: ["JL"] },
    { title: "Pricing sync", time: "16:00", relative: "in 6h 55m", people: ["AO", "LM"] },
  ],
  onJoin,
  className,
}: WelcomeTodayCardProps) {
  const reduce = useReducedMotion() ?? false;
  const [i, setI] = React.useState(0);
  const [dir, setDir] = React.useState(1);
  const ev = events[i];

  function go(d: number) {
    setDir(d);
    setI((n) => (n + d + events.length) % events.length);
  }

  return (
    <section aria-label="Today" className={cn("@container w-full max-w-[520px] rounded-xl border border-border bg-surface-raised p-5 shadow-sm", className)}>
      <motion.div initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 28 }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-subtle">{dateLabel}</p>
        <h2 className="mt-1.5 font-display text-[26px] font-semibold leading-tight tracking-[-0.6px] text-ink">
          {greeting(hour)}, {name}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">Here is what today looks like.</p>
      </motion.div>

      <dl className="mt-5 grid grid-cols-3 gap-2">
        {stats.map((s, k) => (
          <motion.div
            key={s.label}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 26, delay: reduce ? 0 : 0.12 + k * 0.08 }}
            className="rounded-md bg-surface-sunken/70 px-3 py-3"
          >
            <dt className="text-[11.5px] font-medium text-ink-muted">{s.label}</dt>
            <dd className="mt-1 font-display text-[26px] font-semibold leading-none tracking-[-0.6px] text-ink tabular-nums">
              <CountUp to={s.value} delay={0.15 + k * 0.08} reduce={reduce} />
            </dd>
            {s.hint && <dd className="mt-1 truncate text-[11px] text-ink-subtle">{s.hint}</dd>}
          </motion.div>
        ))}
      </dl>

      {ev && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
          <div className="relative min-w-[200px] flex-1 overflow-hidden" aria-live="polite">
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <motion.div
                key={i}
                custom={dir}
                initial={reduce ? { opacity: 0 } : { opacity: 0, x: dir * 24, filter: "blur(6px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, x: dir * -24, filter: "blur(6px)" }}
                transition={{ type: "spring", stiffness: 340, damping: 32 }}
              >
                <p className="text-[11px] font-medium text-ink-subtle">
                  Up next · <span className="text-ink">{ev.time}</span> · {ev.relative}
                </p>
                <p className="mt-0.5 truncate text-[14px] font-semibold text-ink">{ev.title}</p>
                <div className="mt-1.5 flex">
                  {ev.people.map((p, k) => (
                    <span key={p} aria-hidden className={cn("grid size-5 place-items-center rounded-full border-2 border-surface-raised bg-surface-sunken font-mono text-[8px] font-semibold text-ink", k && "-ml-1.5")}>
                      {p}
                    </span>
                  ))}
                  <span className="sr-only">{ev.people.length} attendees</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <button type="button" aria-label="Previous event" onClick={() => go(-1)} className={cn("grid size-8 place-items-center rounded-full text-ink-muted hover:bg-surface-hover hover:text-ink", focus)}>
              <ChevronLeft aria-hidden className="size-4" />
            </button>
            <button type="button" aria-label="Next event" onClick={() => go(1)} className={cn("grid size-8 place-items-center rounded-full text-ink-muted hover:bg-surface-hover hover:text-ink", focus)}>
              <ChevronRight aria-hidden className="size-4" />
            </button>
            <motion.button type="button" whileTap={reduce ? undefined : { scale: 0.96 }} onClick={() => onJoin?.(ev)} className={cn("inline-flex h-9 items-center gap-1.5 rounded-full bg-volt px-4 text-[13px] font-semibold text-on-volt", focus)}>
              <Video aria-hidden className="size-4" />
              Join
            </motion.button>
          </div>
        </div>
      )}
    </section>
  );
}
