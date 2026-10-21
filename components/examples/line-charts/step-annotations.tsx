"use client";

import * as React from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export interface StepAnnotation {
  /** Index of the point the note belongs to. */
  index: number;
  title: string;
  body: string;
}

export interface StepAnnotationsChartProps {
  title?: string;
  subtitle?: string;
  labels?: string[];
  /** Value held from each label until the next. */
  values?: number[];
  annotations?: StepAnnotation[];
  /** Optional plan limit drawn as a dashed ceiling. */
  limit?: number;
  unit?: string;
  className?: string;
}

const LABELS = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];
const VALUES = [14, 14, 18, 18, 18, 31, 31, 34, 34, 27, 29, 38];
const NOTES: StepAnnotation[] = [
  { index: 2, title: "Support team onboarded", body: "Four agents added for the holiday queue." },
  { index: 5, title: "Design moved to the workspace", body: "Thirteen seats migrated from the old tool." },
  { index: 9, title: "Contractors offboarded", body: "Seven guest seats released after the launch." },
  { index: 11, title: "Annual plan renewed", body: "Limit raised to 40 seats at the new rate." },
];

/** Step line for values that change in jumps, with numbered annotations you can hover, focus or step through to read what moved the line. */
export function StepAnnotationsChart({
  title = "Active seats",
  subtitle = "Workspace members billed each month",
  labels = LABELS,
  values = VALUES,
  annotations = NOTES,
  limit = 40,
  unit = "seats",
  className,
}: StepAnnotationsChartProps) {
  const reduce = useReducedMotion() ?? false;
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [active, setActive] = React.useState<number | null>(null);
  const btns = React.useRef<(HTMLButtonElement | null)[]>([]);

  const n = values.length;
  const top = Math.ceil((Math.max(...values, limit) * 1.1) / 10) * 10;
  const ticks = [0, top / 2, top];
  const xp = (i: number) => (i / n) * 100;
  const yp = (v: number) => (1 - v / top) * 100;
  const d = values.map((v, i) => `${i ? `H${xp(i).toFixed(2)}V` : `M0,`}${yp(v).toFixed(2)}`).join("") + `H100`;
  const note = active !== null ? annotations[active] : null;

  function onKey(e: React.KeyboardEvent, i: number) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = (i + (e.key === "ArrowRight" ? 1 : -1) + annotations.length) % annotations.length;
    btns.current[next]?.focus();
  }

  return (
    <figure className={cn("@container w-full rounded-xl border border-border bg-surface-raised p-4 shadow-sm sm:p-5", className)}>
      <figcaption className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[15px] font-semibold text-ink">{title}</p>
          <p className="text-[12.5px] text-ink-subtle">{subtitle}</p>
        </div>
        <p className="text-[12px] text-ink-muted">
          <span className="font-mono text-[18px] font-semibold tabular-nums text-ink">{values[n - 1]}</span> of {limit} {unit}
        </p>
      </figcaption>

      <div className="mt-6 grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-2">
        <div aria-hidden className="relative h-44 @md:h-52">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2 font-mono text-[10.5px] tabular-nums text-ink-subtle" style={{ top: `${yp(t)}%` }}>
              {t}
            </span>
          ))}
        </div>
        <div ref={ref} className="relative h-44 @md:h-52" onPointerLeave={() => setActive(null)}>
          <svg
            role="img"
            aria-label={`${title}: ${values[0]} in ${labels[0]} to ${values[n - 1]} in ${labels[n - 1]}, against a limit of ${limit}. ${annotations.length} annotated changes listed below.`}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
          >
            <defs>
              <linearGradient id={`${uid}-fill`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" style={{ stopColor: "var(--volt-ink)", stopOpacity: 0.18 }} />
                <stop offset="100%" style={{ stopColor: "var(--volt-ink)", stopOpacity: 0 }} />
              </linearGradient>
              <clipPath id={`${uid}-reveal`}>
                <motion.rect x={-2} y={-10} height={120} initial={{ width: reduce ? 104 : 0 }} animate={{ width: inView || reduce ? 104 : 0 }} transition={{ duration: reduce ? 0 : 1.3, ease: [0.65, 0, 0.35, 1] }} />
              </clipPath>
            </defs>
            {ticks.map((t) => (
              <line key={t} x1={0} x2={100} y1={yp(t)} y2={yp(t)} className="stroke-border" strokeDasharray={t ? "2 4" : undefined} vectorEffect="non-scaling-stroke" />
            ))}
            <line x1={0} x2={100} y1={yp(limit)} y2={yp(limit)} className="stroke-ink-muted" strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
            <g clipPath={`url(#${uid}-reveal)`}>
              <path d={`${d}V100H0Z`} fill={`url(#${uid}-fill)`} />
              <path d={d} fill="none" style={{ stroke: "var(--volt-ink)" }} strokeWidth={2.25} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </g>
            {note && <line x1={xp(note.index)} x2={xp(note.index)} y1={0} y2={100} className="stroke-ink-subtle" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
          </svg>
          <span aria-hidden className="absolute left-1 -translate-y-full pb-0.5 text-[10.5px] font-medium text-ink-muted" style={{ top: `${yp(limit)}%` }}>
            Plan limit · {limit}
          </span>

          {annotations.map((a, i) => (
            <motion.button
              key={a.index}
              ref={(el) => {
                btns.current[i] = el;
              }}
              type="button"
              aria-label={`${labels[a.index]}: ${a.title}. ${a.body}`}
              aria-describedby={active === i ? `${uid}-note` : undefined}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={inView || reduce ? { opacity: 1, scale: active === i ? 1.15 : 1 } : undefined}
              transition={{ type: "spring", stiffness: 420, damping: 22, delay: reduce || active !== null ? 0 : 1 + i * 0.12 }}
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              onKeyDown={(e) => onKey(e, i)}
              className={cn(
                "absolute -ml-3 -mt-3 grid size-6 place-items-center rounded-full border-2 font-mono text-[11px] font-semibold outline-none focus-visible:shadow-[var(--focus-ring)]",
                active === i ? "border-volt-ink bg-volt text-on-volt" : "border-volt-ink bg-surface-raised text-ink",
              )}
              style={{ left: `${xp(a.index)}%`, top: `${yp(values[a.index] ?? 0)}%` }}
            >
              {i + 1}
            </motion.button>
          ))}

          <AnimatePresence>
            {note && active !== null && (
              <motion.div
                key={active}
                id={`${uid}-note`}
                role="note"
                initial={{ opacity: 0, y: 6, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, filter: "blur(6px)", transition: { duration: 0.12 } }}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 30 }}
                className={cn("pointer-events-none absolute bottom-2 z-10 w-56 rounded-sm border border-border bg-surface-raised p-2.5 shadow-md", xp(note.index) > 50 ? "-translate-x-[calc(100%+16px)]" : "translate-x-4")}
                style={{ left: `${xp(note.index)}%` }}
              >
                <p className="font-mono text-[10.5px] uppercase tracking-wide text-ink-subtle">
                  {labels[note.index]} · {values[note.index]} {unit}
                </p>
                <p className="mt-0.5 text-[13px] font-semibold text-ink">{note.title}</p>
                <p className="mt-0.5 text-[12px] leading-[17px] text-ink-muted">{note.body}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div />
        <div aria-hidden className="relative mt-2 h-4">
          {labels.map((l, i) => (
            <span key={l + i} className={cn("absolute -translate-x-1/2 font-mono text-[10.5px] text-ink-subtle", i % 2 === 1 && "hidden @md:block")} style={{ left: `${xp(i + 0.5)}%` }}>
              {l}
            </span>
          ))}
        </div>
      </div>

      <ol className="mt-4 grid gap-1 @md:grid-cols-2">
        {annotations.map((a, i) => (
          <li key={a.index} onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(null)} className={cn("flex items-start gap-2 rounded-sm px-2 py-1.5 transition-colors", active === i ? "bg-surface-hover" : "")}>
            <span aria-hidden className={cn("mt-px grid size-5 shrink-0 place-items-center rounded-full font-mono text-[10.5px] font-semibold transition-colors", active === i ? "bg-volt text-on-volt" : "bg-surface text-ink-muted")}>
              {i + 1}
            </span>
            <span className="min-w-0 text-[12.5px] leading-[18px]">
              <span className="font-medium text-ink">{a.title}</span>
              <span className="text-ink-subtle"> · {labels[a.index]}</span>
            </span>
          </li>
        ))}
      </ol>
    </figure>
  );
}
