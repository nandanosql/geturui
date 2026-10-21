"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, LoaderCircle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PlanFeature {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  /** Id of the feature this one depends on. */
  parent?: string;
  /** Plan needed to use it; renders a locked row. */
  requires?: string;
}

export interface PlanFeatureCardProps {
  workspace?: string;
  features?: PlanFeature[];
  onSave?: (values: Record<string, boolean>) => void | Promise<void>;
  onUpgrade?: (plan: string) => void;
  className?: string;
}

const FEATURES: PlanFeature[] = [
  { id: "public", label: "Public links", description: "Anyone with the link can view shared pages.", enabled: true },
  { id: "password", label: "Require a password", description: "Visitors enter a password before viewing.", enabled: false, parent: "public" },
  { id: "index", label: "Allow search engines", description: "Let public pages appear in search results.", enabled: false, parent: "public" },
  { id: "ai", label: "Writing assistant", description: "Draft, summarize and rewrite inside docs.", enabled: false },
  { id: "ai-train", label: "Learn from workspace", description: "Use your docs to improve suggestions for your team.", enabled: false, parent: "ai" },
  { id: "sso", label: "SAML single sign-on", description: "Sign in through Okta, Entra ID or Google Workspace.", enabled: false, requires: "Business" },
];
const spring = { type: "spring", stiffness: 520, damping: 32 } as const;
const soft = { type: "spring", stiffness: 320, damping: 30 } as const;

function Switch({ checked, disabled, onToggle, labelledBy, describedBy }: { checked: boolean; disabled?: boolean; onToggle: () => void; labelledBy: string; describedBy: string }) {
  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={onToggle}
      whileTap={disabled ? undefined : "press"}
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border p-[2px] outline-none transition-[background-color,border-color,opacity] duration-200 focus-visible:shadow-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-40",
        checked ? "border-transparent bg-volt" : "border-border-strong bg-surface-sunken",
      )}
    >
      <motion.span animate={{ x: checked ? 16 : 0 }} variants={{ press: { scaleX: 1.25 } }} transition={spring} style={{ originX: checked ? 1 : 0 }} className={cn("block size-[18px] rounded-full shadow-sm", checked ? "bg-on-volt" : "bg-ink-subtle")} />
    </motion.button>
  );
}

/** Workspace feature toggles where child options unlock with their parent, locked features show the plan they need, and a save bar springs in once something changes. */
export function PlanFeatureCard({ workspace = "Northwind Studio", features = FEATURES, onSave = () => new Promise((r) => setTimeout(r, 900)), onUpgrade, className }: PlanFeatureCardProps) {
  const reduce = useReducedMotion();
  const uid = React.useId();
  const initial = React.useMemo(() => Object.fromEntries(features.map((f) => [f.id, f.enabled])), [features]);
  const [base, setBase] = React.useState(initial);
  const [values, setValues] = React.useState(initial);
  const [status, setStatus] = React.useState<"idle" | "saving" | "saved">("idle");
  const dirty = features.filter((f) => values[f.id] !== base[f.id]).length;

  async function save() {
    setStatus("saving");
    await onSave(values);
    setBase(values);
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 1600);
  }

  return (
    <section aria-labelledby={`${uid}-t`} className={cn("w-full max-w-[480px] overflow-hidden rounded-lg border border-border bg-surface-raised shadow-sm", className)}>
      <header className="border-b border-border px-5 py-4">
        <h2 id={`${uid}-t`} className="font-display text-[16px] font-semibold text-ink">Features</h2>
        <p className="mt-0.5 text-[12.5px] text-ink-muted">Applies to everyone in {workspace}.</p>
      </header>
      <ul className="divide-y divide-border">
        {features.filter((f) => !f.parent).map((f) => {
          const children = features.filter((c) => c.parent === f.id);
          const on = !!values[f.id];
          return (
            <li key={f.id} className="px-5 py-3.5">
              <Row f={f} uid={uid} checked={on} disabled={!!f.requires} onToggle={() => setValues((v) => ({ ...v, [f.id]: !on }))} onUpgrade={onUpgrade} />
              {children.length > 0 && (
                <motion.ul
                  aria-label={`${f.label} options`}
                  animate={{ opacity: on ? 1 : 0.55 }}
                  transition={{ duration: 0.2 }}
                  className="relative ml-1 mt-2 space-y-2.5 border-l border-border-strong/40 pl-4"
                >
                  {children.map((c) => (
                    <li key={c.id}>
                      <Row f={c} uid={uid} checked={on && !!values[c.id]} disabled={!on} onToggle={() => setValues((v) => ({ ...v, [c.id]: !v[c.id] }))} />
                    </li>
                  ))}
                  <AnimatePresence initial={false}>
                    {!on && (
                      <motion.li initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={reduce ? { duration: 0 } : soft} className="overflow-hidden text-[11.5px] text-ink-subtle">
                        Turn on {f.label.toLowerCase()} to change these.
                      </motion.li>
                    )}
                  </AnimatePresence>
                </motion.ul>
              )}
            </li>
          );
        })}
      </ul>
      <AnimatePresence initial={false}>
        {(dirty > 0 || status !== "idle") && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={reduce ? { duration: 0 } : soft} className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-t border-border bg-surface px-5 py-3">
              <p aria-live="polite" className="text-[12.5px] text-ink-muted">
                {status === "saved" ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-success"><Check aria-hidden className="size-3.5" />Changes saved</span>
                ) : (
                  `${dirty} unsaved ${dirty === 1 ? "change" : "changes"}`
                )}
              </p>
              {status !== "saved" && (
                <div className="flex gap-2">
                  <button type="button" disabled={status === "saving"} onClick={() => setValues(base)} className="h-8 rounded-full px-3 text-[12.5px] font-medium text-ink-muted outline-none hover:bg-surface-hover hover:text-ink focus-visible:shadow-[var(--focus-ring)]">
                    Discard
                  </button>
                  <motion.button type="button" disabled={status === "saving"} whileTap={{ scale: 0.96 }} onClick={save} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-volt px-3.5 text-[12.5px] font-semibold text-on-volt outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-80">
                    {status === "saving" && <LoaderCircle aria-hidden className="size-3.5 animate-spin" />}
                    Save changes
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function Row({ f, uid, checked, disabled, onToggle, onUpgrade }: { f: PlanFeature; uid: string; checked: boolean; disabled: boolean; onToggle: () => void; onUpgrade?: (plan: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p id={`${uid}-${f.id}`} className={cn("flex items-center gap-2 font-medium", f.parent ? "text-[13px]" : "text-[13.5px]", disabled ? "text-ink-muted" : "text-ink")}>
          {f.label}
          {f.requires && (
            <span className="inline-flex items-center gap-1 rounded-full bg-ember-soft px-1.5 py-0.5 text-[10.5px] font-semibold text-ember-ink">
              <Lock aria-hidden className="size-2.5" />
              {f.requires}
            </span>
          )}
        </p>
        <p id={`${uid}-${f.id}-d`} className="text-[12px] text-ink-subtle">
          {f.description}
          {f.requires && (
            <>
              {" "}
              <button type="button" onClick={() => onUpgrade?.(f.requires ?? "")} className="rounded-xs font-medium text-ink underline underline-offset-2 outline-none focus-visible:shadow-[var(--focus-ring)]">
                Upgrade to {f.requires}
              </button>
            </>
          )}
        </p>
      </div>
      <Switch checked={checked} disabled={disabled} onToggle={onToggle} labelledBy={`${uid}-${f.id}`} describedBy={`${uid}-${f.id}-d`} />
    </div>
  );
}
