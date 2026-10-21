"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronDown, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  /** Button label inside the open step. */
  action: string;
  done?: boolean;
}

export interface OnboardingChecklistCardProps {
  title?: string;
  steps?: OnboardingStep[];
  /** Called when a step’s action is pressed; the step is then marked done. */
  onStep?: (id: string) => void;
  onDismiss?: () => void;
  className?: string;
}

const DEFAULT_STEPS: OnboardingStep[] = [
  { id: "workspace", title: "Create your workspace", description: "Name it and pick a URL your team will recognise.", action: "Open settings", done: true },
  { id: "invite", title: "Invite two teammates", description: "Projects move faster with reviewers. Invites are free on every plan.", action: "Send invites", done: true },
  { id: "import", title: "Import your first project", description: "Bring tasks in from a CSV, Linear or Jira. It takes about a minute.", action: "Import project" },
  { id: "integrate", title: "Connect Slack", description: "Get updates where your team already talks, and reply without switching apps.", action: "Connect Slack" },
  { id: "automate", title: "Turn on a weekly digest", description: "A Monday summary of what shipped and what is at risk.", action: "Turn on digest" },
];

const focus = "outline-none focus-visible:shadow-[var(--focus-ring)]";

/** Getting-started checklist: one step open at a time, completing a step ticks and advances, and the card celebrates when everything is done. */
export function OnboardingChecklistCard({ title = "Get set up", steps = DEFAULT_STEPS, onStep, onDismiss, className }: OnboardingChecklistCardProps) {
  const reduce = useReducedMotion() ?? false;
  const [done, setDone] = React.useState<string[]>(() => steps.filter((s) => s.done).map((s) => s.id));
  const [open, setOpen] = React.useState<string | null>(() => steps.find((s) => !s.done)?.id ?? null);
  const baseId = React.useId();
  const count = done.length;
  const all = count === steps.length;
  const spring = { type: "spring" as const, stiffness: 340, damping: 32 };

  function complete(id: string) {
    onStep?.(id);
    const next = [...done, id];
    setDone(next);
    setOpen(steps.find((s) => !next.includes(s.id))?.id ?? null);
  }

  return (
    <section aria-labelledby={`${baseId}-t`} className={cn("w-full max-w-[420px] overflow-hidden rounded-xl border border-border bg-surface-raised shadow-sm", className)}>
      <header className="px-5 pt-5">
        <div className="flex items-center justify-between gap-3">
          <h3 id={`${baseId}-t`} className="text-[15px] font-semibold text-ink">
            {title}
          </h3>
          <span className="font-mono text-[11px] tabular-nums text-ink-muted">
            {count} of {steps.length} done
          </span>
        </div>
        <div className="mt-3 flex gap-1" aria-hidden>
          {steps.map((s) => (
            <span key={s.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
              <motion.span className="block h-full origin-left rounded-full bg-volt" initial={false} animate={{ scaleX: done.includes(s.id) ? 1 : 0 }} transition={reduce ? { duration: 0 } : spring} />
            </span>
          ))}
        </div>
      </header>

      <AnimatePresence mode="popLayout" initial={false}>
        {all ? (
          <motion.div key="all" initial={{ opacity: 0, filter: "blur(8px)" }} animate={{ opacity: 1, filter: "blur(0px)" }} exit={{ opacity: 0 }} className="flex flex-col items-center px-6 pb-6 pt-8 text-center">
            <motion.span initial={reduce ? false : { scale: 0.3, rotate: -25 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 380, damping: 14 }} className="grid size-12 place-items-center rounded-full bg-volt-soft text-volt-ink">
              <PartyPopper aria-hidden className="size-6" />
            </motion.span>
            <p className="mt-3 text-[15px] font-semibold text-ink">You are all set</p>
            <p className="mt-1 max-w-[260px] text-[13px] text-ink-muted">Your workspace is ready. We will tuck this checklist away.</p>
            <button type="button" onClick={onDismiss} className={cn("mt-4 h-9 rounded-full border border-border-strong/50 px-4 text-[13px] font-medium text-ink hover:bg-surface-hover", focus)}>
              Hide checklist
            </button>
          </motion.div>
        ) : (
          <motion.ol key="list" exit={{ opacity: 0, filter: "blur(8px)" }} className="mt-3 px-2 pb-2">
            {steps.map((s, i) => {
              const isDone = done.includes(s.id);
              const isOpen = open === s.id;
              return (
                <li key={s.id} className={cn("rounded-md transition-colors", isOpen && "bg-surface-sunken/70")}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`${baseId}-${s.id}`}
                    onClick={() => setOpen(isOpen ? null : s.id)}
                    className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left", focus)}
                  >
                    <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-semibold transition-colors", isDone ? "border-ink bg-ink text-bg" : "border-border-strong/50 text-ink-muted")}>
                      <AnimatePresence mode="popLayout" initial={false}>
                        {isDone ? (
                          <motion.span key="c" initial={reduce ? false : { scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 500, damping: 18 }}>
                            <Check aria-hidden className="size-3.5" strokeWidth={3} />
                          </motion.span>
                        ) : (
                          <motion.span key="n" exit={{ scale: 0 }}>
                            {i + 1}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                    <span className={cn("flex-1 text-[13.5px] font-medium", isDone ? "text-ink-subtle line-through decoration-ink-subtle/60" : "text-ink")}>
                      {s.title}
                      <span className="sr-only">{isDone ? ", done" : ""}</span>
                    </span>
                    <ChevronDown aria-hidden className={cn("size-4 text-ink-subtle transition-transform duration-300 ease-spring", isOpen && "rotate-180")} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={`${baseId}-${s.id}`}
                        initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                        animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
                        exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                        transition={spring}
                        className="overflow-hidden"
                      >
                        <div className="pb-3 pl-12 pr-3">
                          <p className="text-[13px] leading-relaxed text-ink-muted">{s.description}</p>
                          {!isDone && (
                            <motion.button type="button" whileTap={reduce ? undefined : { scale: 0.96 }} onClick={() => complete(s.id)} className={cn("mt-3 h-8 rounded-full bg-volt px-3.5 text-[12.5px] font-semibold text-on-volt", focus)}>
                              {s.action}
                            </motion.button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </motion.ol>
        )}
      </AnimatePresence>
    </section>
  );
}
