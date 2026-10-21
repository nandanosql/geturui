"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Check, FileText, Folder, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Accent = "volt" | "sky" | "violet" | "rose" | "amber" | "graphite";
export type Density = "compact" | "default" | "comfortable";

export interface AccentDensityValue {
  accent: Accent;
  density: Density;
}

export interface AccentDensityPickerProps {
  defaultValue?: AccentDensityValue;
  /** Fires with every change. Only the preview updates; apply it to your app yourself. */
  onChange?: (value: AccentDensityValue) => void;
  className?: string;
}

const ACCENTS: { id: Accent; label: string; fill: string; text: string; soft: string }[] = [
  { id: "volt", label: "Volt", fill: "bg-volt", text: "text-on-volt", soft: "bg-volt-soft" },
  { id: "sky", label: "Sky", fill: "bg-sky-500", text: "text-white", soft: "bg-sky-500/15" },
  { id: "violet", label: "Violet", fill: "bg-violet-500", text: "text-white", soft: "bg-violet-500/15" },
  { id: "rose", label: "Rose", fill: "bg-rose-500", text: "text-white", soft: "bg-rose-500/15" },
  { id: "amber", label: "Amber", fill: "bg-amber-400", text: "text-neutral-950", soft: "bg-amber-400/20" },
  { id: "graphite", label: "Graphite", fill: "bg-ink", text: "text-bg", soft: "bg-surface-hover" },
];
const DENSITIES: { id: Density; label: string; row: string }[] = [
  { id: "compact", label: "Compact", row: "py-1" },
  { id: "default", label: "Default", row: "py-2" },
  { id: "comfortable", label: "Comfortable", row: "py-3" },
];
const FILES = [
  { name: "Brand guidelines", meta: "12 files", Icon: Folder },
  { name: "Q4 roadmap.pdf", meta: "2.4 MB", Icon: FileText },
  { name: "Launch hero.png", meta: "860 KB", Icon: ImageIcon },
];
const DEFAULT: AccentDensityValue = { accent: "volt", density: "default" };
const spring = { type: "spring", stiffness: 420, damping: 32 } as const;

/** Accent colour and density picker with a live preview: rows re-space with a layout spring and the accent repaints the selection. */
export function AccentDensityPicker({ defaultValue = DEFAULT, onChange, className }: AccentDensityPickerProps) {
  const uid = React.useId();
  const [value, setValue] = React.useState(defaultValue);
  const accentRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const densityRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const A = ACCENTS.find((a) => a.id === value.accent) ?? ACCENTS[0];
  const D = DENSITIES.find((d) => d.id === value.density) ?? DENSITIES[1];

  function update(next: Partial<AccentDensityValue>) {
    const v = { ...value, ...next };
    setValue(v);
    onChange?.(v);
  }

  function roving<T extends { id: string }>(e: React.KeyboardEvent, list: T[], current: string, refs: React.RefObject<(HTMLButtonElement | null)[]>, pick: (id: T["id"]) => void) {
    const i = list.findIndex((x) => x.id === current);
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const n = (i + step + list.length) % list.length;
    pick(list[n].id);
    refs.current[n]?.focus();
  }

  return (
    <section aria-labelledby={`${uid}-t`} className={cn("grid w-full max-w-[640px] overflow-hidden rounded-lg border border-border bg-surface-raised shadow-sm sm:grid-cols-[1fr_260px]", className)}>
      <div className="space-y-5 p-5">
        <div>
          <h2 id={`${uid}-t`} className="font-display text-[16px] font-semibold text-ink">Theme</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-muted">Pick an accent and how much room things get.</p>
        </div>
        <div>
          <p id={`${uid}-a`} className="text-[12px] font-medium text-ink-muted">Accent · <span className="text-ink">{A.label}</span></p>
          <div role="radiogroup" aria-labelledby={`${uid}-a`} onKeyDown={(e) => roving(e, ACCENTS, value.accent, accentRefs, (id) => update({ accent: id }))} className="mt-2.5 flex flex-wrap gap-2.5">
            {ACCENTS.map((a, i) => {
              const on = a.id === value.accent;
              return (
                <motion.button
                  key={a.id}
                  ref={(el) => {
                    accentRefs.current[i] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={a.label}
                  tabIndex={on ? 0 : -1}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => update({ accent: a.id })}
                  className={cn("relative grid size-8 place-items-center rounded-full outline-none ring-offset-2 ring-offset-surface-raised transition-shadow focus-visible:shadow-[var(--focus-ring)]", on && "ring-2 ring-border-strong")}
                >
                  <span className={cn("absolute inset-0 rounded-full shadow-sm ring-1 ring-inset ring-border", a.fill)} />
                  {on && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 600, damping: 20 }} className={cn("relative", a.text)}>
                      <Check aria-hidden className="size-4" strokeWidth={3} />
                    </motion.span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
        <div>
          <p id={`${uid}-d`} className="text-[12px] font-medium text-ink-muted">Density</p>
          <div role="radiogroup" aria-labelledby={`${uid}-d`} onKeyDown={(e) => roving(e, DENSITIES, value.density, densityRefs, (id) => update({ density: id }))} className="mt-2.5 grid grid-cols-3 rounded-full border border-border bg-surface-sunken p-1">
            {DENSITIES.map((d, i) => {
              const on = d.id === value.density;
              return (
                <button
                  key={d.id}
                  ref={(el) => {
                    densityRefs.current[i] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  tabIndex={on ? 0 : -1}
                  onClick={() => update({ density: d.id })}
                  className={cn("relative h-8 rounded-full text-[12.5px] font-medium outline-none focus-visible:shadow-[var(--focus-ring)]", on ? "text-ink" : "text-ink-subtle hover:text-ink")}
                >
                  {on && <motion.span layoutId={`${uid}-den`} transition={spring} className="absolute inset-0 rounded-full border border-border bg-surface-raised shadow-sm" />}
                  <span className="relative">{d.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div aria-label="Preview" role="img" className="border-t border-border bg-surface p-4 sm:border-l sm:border-t-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">Preview</p>
        <motion.ul layout className="mt-2.5 rounded-md border border-border bg-surface-raised p-1">
          {FILES.map(({ name, meta, Icon }, i) => (
            <motion.li key={name} layout transition={spring} className={cn("relative flex items-center gap-2.5 rounded-sm px-2", D.row)}>
              {i === 1 && <motion.span layout transition={spring} className={cn("absolute inset-0 rounded-sm", A.soft)} />}
              <Icon aria-hidden className={cn("relative size-4", i === 1 ? "text-ink" : "text-ink-subtle")} />
              <span className="relative flex-1 truncate text-[12.5px] text-ink">{name}</span>
              <span className="relative text-[11px] text-ink-subtle">{meta}</span>
            </motion.li>
          ))}
        </motion.ul>
        <motion.div layout transition={spring} className="mt-3">
          <div className="flex justify-between text-[11px] text-ink-muted">
            <span>Storage</span>
            <span className="tabular-nums">68%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
            <motion.div layout className={cn("h-full w-[68%] rounded-full transition-colors duration-300", A.fill)} />
          </div>
        </motion.div>
        <motion.div layout transition={spring} className={cn("mt-3 grid h-8 place-items-center rounded-full text-[12.5px] font-semibold transition-colors duration-300", A.fill, A.text)}>
          Share folder
        </motion.div>
      </div>
    </section>
  );
}
