"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Heart, Laugh, SmilePlus, Sparkles, ThumbsUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ReactionKey = "agree" | "love" | "brilliant" | "funny";

export interface GroupMessage {
  id: string;
  author: string;
  time: string;
  text: string;
  /** Count from other people per reaction. */
  reactions?: Partial<Record<ReactionKey, number>>;
  /** Reactions the current user has added. */
  mine?: ReactionKey[];
}

export interface GroupChatProps {
  channel?: string;
  members?: number;
  messages?: GroupMessage[];
  onReact?: (messageId: string, reaction: ReactionKey, active: boolean) => void;
  className?: string;
}

const REACTIONS: { key: ReactionKey; label: string; Icon: LucideIcon }[] = [
  { key: "agree", label: "Agree", Icon: ThumbsUp },
  { key: "love", label: "Love", Icon: Heart },
  { key: "brilliant", label: "Brilliant", Icon: Sparkles },
  { key: "funny", label: "Funny", Icon: Laugh },
];

const DEFAULT_MESSAGES: GroupMessage[] = [
  { id: "g1", author: "Priya Nair", time: "10:02", text: "Launch checklist is green. Docs, changelog and the pricing page are live on staging.", reactions: { agree: 3, love: 1 } },
  { id: "g2", author: "Priya Nair", time: "10:02", text: "Can someone give the hero animation one last look on a slow phone?" },
  { id: "g3", author: "Jonah Reyes", time: "10:05", text: "Checked on a four-year-old Android. Smooth, and it falls back to a fade with reduced motion on.", reactions: { brilliant: 2 }, mine: ["agree"] },
  { id: "g4", author: "Theo Lind", time: "10:07", text: "Then we ship at 11. I'll post in the announcements channel.", reactions: { love: 4, funny: 1 } },
];

const TONES = ["bg-ink text-bg", "bg-surface-sunken text-ink border border-border", "bg-ember-soft text-ember-ink"];
const initialsOf = (n: string) => n.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
const spring = { type: "spring", stiffness: 420, damping: 30 } as const;

/** Group chat with grouped senders, toggleable reaction pills whose counts roll, and an inline reaction picker per message. */
export function GroupChat({ channel = "launch-week", members = 8, messages = DEFAULT_MESSAGES, onReact, className }: GroupChatProps) {
  const reduce = useReducedMotion() ?? false;
  const [mine, setMine] = React.useState<Record<string, ReactionKey[]>>(() => Object.fromEntries(messages.map((m) => [m.id, m.mine ?? []])));
  const [picker, setPicker] = React.useState<string | null>(null);
  const authors = Array.from(new Set(messages.map((m) => m.author)));

  function toggle(messageId: string, key: ReactionKey) {
    const has = mine[messageId]?.includes(key) ?? false;
    setMine((s) => ({ ...s, [messageId]: has ? s[messageId].filter((k) => k !== key) : [...(s[messageId] ?? []), key] }));
    onReact?.(messageId, key, !has);
  }

  return (
    <section aria-label={`#${channel}`} className={cn("w-full max-w-[460px] rounded-xl border border-border bg-surface-raised shadow-sm", className)}>
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="font-display text-[15px] font-semibold text-ink">
          <span className="text-ink-subtle">#</span>
          {channel}
        </p>
        <p className="text-xs text-ink-subtle">{members} members</p>
      </header>
      <ol className="flex flex-col px-2 py-3">
        {messages.map((m, i) => {
          const first = messages[i - 1]?.author !== m.author;
          const active = mine[m.id] ?? [];
          const shown = REACTIONS.filter((r) => (m.reactions?.[r.key] ?? 0) + (active.includes(r.key) ? 1 : 0) > 0);
          const tone = TONES[authors.indexOf(m.author) % TONES.length];
          return (
            <li
              key={m.id}
              onKeyDown={(e) => {
                if (e.key !== "Escape" || picker !== m.id) return;
                setPicker(null);
                e.currentTarget.querySelector<HTMLButtonElement>("[data-add-reaction]")?.focus();
              }}
              className={cn("group relative flex gap-3 rounded-lg px-2 py-1 transition-colors hover:bg-surface-hover", first && i > 0 && "mt-2")}
            >
              <span aria-hidden className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-full font-display text-[11px] font-semibold", first ? tone : "invisible")}>
                {initialsOf(m.author)}
              </span>
              <div className="min-w-0 flex-1">
                {first && (
                  <p className="flex items-baseline gap-2">
                    <span className="text-[13.5px] font-semibold text-ink">{m.author}</span>
                    <span className="text-[11px] text-ink-subtle">{m.time}</span>
                  </p>
                )}
                <p className="text-[13.5px] leading-5 text-ink-muted">{m.text}</p>
                {shown.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {shown.map(({ key, label, Icon }) => {
                      const on = active.includes(key);
                      const n = (m.reactions?.[key] ?? 0) + (on ? 1 : 0);
                      return (
                        <motion.button
                          key={key}
                          type="button"
                          layout={!reduce}
                          initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          whileTap={reduce ? undefined : { scale: 0.9 }}
                          transition={spring}
                          aria-pressed={on}
                          aria-label={`${label}, ${n} ${n === 1 ? "reaction" : "reactions"}`}
                          onClick={() => toggle(m.id, key)}
                          className={cn(
                            "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[11.5px] font-medium outline-none transition-colors focus-visible:shadow-[var(--focus-ring)]",
                            on ? "border-volt-ink/40 bg-volt-soft text-ink" : "border-border bg-surface text-ink-muted hover:border-border-strong",
                          )}
                        >
                          <Icon aria-hidden className={cn("size-3", on && "text-volt-ink")} strokeWidth={2.4} />
                          <span className="relative inline-flex overflow-hidden tabular-nums">
                            <AnimatePresence mode="popLayout" initial={false}>
                              <motion.span key={n} initial={{ y: reduce ? 0 : 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: reduce ? 0 : -10, opacity: 0 }} transition={spring}>
                                {n}
                              </motion.span>
                            </AnimatePresence>
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="absolute -top-3 right-2 z-10 flex items-center">
                <AnimatePresence>
                  {picker === m.id && (
                    <motion.div
                      role="group"
                      aria-label="Pick a reaction"
                      initial={{ opacity: 0, scale: reduce ? 1 : 0.85, x: reduce ? 0 : 8 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: reduce ? 1 : 0.85 }}
                      transition={spring}
                      className="mr-1 flex origin-right gap-0.5 rounded-full border border-border bg-surface-raised p-1 shadow-md"
                    >
                      {REACTIONS.map(({ key, label, Icon }, j) => (
                        <button
                          key={key}
                          type="button"
                          autoFocus={j === 0}
                          aria-label={label}
                          aria-pressed={active.includes(key)}
                          onClick={() => {
                            toggle(m.id, key);
                            setPicker(null);
                          }}
                          className="grid size-7 place-items-center rounded-full text-ink-muted outline-none transition-colors hover:bg-surface-hover hover:text-ink focus-visible:shadow-[var(--focus-ring)] aria-pressed:text-volt-ink"
                        >
                          <Icon aria-hidden className="size-3.5" />
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                <button
                  type="button"
                  data-add-reaction
                  aria-label="Add reaction"
                  aria-expanded={picker === m.id}
                  onClick={() => setPicker((p) => (p === m.id ? null : m.id))}
                  className={cn(
                    "grid size-7 place-items-center rounded-full border border-border bg-surface-raised text-ink-muted shadow-sm outline-none transition-opacity hover:text-ink focus-visible:opacity-100 focus-visible:shadow-[var(--focus-ring)]",
                    picker === m.id ? "opacity-100" : "opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100",
                  )}
                >
                  <SmilePlus aria-hidden className="size-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
