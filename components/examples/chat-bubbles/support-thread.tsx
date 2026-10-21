"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SupportMessage {
  id: string;
  from: "agent" | "user";
  text: string;
  time: string;
}

export interface QuickReply {
  label: string;
  /** What the agent answers after a short typing pause. */
  reply: string;
}

export interface SupportThreadProps {
  agentName?: string;
  agentRole?: string;
  messages?: SupportMessage[];
  quickReplies?: QuickReply[];
  /** Agent answer for free-typed messages. */
  fallbackReply?: string;
  /** How long the typing indicator shows, in ms. */
  typingDelay?: number;
  onSend?: (text: string) => void;
  className?: string;
}

const DEFAULT_MESSAGES: SupportMessage[] = [
  { id: "m1", from: "agent", text: "Hi Sam, I'm Noor from the GetUrUI team. I can see your Pro trial ends on Friday.", time: "9:41" },
  { id: "m2", from: "agent", text: "Anything I can help with before then?", time: "9:41" },
  { id: "m3", from: "user", text: "Yes, I want to keep the components my team already installed.", time: "9:43" },
];

const DEFAULT_REPLIES: QuickReply[] = [
  { label: "Upgrade my plan", reply: "Done in a click: open Billing and choose Pro. Everything installed stays exactly where it is." },
  { label: "Download an invoice", reply: "Invoices live under Billing, then History. Each one has a PDF button on the right." },
  { label: "Add a teammate", reply: "Go to Team, then Invite. Seats are added to your next invoice, prorated by the day." },
];

function TypingDots({ reduce }: { reduce: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 px-1 py-1.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-ink-subtle"
          animate={reduce ? { opacity: [0.3, 1, 0.3] } : { y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}

/** Support conversation with grouped bubbles, quick-reply chips and an agent typing indicator before each answer. */
export function SupportThread({
  agentName = "Noor",
  agentRole = "Customer support",
  messages = DEFAULT_MESSAGES,
  quickReplies = DEFAULT_REPLIES,
  fallbackReply = "Thanks, I'm looking into it now and will reply right here.",
  typingDelay = 1400,
  onSend,
  className,
}: SupportThreadProps) {
  const reduce = useReducedMotion() ?? false;
  const [list, setList] = React.useState(messages);
  const [chips, setChips] = React.useState(quickReplies);
  const [typing, setTyping] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const scroller = React.useRef<HTMLDivElement>(null);
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const seq = React.useRef(0);
  const inputId = React.useId();

  React.useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);
  React.useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [list, typing, reduce]);

  function send(text: string, reply: string) {
    const clean = text.trim();
    if (!clean) return;
    seq.current += 1;
    const n = seq.current;
    setList((l) => [...l, { id: `u${n}`, from: "user", text: clean, time: "Now" }]);
    onSend?.(clean);
    setTyping(true);
    timers.current.push(
      setTimeout(() => {
        setTyping(false);
        setList((l) => [...l, { id: `a${n}`, from: "agent", text: reply, time: "Now" }]);
      }, typingDelay),
    );
  }

  return (
    <section aria-label={`Chat with ${agentName}`} className={cn("flex w-full max-w-[400px] flex-col overflow-hidden rounded-xl border border-border bg-surface-raised shadow-sm", className)}>
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="relative grid size-9 place-items-center rounded-full bg-ink font-display text-[13px] font-semibold text-bg" aria-hidden>
          {agentName.slice(0, 1)}
          <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-surface-raised bg-success" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-ink">{agentName}</p>
          <p className="text-xs text-ink-subtle">
            {agentRole} · <span className="text-success">Online</span>
          </p>
        </div>
        <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] text-ink-muted">Replies in ~2 min</span>
      </header>

      <div ref={scroller} role="log" aria-live="polite" className="flex h-[280px] flex-col gap-1 overflow-y-auto px-4 py-4">
        {list.map((m, i) => {
          const mine = m.from === "user";
          const lastOfGroup = list[i + 1]?.from !== m.from;
          return (
            <motion.div
              key={m.id}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              style={{ originX: mine ? 1 : 0 }}
              className={cn("flex flex-col", mine ? "items-end" : "items-start", lastOfGroup && "mb-2")}
            >
              <p
                className={cn(
                  "max-w-[82%] px-3.5 py-2 text-[13.5px] leading-5",
                  mine ? "rounded-lg bg-ink text-bg" : "rounded-lg border border-border bg-surface text-ink",
                  lastOfGroup && (mine ? "rounded-br-xs" : "rounded-bl-xs"),
                )}
              >
                <span className="sr-only">{mine ? "You" : agentName}: </span>
                {m.text}
              </p>
              {lastOfGroup && <span className="mt-1 px-1 text-[11px] text-ink-subtle">{m.time}</span>}
            </motion.div>
          );
        })}
        <AnimatePresence>
          {typing && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: reduce ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: reduce ? 1 : 0.9 }}
              className="w-fit rounded-lg rounded-bl-xs border border-border bg-surface px-3 py-1.5"
            >
              <TypingDots reduce={reduce} />
              <span className="sr-only">{agentName} is typing</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="border-t border-border p-3">
        {chips.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            <AnimatePresence initial={false}>
              {chips.map((c) => (
                <motion.button
                  key={c.label}
                  type="button"
                  layout={!reduce}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileTap={reduce ? undefined : { scale: 0.95 }}
                  disabled={typing}
                  onClick={() => {
                    setChips((all) => all.filter((x) => x.label !== c.label));
                    send(c.label, c.reply);
                  }}
                  className="rounded-full border border-border-strong px-3 py-1 text-[12.5px] font-medium text-ink outline-none transition-colors hover:bg-surface-hover focus-visible:shadow-[var(--focus-ring)] disabled:opacity-50"
                >
                  {c.label}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft, fallbackReply);
            setDraft("");
          }}
          className="flex items-center gap-2 rounded-full border border-border-strong bg-surface py-1 pl-4 pr-1 focus-within:shadow-[var(--focus-ring)]"
        >
          <label htmlFor={inputId} className="sr-only">
            Message {agentName}
          </label>
          <input
            id={inputId}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Message ${agentName}`}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-subtle"
          />
          <motion.button
            type="submit"
            aria-label="Send message"
            disabled={!draft.trim() || typing}
            whileTap={reduce ? undefined : { scale: 0.9 }}
            className="grid size-8 shrink-0 place-items-center rounded-full bg-volt text-on-volt outline-none transition-colors disabled:bg-surface-sunken disabled:text-ink-subtle"
          >
            <ArrowUp aria-hidden className="size-4" strokeWidth={2.5} />
          </motion.button>
        </form>
      </div>
    </section>
  );
}
