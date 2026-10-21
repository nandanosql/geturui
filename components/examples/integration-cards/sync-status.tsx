"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckCircle2, LoaderCircle, OctagonAlert, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SyncRun {
  id: string;
  /** e.g. "Oct 2, 09:14". */
  at: string;
  ok: boolean;
  /** Seconds the run took; sets the bar height. */
  seconds: number;
}

export interface SyncStatusCardProps {
  app?: string;
  appMonogram?: string;
  runs?: SyncRun[];
  /** Shown while the latest run is failed. */
  error?: string;
  records?: number;
  /** Records the simulated retry syncs. */
  retryRecords?: number;
  /** Timestamp label the retry run gets. */
  retryAt?: string;
  nextRun?: string;
  defaultAutoSync?: boolean;
  /** Resolve when your real retry finishes; defaults to a simulated run. */
  onRetry?: () => Promise<void> | void;
  onAutoSyncChange?: (on: boolean) => void;
  className?: string;
}

const spring = { type: "spring", stiffness: 380, damping: 32 } as const;
const nf = new Intl.NumberFormat("en-US");

/** Sync health card: run history bars, a failure that collapses away on retry, a live record counter and an auto-sync switch. */
export function SyncStatusCard({
  app = "Ledgerly",
  appMonogram = "L",
  runs = [
    { id: "r1", at: "Sep 30, 06:00", ok: true, seconds: 42 },
    { id: "r2", at: "Sep 30, 12:00", ok: true, seconds: 38 },
    { id: "r3", at: "Sep 30, 18:00", ok: true, seconds: 51 },
    { id: "r4", at: "Oct 1, 00:00", ok: true, seconds: 29 },
    { id: "r5", at: "Oct 1, 06:00", ok: true, seconds: 44 },
    { id: "r6", at: "Oct 1, 12:00", ok: false, seconds: 12 },
    { id: "r7", at: "Oct 1, 18:00", ok: true, seconds: 63 },
    { id: "r8", at: "Oct 2, 00:00", ok: true, seconds: 35 },
    { id: "r9", at: "Oct 2, 06:00", ok: true, seconds: 40 },
    { id: "r10", at: "Oct 2, 09:14", ok: false, seconds: 9 },
  ],
  error = "Ledgerly rejected 3 invoices with a missing tax ID. Fix them or retry to skip them.",
  records = 12480,
  retryRecords = 318,
  retryAt = "Oct 2, 09:41",
  nextRun = "12:00",
  defaultAutoSync = true,
  onRetry,
  onAutoSyncChange,
  className,
}: SyncStatusCardProps) {
  const reduce = useReducedMotion();
  const [history, setHistory] = React.useState(runs);
  const [phase, setPhase] = React.useState<"idle" | "syncing">("idle");
  const [synced, setSynced] = React.useState(0);
  const [auto, setAuto] = React.useState(defaultAutoSync);
  const last = history[history.length - 1];
  const failed = !last.ok;
  const max = Math.max(...history.map((r) => r.seconds));
  const autoId = React.useId();
  const [extra, setExtra] = React.useState(0);
  const runNo = React.useRef(0);
  const total = records + extra;

  const finish = React.useCallback(() => {
    runNo.current += 1;
    const id = `retry-${runNo.current}`;
    setHistory((h) => [...h.slice(1), { id, at: retryAt, ok: true, seconds: 31 }]);
    setExtra((e) => e + retryRecords);
    setPhase("idle");
  }, [retryAt, retryRecords]);

  React.useEffect(() => {
    if (phase !== "syncing" || onRetry) return;
    if (synced >= retryRecords) {
      const id = window.setTimeout(finish, 250);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => setSynced((n) => Math.min(retryRecords, n + Math.ceil(retryRecords / 18))), 70);
    return () => window.clearTimeout(id);
  }, [phase, synced, retryRecords, onRetry, finish]);

  async function retry() {
    setSynced(0);
    setPhase("syncing");
    if (onRetry) {
      await onRetry();
      finish();
    }
  }

  const pill =
    phase === "syncing"
      ? { cls: "bg-info/12 text-info", Icon: LoaderCircle, label: "Syncing", spin: true }
      : failed
        ? { cls: "bg-danger/12 text-danger", Icon: OctagonAlert, label: "Failed", spin: false }
        : { cls: "bg-success/12 text-success", Icon: CheckCircle2, label: "Healthy", spin: false };

  return (
    <div className={cn("w-full max-w-[400px] rounded-lg border border-border bg-surface-raised p-4 shadow-sm", className)}>
      <div className="flex items-center gap-3">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-md bg-ink font-display text-[16px] font-bold text-bg">
          {appMonogram}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium text-ink">{app} sync</p>
          <p className="text-xs text-ink-subtle">
            Last run <span className="font-mono tabular-nums">{last.at}</span>
          </p>
        </div>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={pill.label}
            role="status"
            initial={{ opacity: 0, scale: 0.85, filter: "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.85, filter: "blur(6px)" }}
            transition={spring}
            className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", pill.cls)}
          >
            <pill.Icon aria-hidden className={cn("size-3", pill.spin && "animate-spin")} />
            {pill.label}
          </motion.span>
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {failed && phase === "idle" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduce ? { duration: 0 } : spring}
            className="overflow-hidden"
          >
            <p className="mt-3.5 flex gap-2 rounded-md border border-danger/25 bg-danger/8 p-3 text-[12.5px] leading-relaxed text-ink">
              <OctagonAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" />
              {error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-md bg-surface-sunken p-3">
          <dt className="text-[11px] text-ink-subtle">{phase === "syncing" ? "Records this run" : "Records synced"}</dt>
          <dd className="mt-0.5 font-mono text-[18px] font-medium text-ink tabular-nums">{nf.format(phase === "syncing" ? synced : total)}</dd>
        </div>
        <div className="rounded-md bg-surface-sunken p-3">
          <dt className="text-[11px] text-ink-subtle">Next scheduled run</dt>
          <dd className="mt-0.5 font-mono text-[18px] font-medium text-ink tabular-nums">{auto ? nextRun : "Paused"}</dd>
        </div>
      </dl>

      <div className="mt-4">
        <p className="mb-2 flex justify-between text-[11px] text-ink-subtle">
          <span>Last {history.length} runs</span>
          <span>
            <span className="font-mono tabular-nums">{history.filter((r) => !r.ok).length}</span> failed
          </span>
        </p>
        <ol className="flex h-12 items-end gap-1">
          <AnimatePresence initial={false} mode="popLayout">
            {history.map((r) => (
              <motion.li
                key={r.id}
                layout
                initial={{ opacity: 0, scaleY: reduce ? 1 : 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                exit={{ opacity: 0, scaleX: 0 }}
                transition={spring}
                title={`${r.at} · ${r.ok ? "Succeeded" : "Failed"} · ${r.seconds}s`}
                className={cn("flex-1 origin-bottom rounded-[3px]", r.ok ? "bg-ink/20" : "bg-danger")}
                style={{ height: `${Math.max(14, (r.seconds / max) * 100)}%` }}
              >
                <span className="sr-only">
                  {r.at}: {r.ok ? "succeeded" : "failed"} in {r.seconds} seconds
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      </div>

      <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
        <label htmlFor={autoId} className="flex flex-1 cursor-pointer items-center gap-2.5 text-[12.5px] text-ink-muted">
          <button
            id={autoId}
            type="button"
            role="switch"
            aria-checked={auto}
            onClick={() => {
              setAuto(!auto);
              onAutoSyncChange?.(!auto);
            }}
            className={cn("relative h-6 w-10 shrink-0 rounded-full p-0.5 outline-none transition-colors focus-visible:shadow-[var(--focus-ring)]", auto ? "bg-ink" : "bg-ink/15")}
          >
            <motion.span layout transition={spring} className={cn("block size-5 rounded-full bg-surface-raised shadow-sm", auto && "ml-auto")} />
          </button>
          Auto-sync every 6 hours
        </label>
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          disabled={phase === "syncing"}
          onClick={retry}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium outline-none transition-colors focus-visible:shadow-[var(--focus-ring)] disabled:opacity-70",
            failed ? "bg-volt text-on-volt" : "border border-border-strong text-ink hover:bg-surface-hover",
          )}
        >
          <RefreshCw aria-hidden className={cn("size-3.5", phase === "syncing" && "animate-spin")} />
          {phase === "syncing" ? "Syncing…" : failed ? "Retry sync" : "Sync now"}
        </motion.button>
      </div>
    </div>
  );
}
