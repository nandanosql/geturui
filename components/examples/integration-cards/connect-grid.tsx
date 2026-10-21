"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckCircle2, LoaderCircle, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type IntegrationGlyph = "ring" | "diamond" | "stack" | "wave" | "split" | "bolt";

export interface IntegrationApp {
  id: string;
  name: string;
  category: string;
  description: string;
  glyph?: IntegrationGlyph;
  connected?: boolean;
}

export interface IntegrationGridProps {
  apps?: IntegrationApp[];
  /** Resolve to finish connecting; defaults to a short simulated delay. */
  onConnect?: (id: string) => Promise<void> | void;
  onDisconnect?: (id: string) => void;
  className?: string;
}

type Status = "idle" | "connecting" | "connected";
const spring = { type: "spring", stiffness: 380, damping: 30 } as const;

/** Monochrome mark drawn from simple shapes, so third-party apps never bring their own colours. */
export function Glyph({ kind = "ring", className }: { kind?: IntegrationGlyph; className?: string }) {
  const shapes: Record<IntegrationGlyph, React.ReactNode> = {
    ring: (
      <>
        <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      </>
    ),
    diamond: <path d="M12 3 21 12 12 21 3 12Z M12 8 16 12 12 16 8 12Z" fill="currentColor" fillRule="evenodd" />,
    stack: (
      <>
        <rect x="4" y="4" width="16" height="4" rx="2" fill="currentColor" />
        <rect x="4" y="10" width="11" height="4" rx="2" fill="currentColor" opacity=".7" />
        <rect x="4" y="16" width="7" height="4" rx="2" fill="currentColor" opacity=".45" />
      </>
    ),
    wave: <path d="M3 15c3-6 6-6 9 0s6 6 9 0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />,
    split: (
      <>
        <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" />
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
      </>
    ),
    bolt: <path d="M13 2 5 14h6l-1 8 8-12h-6Z" fill="currentColor" />,
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      {shapes[kind]}
    </svg>
  );
}

/** Grid of integrations with All/Connected filters and an optimistic connect flow: spinner, then a springy connected state. */
export function IntegrationGrid({
  apps = [
    { id: "lumen", name: "Lumen CRM", category: "CRM", description: "Sync contacts and deal stages.", glyph: "ring", connected: true },
    { id: "ledgerly", name: "Ledgerly", category: "Accounting", description: "Push paid invoices to your books.", glyph: "stack" },
    { id: "parcel", name: "Parcel", category: "Shipping", description: "Create labels when orders ship.", glyph: "diamond" },
    { id: "helio", name: "Helio Docs", category: "Docs", description: "Attach specs to any project.", glyph: "split", connected: true },
    { id: "quartz", name: "Quartz", category: "Analytics", description: "Stream events to your dashboards.", glyph: "wave" },
    { id: "relay", name: "Relay", category: "Automation", description: "Trigger workflows on new records.", glyph: "bolt" },
  ],
  onConnect,
  onDisconnect,
  className,
}: IntegrationGridProps) {
  const reduce = useReducedMotion();
  const [status, setStatus] = React.useState<Record<string, Status>>(() => Object.fromEntries(apps.map((a) => [a.id, a.connected ? "connected" : "idle"])));
  const [filter, setFilter] = React.useState<"all" | "connected">("all");
  const timers = React.useRef<number[]>([]);
  const tabsId = React.useId();
  React.useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const connectedCount = apps.filter((a) => status[a.id] === "connected").length;
  const visible = apps.filter((a) => filter === "all" || status[a.id] === "connected");

  async function connect(id: string) {
    setStatus((s) => ({ ...s, [id]: "connecting" }));
    if (onConnect) await onConnect(id);
    else await new Promise<void>((r) => timers.current.push(window.setTimeout(r, 1100)));
    setStatus((s) => ({ ...s, [id]: "connected" }));
  }

  return (
    <div className={cn("w-full max-w-[560px] rounded-lg border border-border bg-surface-raised p-4 shadow-sm", className)}>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-[17px] font-semibold tracking-tight text-ink">Integrations</h3>
          <p className="text-xs text-ink-subtle">Connect the tools your team already uses.</p>
        </div>
        <div role="tablist" aria-label="Filter integrations" className="flex rounded-full bg-surface-sunken p-0.5">
          {(["all", "connected"] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              aria-controls={tabsId}
              onClick={() => setFilter(f)}
              className={cn(
                "relative h-7 rounded-full px-3 text-[12px] font-medium outline-none transition-colors focus-visible:shadow-[var(--focus-ring)]",
                filter === f ? "text-ink" : "text-ink-subtle hover:text-ink",
              )}
            >
              {filter === f && <motion.span layoutId={`${tabsId}-pill`} transition={spring} className="absolute inset-0 rounded-full border border-border bg-surface-raised shadow-sm" />}
              <span className="relative">
                {f === "all" ? "All" : "Connected"}{" "}
                <span className="font-mono text-ink-subtle tabular-nums">{f === "all" ? apps.length : connectedCount}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <motion.ul id={tabsId} role="tabpanel" layout className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((a) => {
            const st = status[a.id];
            return (
              <motion.li
                key={a.id}
                layout
                initial={{ opacity: 0, scale: reduce ? 1 : 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: reduce ? 1 : 0.94 }}
                transition={spring}
                className="flex flex-col gap-3 rounded-md border border-border bg-surface p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="grid size-10 shrink-0 place-items-center rounded-sm border border-border bg-surface-raised text-ink shadow-sm">
                    <Glyph kind={a.glyph} className="size-5" />
                  </span>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    disabled={st === "connecting"}
                    aria-label={`${st === "connected" ? "Disconnect" : "Connect"} ${a.name}`}
                    onClick={() => {
                      if (st === "connected") {
                        setStatus((s) => ({ ...s, [a.id]: "idle" }));
                        onDisconnect?.(a.id);
                      } else connect(a.id);
                    }}
                    className={cn(
                      "inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-[12px] font-medium outline-none transition-colors focus-visible:shadow-[var(--focus-ring)]",
                      st === "connected" ? "text-ink-muted hover:bg-surface-hover hover:text-ink" : "border border-border-strong text-ink hover:bg-surface-hover",
                    )}
                  >
                    {st === "connecting" ? (
                      <LoaderCircle aria-hidden className="size-3.5 animate-spin" />
                    ) : st === "connected" ? (
                      "Disconnect"
                    ) : (
                      <>
                        <Plus aria-hidden className="size-3.5" />
                        Connect
                      </>
                    )}
                  </motion.button>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-medium text-ink">
                    {a.name} <span className="text-[11.5px] font-normal text-ink-subtle">· {a.category}</span>
                  </p>
                  <AnimatePresence mode="popLayout" initial={false}>
                    {st === "connected" ? (
                      <motion.p
                        key="on"
                        initial={{ opacity: 0, y: reduce ? 0 : 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-0.5 flex min-h-[34px] items-start gap-1 text-[12px] font-medium text-success"
                      >
                        <CheckCircle2 aria-hidden className="mt-0.5 size-3.5" /> Connected and syncing
                      </motion.p>
                    ) : (
                      <motion.p key="off" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-0.5 line-clamp-2 min-h-[34px] text-[12px] leading-[17px] text-ink-muted">
                        {a.description}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
        {visible.length === 0 && <li className="col-span-full py-8 text-center text-[13px] text-ink-muted">Nothing connected yet. Pick a tool from All to get started.</li>}
      </motion.ul>
    </div>
  );
}
