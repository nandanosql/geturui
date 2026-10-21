"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CitationSource {
  title: string;
  url: string;
  /** Short excerpt that supports the claim. */
  snippet?: string;
  /** Overrides the domain parsed from `url`. */
  domain?: string;
  /** e.g. "Mar 2026" or "Docs". */
  meta?: string;
}

interface Ctx {
  sources: CitationSource[];
  active: number | null;
  setActive: (n: number | null) => void;
  idBase: string;
}

const CitationsContext = React.createContext<Ctx | null>(null);

function useCitations() {
  const ctx = React.useContext(CitationsContext);
  if (!ctx) throw new Error("Citation components must be rendered inside <Citations>.");
  return ctx;
}

function domainOf(s: CitationSource) {
  if (s.domain) return s.domain;
  try {
    return new URL(s.url).hostname.replace(/^www\./, "");
  } catch {
    return s.url;
  }
}

function SourceMark({ source, className }: { source: CitationSource; className?: string }) {
  const d = domainOf(source);
  return (
    <span aria-hidden className={cn("grid size-5 shrink-0 place-items-center rounded-[6px] bg-surface text-[10px] font-semibold uppercase text-ink-muted ring-1 ring-border", className)}>
      {d.charAt(0)}
    </span>
  );
}

export interface CitationsProps {
  sources: CitationSource[];
  children: React.ReactNode;
  className?: string;
}

/** Provides numbered sources to inline <Citation> chips and the <CitationSources> list. */
export function Citations({ sources, children, className }: CitationsProps) {
  const [active, setActive] = React.useState<number | null>(null);
  const idBase = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const value = React.useMemo(() => ({ sources, active, setActive, idBase }), [sources, active, idBase]);
  return (
    <CitationsContext.Provider value={value}>
      <div className={className}>{children}</div>
    </CitationsContext.Provider>
  );
}

/** Inline numbered chip; hover or focus opens a source card. `n` is 1-based. */
export function Citation({ n }: { n: number }) {
  const { sources, active, setActive, idBase } = useCitations();
  const reduce = useReducedMotion();
  const [open, setOpen] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const source = sources[n - 1];
  const cardId = `${idBase}-card-${n}`;

  React.useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  if (!source) return null;

  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setOpen(true);
      setActive(n);
    }, 90);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(false);
    if (active === n) setActive(null);
  };

  return (
    <span className="relative inline-block align-baseline" onPointerEnter={show} onPointerLeave={hide}>
      <a
        href={`#${idBase}-src-${n}`}
        aria-describedby={open ? cardId : undefined}
        aria-label={`Source ${n}: ${source.title}`}
        onFocus={show}
        onBlur={hide}
        onKeyDown={(e) => e.key === "Escape" && hide()}
        className={cn(
          "mx-0.5 inline-grid h-[18px] min-w-[18px] -translate-y-px place-items-center rounded-full px-1 align-middle font-mono text-[10.5px] font-semibold no-underline outline-none transition-colors duration-150",
          "focus-visible:shadow-[var(--focus-ring)]",
          open || active === n ? "bg-volt text-on-volt" : "bg-surface text-ink-muted ring-1 ring-border hover:text-ink",
        )}
      >
        {n}
      </a>
      <AnimatePresence>
        {open && (
          <motion.span
            id={cardId}
            role="tooltip"
            initial={{ opacity: 0, y: reduce ? 0 : 6, scale: reduce ? 1 : 0.95, x: "-50%", filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, x: "-50%", filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 4, scale: 0.97, x: "-50%", filter: "blur(4px)", transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="absolute bottom-[calc(100%+8px)] left-1/2 z-[60] block w-[min(300px,80vw)] origin-bottom rounded-md border border-border bg-surface-raised p-3 text-left shadow-lg"
          >
            <span className="flex items-center gap-2">
              <SourceMark source={source} />
              <span className="truncate text-[12px] text-ink-subtle">{domainOf(source)}</span>
              {source.meta && <span className="ml-auto shrink-0 text-[11px] text-ink-subtle">{source.meta}</span>}
            </span>
            <span className="mt-2 block text-[13.5px] font-semibold leading-5 text-ink">{source.title}</span>
            {source.snippet && <span className="mt-1 line-clamp-3 block text-[12.5px] leading-[19px] text-ink-muted">{source.snippet}</span>}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/** Footer list of all sources; the one under a hovered chip is highlighted. */
export function CitationSources({ title = "Sources", className }: { title?: string; className?: string }) {
  const { sources, active, setActive, idBase } = useCitations();
  return (
    <div className={cn("mt-4 border-t border-border pt-3", className)}>
      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.6px] text-ink-subtle">{title}</h4>
      <ol className="grid gap-1.5 sm:grid-cols-2">
        {sources.map((s, i) => {
          const n = i + 1;
          const on = active === n;
          return (
            <li key={s.url + i} id={`${idBase}-src-${n}`} className="scroll-mt-24">
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer noopener"
                onPointerEnter={() => setActive(n)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(n)}
                onBlur={() => setActive(null)}
                className={cn(
                  "group/src relative flex items-center gap-2.5 rounded-sm border px-2.5 py-2 outline-none transition-colors duration-200 focus-visible:shadow-[var(--focus-ring)]",
                  on ? "border-volt-ink/50 bg-volt-soft" : "border-border bg-surface hover:border-border-strong",
                )}
              >
                <span className={cn("grid size-5 shrink-0 place-items-center rounded-full font-mono text-[10.5px] font-semibold transition-colors", on ? "bg-volt text-on-volt" : "bg-surface-sunken text-ink-muted")}>
                  {n}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink">{s.title}</span>
                  <span className="block truncate text-[11.5px] text-ink-subtle">{domainOf(s)}</span>
                </span>
                <ArrowUpRight aria-hidden className="size-3.5 shrink-0 text-ink-subtle transition-transform duration-300 ease-[var(--ease-spring)] group-hover/src:-translate-y-0.5 group-hover/src:translate-x-0.5" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Renders a string with `[n]` markers replaced by <Citation> chips. Must sit inside <Citations>. */
export function CitedText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\[\d+\])/g);
  return (
    <p className={cn("text-[14.5px] leading-[24px] text-ink", className)}>
      {parts.map((p, i) => {
        const m = p.match(/^\[(\d+)\]$/);
        return m ? <Citation key={i} n={Number(m[1])} /> : <React.Fragment key={i}>{p}</React.Fragment>;
      })}
    </p>
  );
}
