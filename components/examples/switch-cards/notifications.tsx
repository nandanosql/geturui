"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BellOff, Check, Mail, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  channel: "email" | "push";
  enabled: boolean;
}

export interface NotificationSwitchCardProps {
  title?: string;
  settings?: NotificationSetting[];
  onChange?: (id: string, enabled: boolean) => void;
  className?: string;
}

const SETTINGS: NotificationSetting[] = [
  { id: "mentions", label: "Mentions and replies", description: "When someone @mentions you or replies to your thread.", channel: "email", enabled: true },
  { id: "digest", label: "Weekly digest", description: "A Monday summary of activity in your projects.", channel: "email", enabled: true },
  { id: "product", label: "Product updates", description: "New features and changes, about once a month.", channel: "email", enabled: false },
  { id: "assigned", label: "Assigned to you", description: "New tasks and reviews that need your input.", channel: "push", enabled: true },
  { id: "deploys", label: "Deploy status", description: "Builds that fail or finish on production.", channel: "push", enabled: false },
];
const GROUPS = [
  { channel: "email", label: "Email", Icon: Mail },
  { channel: "push", label: "Push", Icon: Smartphone },
] as const;
const spring = { type: "spring", stiffness: 520, damping: 32 } as const;

/** Accessible switch with a springy thumb that stretches while pressed. */
function Switch({ checked, onToggle, labelledBy, describedBy }: { checked: boolean; onToggle: () => void; labelledBy: string; describedBy: string }) {
  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onClick={onToggle}
      whileTap="press"
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border p-[2px] outline-none transition-colors duration-200 focus-visible:shadow-[var(--focus-ring)]",
        checked ? "border-transparent bg-volt" : "border-border-strong bg-surface-sunken",
      )}
    >
      <motion.span
        animate={{ x: checked ? 16 : 0 }}
        variants={{ press: { scaleX: 1.25 } }}
        transition={spring}
        style={{ originX: checked ? 1 : 0 }}
        className={cn("block size-[18px] rounded-full shadow-sm", checked ? "bg-on-volt" : "bg-ink-subtle")}
      />
    </motion.button>
  );
}

/** Notification preferences grouped by channel; each switch springs and a quiet "Saved" confirmation fades in. */
export function NotificationSwitchCard({ title = "Notifications", settings = SETTINGS, onChange, className }: NotificationSwitchCardProps) {
  const reduce = useReducedMotion();
  const uid = React.useId();
  const [state, setState] = React.useState(() => Object.fromEntries(settings.map((s) => [s.id, s.enabled])));
  const [saved, setSaved] = React.useState(0);
  const allOff = settings.every((s) => !state[s.id]);

  React.useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(0), 1800);
    return () => clearTimeout(t);
  }, [saved]);

  function toggle(id: string) {
    const next = !state[id];
    setState((s) => ({ ...s, [id]: next }));
    setSaved((n) => n + 1);
    onChange?.(id, next);
  }

  return (
    <section aria-labelledby={`${uid}-title`} className={cn("w-full max-w-[460px] rounded-lg border border-border bg-surface-raised shadow-sm", className)}>
      <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 id={`${uid}-title`} className="font-display text-[16px] font-semibold text-ink">{title}</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-muted">Choose what reaches you and where.</p>
        </div>
        <p role="status" className="h-6 text-[12px]">
          <AnimatePresence>
            {saved > 0 && (
              <motion.span key={saved} initial={{ opacity: 0, y: reduce ? 0 : 4, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0 }} className="inline-flex items-center gap-1 rounded-full bg-surface-sunken px-2 py-1 font-medium text-ink-muted ring-1 ring-border">
                <Check aria-hidden className="size-3 text-success" />
                Saved
              </motion.span>
            )}
          </AnimatePresence>
        </p>
      </header>

      {GROUPS.map(({ channel, label, Icon }) => (
        <div key={channel} role="group" aria-labelledby={`${uid}-${channel}`} className="px-5 py-3">
          <p id={`${uid}-${channel}`} className="flex items-center gap-1.5 py-1 text-[11.5px] font-medium uppercase tracking-wide text-ink-subtle">
            <Icon aria-hidden className="size-3.5" />
            {label}
          </p>
          <ul>
            {settings.filter((s) => s.channel === channel).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 py-2.5">
                <div className="min-w-0">
                  <p id={`${uid}-${s.id}`} className={cn("text-[13.5px] font-medium transition-colors", state[s.id] ? "text-ink" : "text-ink-muted")}>{s.label}</p>
                  <p id={`${uid}-${s.id}-d`} className="text-[12px] text-ink-subtle">{s.description}</p>
                </div>
                <Switch checked={!!state[s.id]} onToggle={() => toggle(s.id)} labelledBy={`${uid}-${s.id}`} describedBy={`${uid}-${s.id}-d`} />
              </li>
            ))}
          </ul>
        </div>
      ))}

      <AnimatePresence initial={false}>
        {allOff && (
          <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={reduce ? { duration: 0 } : spring} className="overflow-hidden">
            <span className="flex items-center gap-2 border-t border-border px-5 py-3 text-[12.5px] text-warning">
              <BellOff aria-hidden className="size-4 shrink-0" />
              All notifications are off. You may miss mentions and failed deploys.
            </span>
          </motion.p>
        )}
      </AnimatePresence>
    </section>
  );
}
