import * as React from "react";
import { cn } from "@/lib/utils";
import { Marquee } from "@/components/ui/marquee";

export type WordmarkStyle = "geometric" | "mono" | "serif" | "heavy" | "light" | "rounded";
export type WordmarkGlyph = "dot" | "ring" | "square" | "slash" | "triangle" | "bars" | "none";

export interface Logo {
  name: string;
  /** Type treatment for the text wordmark. */
  style?: WordmarkStyle;
  /** Small drawn mark before the name. */
  glyph?: WordmarkGlyph;
  /** Grid variant: line revealed on hover, e.g. "Cut build time 38%". */
  caption?: string;
  href?: string;
}

export interface LogoCloudProps {
  /** Line above the logos. Pass null to hide. */
  heading?: string | null;
  logos?: Logo[];
  /** Infinite marquee, or a static grid that reveals a caption on hover. */
  variant?: "marquee" | "grid";
  /** Seconds per marquee loop. */
  duration?: number;
  className?: string;
}

const STYLE_CLASSES: Record<WordmarkStyle, string> = {
  geometric: "font-display text-[22px] font-semibold tracking-[-0.8px]",
  mono: "font-mono text-[15px] font-medium uppercase tracking-[0.22em]",
  serif: "font-serif text-[23px] italic tracking-[-0.3px]",
  heavy: "font-sans text-[21px] font-black uppercase tracking-[-1px]",
  light: "font-sans text-[22px] font-light tracking-[0.06em] lowercase",
  rounded: "font-display text-[21px] font-bold tracking-[-0.4px] lowercase",
};

function Glyph({ glyph }: { glyph: WordmarkGlyph }) {
  if (glyph === "none") return null;
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="size-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={2.2}>
      {glyph === "dot" && <circle cx="10" cy="10" r="6" fill="currentColor" stroke="none" />}
      {glyph === "ring" && (
        <>
          <circle cx="10" cy="10" r="7" />
          <circle cx="10" cy="10" r="2.5" fill="currentColor" stroke="none" />
        </>
      )}
      {glyph === "square" && <rect x="3.5" y="3.5" width="13" height="13" rx="3.5" transform="rotate(45 10 10)" />}
      {glyph === "slash" && <path d="M5 17 L15 3 M10 17 L18 6" strokeLinecap="round" />}
      {glyph === "triangle" && <path d="M10 3 L17.5 16.5 H2.5 Z" fill="currentColor" stroke="none" />}
      {glyph === "bars" && <path d="M4 16V9 M10 16V4 M16 16v-5" strokeLinecap="round" strokeWidth={3} />}
    </svg>
  );
}

/** A made-up company rendered as a text wordmark. */
export function Wordmark({ logo, className }: { logo: Logo; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 whitespace-nowrap leading-none", STYLE_CLASSES[logo.style ?? "geometric"], className)}>
      <Glyph glyph={logo.glyph ?? "none"} />
      {logo.name}
    </span>
  );
}

const DEFAULT_LOGOS: Logo[] = [
  { name: "Halcyon", style: "geometric", glyph: "ring", caption: "Rebuilt onboarding in a week" },
  { name: "quillfire", style: "rounded", glyph: "slash", caption: "62 components in production" },
  { name: "Orbital/9", style: "mono", glyph: "none", caption: "Docs bounce rate down 24%" },
  { name: "Mosswood", style: "serif", glyph: "dot", caption: "One design system, four apps" },
  { name: "KESTREL", style: "heavy", glyph: "triangle", caption: "Shipped dark mode in a day" },
  { name: "lumenstack", style: "light", glyph: "bars", caption: "Checkout conversion up 11%" },
  { name: "Tidewave", style: "geometric", glyph: "square", caption: "Replaced 3 animation libraries" },
  { name: "Vellum", style: "serif", glyph: "none", caption: "Pricing page shipped in 2 hours" },
];

/** Strip of text-wordmark logos: an endless marquee, or a bordered grid where each cell lifts its logo and reveals a caption on hover. */
export function LogoCloud({
  heading = "Trusted by product teams at fast-moving companies",
  logos = DEFAULT_LOGOS,
  variant = "marquee",
  duration = 36,
  className,
}: LogoCloudProps) {
  return (
    <section className={cn("@container w-full px-4 py-12 sm:px-6 sm:py-16", className)}>
      <div className="mx-auto grid max-w-6xl gap-8">
        {heading && <p className="text-balance text-center text-sm font-medium text-ink-subtle">{heading}</p>}
        {variant === "marquee" ? (
          <Marquee duration={duration} className="py-2">
            {logos.map((l) => (
              <span key={l.name} className="mx-6 inline-flex items-center text-ink-muted transition-colors duration-200 hover:text-ink @xl:mx-8">
                <Wordmark logo={l} />
              </span>
            ))}
          </Marquee>
        ) : (
          <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border @xl:grid-cols-4">
            {logos.map((l) => {
              const inner = (
                <>
                  <span className="text-ink-muted transition-[transform,color] duration-500 ease-[var(--ease-spring)] group-hover/logo:-translate-y-2.5 group-hover/logo:text-ink group-focus-visible/logo:-translate-y-2.5 group-focus-visible/logo:text-ink">
                    <Wordmark logo={l} />
                  </span>
                  {l.caption && (
                    <span className="absolute inset-x-3 bottom-5 translate-y-2 text-center text-[12px] font-medium text-volt-ink opacity-0 blur-[4px] transition-[transform,opacity,filter] duration-500 ease-[var(--ease-spring)] group-hover/logo:translate-y-0 group-hover/logo:opacity-100 group-hover/logo:blur-0 group-focus-visible/logo:translate-y-0 group-focus-visible/logo:opacity-100 group-focus-visible/logo:blur-0">
                      {l.caption}
                    </span>
                  )}
                </>
              );
              const cell =
                "group/logo relative flex h-28 items-center justify-center bg-surface px-4 outline-none transition-colors duration-200 hover:bg-surface-raised focus-visible:bg-surface-raised focus-visible:shadow-[inset_0_0_0_2px_var(--volt-ink)] @xl:h-32";
              return (
                <li key={l.name} className="contents">
                  {l.href ? (
                    <a href={l.href} className={cell}>
                      {inner}
                    </a>
                  ) : (
                    <div className={cell} tabIndex={l.caption ? 0 : undefined}>
                      {inner}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
