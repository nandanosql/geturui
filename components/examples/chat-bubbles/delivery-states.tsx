"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertCircle, ArrowUp, Check, CheckCheck, Clock3, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

export type DeliveryStatus = "sending" | "sent" | "delivered" | "read" | "failed";

export interface DeliveryMessage {
  id: string;
  mine: boolean;
  text: string;
  time: string;
  status?: DeliveryStatus;
}

export interface DeliveryStatesProps {
  contact?: string;
  messages?: DeliveryMessage[];
  /** Walk new messages through sent, delivered and read. */
  autoRead?: boolean;
  onSend?: (text: string) => void;
  onRetry?: (id: string) => void;
  className?: string;
}

const DEFAULT_MESSAGES: DeliveryMessage[] = [
  { id: "d1", mine: false, text: "Are the new invoice templates ready for review?", time: "9:30" },
  { id: "d2", mine: true, text: "Yes, both versions are in the shared folder.", time: "9:31", status: "read" },
  { id: "d3", mine: true, text: "The second one has the tax breakdown you asked for.", time: "9:32", status: "delivered" },
  { id: "d4", mine: true, text: "Sending the PDF export now.", time: "9:33", status: "failed" },
];

const LABEL: Record<DeliveryStatus, string> = { sending: "Sending", sent: "Sent", delivered: "Delivered", read: "Read", failed: "Not delivered" };
const STEPS: [DeliveryStatus, number][] = [["sent", 700], ["delivered", 1500], ["read", 2800]];

function StatusIcon({ status }: { status: DeliveryStatus }) {
  const cls = "size-3.5";
  if (status === "sending") return <Clock3 aria-hidden className={cls} />;
  if (status === "sent") return <Check aria-hidden className={cls} strokeWidth={2.5} />;
  if (status === "failed") return <AlertCircle aria-hidden className={cn(cls, "text-danger")} />;
  return <CheckCheck aria-hidden className={cn(cls, status === "read" && "text-volt-ink")} strokeWidth={2.5} />;
}

/** Direct-message thread where each sent message animates through sending, sent, delivered and read, with a failed state you can retry. */
export function DeliveryStates({ contact = "Theo Lind", messages = DEFAULT_MESSAGES, autoRead = true, onSend, onRetry, className }: DeliveryStatesProps) {
  const reduce = useReducedMotion() ?? false;
  const [list, setList] = React.useState(messages);
  const [draft, setDraft] = React.useState("");
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const seq = React.useRef(0);
  const inputId = React.useId();

  React.useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  function setStatus(id: string, status: DeliveryStatus) {
    setList((l) => l.map((m) => (m.id === id ? { ...m, status } : m)));
  }

  function walk(id: string, fail = false) {
    setStatus(id, "sending");
    if (fail) return;
    STEPS.filter(([s]) => autoRead || s !== "read").forEach(([s, ms]) => timers.current.push(setTimeout(() => setStatus(id, s), ms)));
  }

  function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    seq.current += 1;
    const id = `new-${seq.current}`;
    setList((l) => [...l, { id, mine: true, text, time: "Now", status: "sending" }]);
    setDraft("");
    onSend?.(text);
    walk(id);
  }

  const lastRead = list.reduce((acc, m, i) => (m.mine && m.status === "read" ? i : acc), -1);
  const lastMine = list.reduce((acc, m, i) => (m.mine ? i : acc), -1);

  return (
    <section aria-label={`Messages with ${contact}`} className={cn("flex w-full max-w-[400px] flex-col rounded-xl border border-border bg-surface-raised shadow-sm", className)}>
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span aria-hidden className="grid size-8 place-items-center rounded-full bg-surface-sunken font-display text-[12px] font-semibold text-ink">
          {contact.split(" ").map((p) => p[0]).join("")}
        </span>
        <p className="text-[14px] font-semibold text-ink">{contact}</p>
      </header>

      <ol aria-live="polite" className="flex max-h-[320px] min-h-[240px] flex-col gap-1.5 overflow-y-auto px-4 py-4">
        <AnimatePresence initial={false}>
          {list.map((m, i) => {
            const status = m.status;
            return (
              <motion.li
                key={m.id}
                layout={reduce ? false : "position"}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                style={{ originX: m.mine ? 1 : 0 }}
                className={cn("flex flex-col", m.mine ? "items-end" : "items-start")}
              >
                <p
                  className={cn(
                    "max-w-[82%] rounded-lg px-3.5 py-2 text-[13.5px] leading-5 transition-opacity",
                    m.mine ? "rounded-br-xs bg-ink text-bg" : "rounded-bl-xs border border-border bg-surface text-ink",
                    status === "sending" && "opacity-70",
                    status === "failed" && "opacity-80",
                  )}
                >
                  {m.text}
                </p>
                {m.mine && status && (
                  <div className="mt-1 flex h-5 items-center gap-1.5 px-1 text-[11px] text-ink-subtle">
                    <span>{m.time}</span>
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={status}
                        initial={{ opacity: 0, scale: reduce ? 1 : 0.5, filter: "blur(4px)" }}
                        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, scale: reduce ? 1 : 0.5 }}
                        transition={{ type: "spring", stiffness: 520, damping: 28 }}
                        className={cn("inline-flex items-center gap-1", status === "failed" && "text-danger")}
                      >
                        <StatusIcon status={status} />
                        {status === "failed" || i === lastRead || i === lastMine ? LABEL[status] : <span className="sr-only">{LABEL[status]}</span>}
                      </motion.span>
                    </AnimatePresence>
                    {status === "failed" && (
                      <button
                        type="button"
                        onClick={() => {
                          onRetry?.(m.id);
                          walk(m.id);
                        }}
                        className="inline-flex items-center gap-1 rounded-full px-1.5 font-medium text-ink outline-none underline-offset-2 hover:underline focus-visible:shadow-[var(--focus-ring)]"
                      >
                        <RotateCw aria-hidden className="size-3" />
                        Retry
                      </button>
                    )}
                  </div>
                )}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>

      <form onSubmit={send} className="flex items-center gap-2 border-t border-border p-3">
        <label htmlFor={inputId} className="sr-only">
          Message {contact}
        </label>
        <input
          id={inputId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message"
          autoComplete="off"
          className="h-10 min-w-0 flex-1 rounded-full border border-border-strong bg-surface px-4 text-[13.5px] text-ink outline-none placeholder:text-ink-subtle focus-visible:shadow-[var(--focus-ring)]"
        />
        <motion.button
          type="submit"
          aria-label="Send message"
          disabled={!draft.trim()}
          whileTap={reduce ? undefined : { scale: 0.9 }}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-volt text-on-volt outline-none transition-colors focus-visible:shadow-[var(--focus-ring)] disabled:bg-surface-sunken disabled:text-ink-subtle"
        >
          <ArrowUp aria-hidden className="size-4" strokeWidth={2.5} />
        </motion.button>
      </form>
    </section>
  );
}
