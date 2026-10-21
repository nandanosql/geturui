"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type AppearanceTheme = "light" | "dark" | "system";

export interface AppearanceSettings {
  theme: AppearanceTheme;
  /** Interface text scale in percent. */
  textSize: number;
}

export interface AppearanceCardProps {
  defaultValue?: AppearanceSettings;
  /** Fires with every change. The card only previews; apply the result yourself. */
  onChange?: (value: AppearanceSettings) => void;
  className?: string;
}

const THEMES = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
] as const;
const SIZES = [90, 100, 110, 125];
const DEFAULT: AppearanceSettings = { theme: "dark", textSize: 100 };
const spring = { type: "spring", stiffness: 420, damping: 30 } as const;

/** A tiny app window drawn with tokens, scoped to one theme with data-theme. */
function Mini({ scheme }: { scheme: "light" | "dark" }) {
  return (
    <div data-theme={scheme} className="flex h-full w-full gap-1.5 bg-bg p-2">
      <div className="flex w-1/4 flex-col gap-1 rounded-[4px] bg-surface p-1">
        <span className="h-1.5 w-full rounded-full bg-volt" />
        <span className="h-1 w-3/4 rounded-full bg-ink-subtle/50" />
        <span className="h-1 w-2/3 rounded-full bg-ink-subtle/50" />
      </div>
      <div className="flex flex-1 flex-col gap-1 rounded-[4px] border border-border bg-surface-raised p-1.5">
        <span className="h-1.5 w-2/3 rounded-full bg-ink" />
        <span className="h-1 w-full rounded-full bg-ink-subtle/40" />
        <span className="h-1 w-5/6 rounded-full bg-ink-subtle/40" />
        <span className="mt-auto h-2.5 w-8 rounded-full bg-volt" />
      </div>
    </div>
  );
}

/** Appearance settings with mini window previews for each theme, a springing check on the chosen one and a live text-size sample. */
export function AppearanceCard({ defaultValue = DEFAULT, onChange, className }: AppearanceCardProps) {
  const reduce = useReducedMotion();
  const uid = React.useId();
  const [value, setValue] = React.useState(defaultValue);
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  function update(next: Partial<AppearanceSettings>) {
    const v = { ...value, ...next };
    setValue(v);
    onChange?.(v);
  }

  function onKey(e: React.KeyboardEvent) {
    const i = THEMES.findIndex((t) => t.id === value.theme);
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const n = (i + step + THEMES.length) % THEMES.length;
    update({ theme: THEMES[n].id });
    refs.current[n]?.focus();
  }

  const sizeIndex = SIZES.indexOf(value.textSize);

  return (
    <section aria-labelledby={`${uid}-t`} className={cn("w-full max-w-[520px] rounded-lg border border-border bg-surface-raised p-5 shadow-sm", className)}>
      <h2 id={`${uid}-t`} className="font-display text-[16px] font-semibold text-ink">Appearance</h2>
      <p className="mt-0.5 text-[12.5px] text-ink-muted">Choose how the workspace looks on this device.</p>

      <div role="radiogroup" aria-label="Theme" onKeyDown={onKey} className="mt-4 grid grid-cols-3 gap-2.5 sm:gap-3">
        {THEMES.map(({ id, label }, i) => {
          const on = value.theme === id;
          return (
            <motion.button
              key={id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              whileTap={{ scale: 0.97 }}
              onClick={() => update({ theme: id })}
              className="group flex flex-col gap-2 rounded-md text-left outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              <span className={cn("relative block aspect-[4/3] w-full overflow-hidden rounded-md border-2 transition-colors", on ? "border-volt-ink" : "border-border group-hover:border-border-strong")}>
                {id === "system" ? (
                  <>
                    <span className="absolute inset-0"><Mini scheme="light" /></span>
                    <span className="absolute inset-0 [clip-path:polygon(100%_0,100%_100%,0_100%)]"><Mini scheme="dark" /></span>
                  </>
                ) : (
                  <Mini scheme={id} />
                )}
                <AnimatePresence>
                  {on && (
                    <motion.span initial={{ scale: 0, rotate: reduce ? 0 : -30 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 520, damping: 18 }} className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-volt text-on-volt shadow-sm">
                      <Check aria-hidden className="size-3" strokeWidth={3} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
              <span className={cn("px-0.5 text-[12.5px] font-medium", on ? "text-ink" : "text-ink-muted")}>{label}</span>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <label htmlFor={`${uid}-size`} className="text-[13px] font-medium text-ink">Text size</label>
          <span className="font-mono text-[12px] tabular-nums text-ink-muted">{value.textSize}%</span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span aria-hidden className="text-[11px] font-semibold text-ink-subtle">A</span>
          <div className="relative flex-1">
            <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-surface-sunken ring-1 ring-border" />
            <motion.div className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-volt" animate={{ width: `${(sizeIndex / (SIZES.length - 1)) * 100}%` }} transition={spring} />
            <div className="relative flex justify-between">
              {SIZES.map((s, i) => (
                <span key={s} aria-hidden className={cn("size-2 rounded-full", i <= sizeIndex ? "bg-volt" : "bg-border-strong")} />
              ))}
            </div>
            <input
              id={`${uid}-size`}
              type="range"
              min={0}
              max={SIZES.length - 1}
              step={1}
              value={sizeIndex}
              aria-valuetext={`${value.textSize} percent`}
              onChange={(e) => update({ textSize: SIZES[Number(e.target.value)] })}
              className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            <motion.span
              aria-hidden
              className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-volt bg-surface-raised shadow-md peer-focus-visible:shadow-[var(--focus-ring)]"
              animate={{ left: `${(sizeIndex / (SIZES.length - 1)) * 100}%` }}
              transition={spring}
            />
          </div>
          <span aria-hidden className="text-[16px] font-semibold text-ink-subtle">A</span>
        </div>
        <motion.p layout={!reduce} className="mt-4 rounded-md border border-border bg-surface-sunken px-3 py-2.5 text-ink-muted" style={{ fontSize: `${(13 * value.textSize) / 100}px` }}>
          The quick review is ready. Leave comments by Friday.
        </motion.p>
      </div>
    </section>
  );
}
