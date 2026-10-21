"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PrivacySetting {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  /** Ask before turning this off; the text explains the consequence. */
  confirmOff?: string;
}

export interface PrivacySwitchCardProps {
  settings?: PrivacySetting[];
  onChange?: (id: string, enabled: boolean) => void;
  className?: string;
}

const SETTINGS: PrivacySetting[] = [
  { id: "presence", label: "Show when I’m online", description: "Teammates see a green dot next to your name.", enabled: true },
  { id: "receipts", label: "Read receipts", description: "Let people know when you’ve read their message.", enabled: false },
  { id: "analytics", label: "Share usage data", description: "Anonymous diagnostics that help us fix bugs faster.", enabled: true },
  { id: "alerts", label: "Sign-in alerts", description: "Email me when a new device signs in.", enabled: true, confirmOff: "You won’t hear about sign-ins from new devices, including ones that aren’t yours." },
  { id: "2fa", label: "Two-step verification", description: "Ask for a code from your authenticator app.", enabled: true, confirmOff: "Anyone with your password could sign in. We recommend keeping this on." },
];
const spring = { type: "spring", stiffness: 520, damping: 32 } as const;
const soft = { type: "spring", stiffness: 320, damping: 30 } as const;

/** Privacy settings where risky switches ask first: turning one off springs open an inline confirmation that holds focus until you choose. */
export function PrivacySwitchCard({ settings = SETTINGS, onChange, className }: PrivacySwitchCardProps) {
  const reduce = useReducedMotion();
  const uid = React.useId();
  const [state, setState] = React.useState(() => Object.fromEntries(settings.map((s) => [s.id, s.enabled])));
  const [pending, setPending] = React.useState<string | null>(null);
  const switchRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const keepRef = React.useRef<HTMLButtonElement>(null);
  const protectedCount = settings.filter((s) => s.confirmOff && state[s.id]).length;
  const totalProtected = settings.filter((s) => s.confirmOff).length;

  React.useEffect(() => {
    if (pending) requestAnimationFrame(() => keepRef.current?.focus());
  }, [pending]);

  function set(id: string, value: boolean) {
    setState((s) => ({ ...s, [id]: value }));
    onChange?.(id, value);
  }

  function toggle(s: PrivacySetting) {
    if (state[s.id] && s.confirmOff) return setPending(pending === s.id ? null : s.id);
    setPending(null);
    set(s.id, !state[s.id]);
  }

  function resolve(turnOff: boolean) {
    if (!pending) return;
    if (turnOff) set(pending, false);
    switchRefs.current[pending]?.focus();
    setPending(null);
  }

  const secure = protectedCount === totalProtected;

  return (
    <section aria-labelledby={`${uid}-t`} className={cn("w-full max-w-[460px] overflow-hidden rounded-lg border border-border bg-surface-raised shadow-sm", className)}>
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 id={`${uid}-t`} className="font-display text-[16px] font-semibold text-ink">Privacy and security</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-muted">Control what others see and how you sign in.</p>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={String(secure)}
            role="status"
            initial={{ opacity: 0, scale: reduce ? 1 : 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reduce ? 1 : 0.85 }}
            transition={spring}
            className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11.5px] font-medium ring-1", secure ? "text-success ring-success/30" : "text-warning ring-warning/40")}
          >
            {secure ? <ShieldCheck aria-hidden className="size-3.5" /> : <ShieldAlert aria-hidden className="size-3.5" />}
            {secure ? "Protected" : "At risk"}
          </motion.span>
        </AnimatePresence>
      </header>
      <ul className="divide-y divide-border">
        {settings.map((s) => {
          const on = !!state[s.id];
          const asking = pending === s.id;
          return (
            <li key={s.id} className="px-5 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p id={`${uid}-${s.id}`} className="text-[13.5px] font-medium text-ink">{s.label}</p>
                  <p id={`${uid}-${s.id}-d`} className="text-[12px] text-ink-subtle">{s.description}</p>
                </div>
                <motion.button
                  ref={(el) => {
                    switchRefs.current[s.id] = el;
                  }}
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-labelledby={`${uid}-${s.id}`}
                  aria-describedby={`${uid}-${s.id}-d`}
                  aria-expanded={s.confirmOff ? asking : undefined}
                  aria-controls={s.confirmOff ? `${uid}-${s.id}-c` : undefined}
                  onClick={() => toggle(s)}
                  whileTap="press"
                  className={cn(
                    "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border p-[2px] outline-none transition-colors duration-200 focus-visible:shadow-[var(--focus-ring)]",
                    on ? "border-transparent bg-volt" : "border-border-strong bg-surface-sunken",
                    asking && "ring-2 ring-danger/50",
                  )}
                >
                  <motion.span animate={{ x: asking ? 8 : on ? 16 : 0 }} variants={{ press: { scaleX: 1.25 } }} transition={spring} style={{ originX: on ? 1 : 0 }} className={cn("block size-[18px] rounded-full shadow-sm", on ? "bg-on-volt" : "bg-ink-subtle")} />
                </motion.button>
              </div>
              <AnimatePresence initial={false}>
                {asking && (
                  <motion.div
                    id={`${uid}-${s.id}-c`}
                    role="alertdialog"
                    aria-labelledby={`${uid}-${s.id}-q`}
                    aria-describedby={`${uid}-${s.id}-w`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={reduce ? { duration: 0 } : soft}
                    onKeyDown={(e) => {
                      if (e.key !== "Escape") return;
                      e.stopPropagation();
                      resolve(false);
                    }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 rounded-md border border-danger/30 bg-surface-sunken p-3">
                      <p id={`${uid}-${s.id}-q`} className="flex items-center gap-1.5 text-[13px] font-medium text-danger">
                        <ShieldAlert aria-hidden className="size-4" />
                        Turn off {s.label.toLowerCase()}?
                      </p>
                      <p id={`${uid}-${s.id}-w`} className="mt-1 text-[12.5px] text-ink-muted">{s.confirmOff}</p>
                      <div className="mt-3 flex justify-end gap-2">
                        <button ref={keepRef} type="button" onClick={() => resolve(false)} className="h-8 rounded-full bg-ink px-3.5 text-[12.5px] font-semibold text-bg outline-none focus-visible:shadow-[var(--focus-ring)]">
                          Keep it on
                        </button>
                        <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={() => resolve(true)} className="h-8 rounded-full border border-danger/50 px-3.5 text-[12.5px] font-medium text-danger outline-none transition-colors hover:bg-danger/10 focus-visible:shadow-[var(--focus-ring)]">
                          Turn off
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
