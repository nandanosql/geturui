"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Eye, FileText, Lock, Pencil, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export interface IntegrationPermission {
  id: string;
  title: string;
  description: string;
  icon?: "read" | "write" | "people" | "files";
  /** Cannot be turned off. */
  required?: boolean;
  defaultGranted?: boolean;
}

export interface IntegrationDetailProps {
  app?: string;
  appMonogram?: string;
  workspace?: string;
  workspaceMonogram?: string;
  publisher?: string;
  permissions?: IntegrationPermission[];
  /** Receives the ids of granted permissions. */
  onAuthorize?: (granted: string[]) => void;
  onCancel?: () => void;
  className?: string;
}

const icons = { read: Eye, write: Pencil, people: Users, files: FileText };
const spring = { type: "spring", stiffness: 420, damping: 30 } as const;

/** Consent card for a single integration: linked marks, a permissions list with spring switches and an authorize flow that resolves into a drawn check. */
export function IntegrationDetail({
  app = "Ledgerly",
  appMonogram = "L",
  workspace = "Fieldnote",
  workspaceMonogram = "F",
  publisher = "Ledgerly Inc. · Verified publisher",
  permissions = [
    { id: "read", title: "Read invoices and payouts", description: "Needed to match payments to your books.", icon: "read", required: true },
    { id: "write", title: "Create draft invoices", description: "Drafts stay unsent until you approve them.", icon: "write", defaultGranted: true },
    { id: "people", title: "View customer contacts", description: "Name, company and billing email only.", icon: "people", defaultGranted: true },
    { id: "files", title: "Attach receipts", description: "Upload PDFs to matching transactions.", icon: "files" },
  ],
  onAuthorize,
  onCancel,
  className,
}: IntegrationDetailProps) {
  const reduce = useReducedMotion();
  const [granted, setGranted] = React.useState<Record<string, boolean>>(() => Object.fromEntries(permissions.map((p) => [p.id, !!(p.required || p.defaultGranted)])));
  const [phase, setPhase] = React.useState<"review" | "working" | "done">("review");
  const uid = React.useId();
  const count = Object.values(granted).filter(Boolean).length;

  React.useEffect(() => {
    if (phase !== "working") return;
    const id = window.setTimeout(() => setPhase("done"), 1100);
    return () => window.clearTimeout(id);
  }, [phase]);

  const mark = (m: string, strong?: boolean) => (
    <span className={cn("grid size-12 place-items-center rounded-md font-display text-[18px] font-bold shadow-sm", strong ? "bg-ink text-bg" : "border border-border bg-surface text-ink")}>
      {m}
    </span>
  );

  return (
    <div className={cn("w-full max-w-[400px] overflow-hidden rounded-lg border border-border bg-surface-raised shadow-sm", className)}>
      <div className="flex flex-col items-center px-5 pt-6 text-center">
        <div aria-hidden className="relative flex items-center">
          {mark(workspaceMonogram, true)}
          <svg viewBox="0 0 72 12" className="h-3 w-[72px] text-border-strong">
            <motion.line
              x1="4"
              y1="6"
              x2="68"
              y2="6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="3 4"
              animate={reduce || phase === "done" ? { strokeDashoffset: 0 } : { strokeDashoffset: [0, -14] }}
              transition={{ duration: phase === "working" ? 0.3 : 1.2, repeat: reduce || phase === "done" ? 0 : Infinity, ease: "linear" }}
            />
          </svg>
          {mark(appMonogram)}
          <span className="absolute left-1/2 top-1/2 grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-border bg-surface-raised text-ink-muted">
            <Lock className="size-3" />
          </span>
        </div>
        <h3 className="mt-4 font-display text-[17px] font-semibold tracking-tight text-ink">
          Connect {app} to {workspace}
        </h3>
        <p className="mt-1 inline-flex items-center gap-1 text-[12px] text-ink-subtle">
          <ShieldCheck aria-hidden className="size-3.5" />
          {publisher}
        </p>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {phase !== "done" ? (
          <motion.div key="review" exit={{ opacity: 0, filter: "blur(8px)" }} transition={{ duration: 0.18 }}>
            <p className="px-5 pt-5 text-[12px] font-medium text-ink-muted">{app} will be able to</p>
            <ul className="mt-1.5 px-3">
              {permissions.map((p) => {
                const Icon = icons[p.icon ?? "read"];
                const on = granted[p.id];
                return (
                  <li key={p.id} className="flex items-center gap-3 rounded-md px-2 py-2.5">
                    <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-sm bg-surface-sunken text-ink-muted">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p id={`${uid}-${p.id}`} className="text-[13px] font-medium text-ink">
                        {p.title}
                      </p>
                      <p className="text-[11.5px] text-ink-subtle">{p.required ? "Required · " : ""}{p.description}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-labelledby={`${uid}-${p.id}`}
                      disabled={p.required || phase === "working"}
                      onClick={() => setGranted((g) => ({ ...g, [p.id]: !g[p.id] }))}
                      className={cn(
                        "relative h-6 w-10 shrink-0 rounded-full p-0.5 outline-none transition-colors focus-visible:shadow-[var(--focus-ring)] disabled:cursor-not-allowed",
                        on ? "bg-ink" : "bg-ink/15",
                        p.required && "opacity-50",
                      )}
                    >
                      <motion.span layout transition={spring} className={cn("block size-5 rounded-full bg-surface-raised shadow-sm", on && "ml-auto")} />
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="flex gap-2 border-t border-border p-4">
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={onCancel}
                className="inline-flex h-10 flex-1 items-center justify-center rounded-full border border-border-strong text-[13px] font-medium text-ink outline-none transition-colors hover:bg-surface-hover focus-visible:shadow-[var(--focus-ring)]"
              >
                Cancel
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                disabled={phase === "working"}
                aria-busy={phase === "working"}
                onClick={() => {
                  setPhase("working");
                  onAuthorize?.(Object.keys(granted).filter((k) => granted[k]));
                }}
                className="relative inline-flex h-10 flex-[1.4] items-center justify-center overflow-hidden rounded-full bg-volt text-[13px] font-medium text-on-volt outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                {phase === "working" && (
                  <motion.span aria-hidden className="absolute inset-y-0 left-0 bg-on-volt/15" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 1.1, ease: "easeInOut" }} />
                )}
                <span className="relative">
                  {phase === "working" ? "Authorizing…" : `Authorize ${count} permission${count === 1 ? "" : "s"}`}
                </span>
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="done"
            role="status"
            initial={{ opacity: 0, y: reduce ? 0 : 10, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={spring}
            className="flex flex-col items-center px-5 pb-6 pt-5 text-center"
          >
            <svg viewBox="0 0 48 48" aria-hidden className="size-12 text-success">
              <motion.circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" strokeWidth="2.5" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5 }} />
              <motion.path d="M15 24.5 21.5 31 33 18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, delay: 0.4 }} />
            </svg>
            <p className="mt-3 text-[14px] font-medium text-ink">{app} is connected</p>
            <p className="mt-1 text-[12.5px] text-ink-muted">
              <span className="font-mono tabular-nums">{count}</span> of <span className="font-mono tabular-nums">{permissions.length}</span> permissions granted. You can change them in Settings at any time.
            </p>
            <button
              type="button"
              onClick={() => setPhase("review")}
              className="mt-4 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-ink-muted outline-none transition-colors hover:bg-surface-hover hover:text-ink focus-visible:shadow-[var(--focus-ring)]"
            >
              Review permissions
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
