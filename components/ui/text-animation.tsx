"use client";

import * as React from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { cn } from "@/lib/utils";

type Tag = "h1" | "h2" | "h3" | "p" | "span" | "div";

export interface RevealTextProps {
  text: string;
  as?: Tag;
  /** One word to underline with a volt swash once revealed. */
  mark?: string;
  /** Seconds between words. */
  stagger?: number;
  delay?: number;
  className?: string;
}

/** Word-by-word reveal: each word rises and clears a blur, staggered. Runs once when in view. */
export function RevealText({ text, as = "h1", mark, stagger = 0.06, delay = 0, className }: RevealTextProps) {
  const ref = React.useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true });
  const Comp = motion[as] as typeof motion.h1;
  const words = text.split(" ");
  return (
    <Comp ref={ref as React.Ref<HTMLHeadingElement>} className={className} aria-label={text}>
      {words.map((w, i) => (
        <React.Fragment key={i}>
          <motion.span
            aria-hidden
            className="inline-block"
            initial={{ opacity: 0, y: "0.35em", filter: "blur(8px)" }}
            animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : undefined}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: delay + i * stagger }}
          >
            {mark === w ? (
              <span className="relative isolate inline-block whitespace-nowrap">
                {w}
                <motion.span
                  aria-hidden
                  className="absolute -inset-x-[0.06em] -bottom-[0.04em] -z-10 h-[0.16em] origin-left rounded-sm bg-volt"
                  initial={{ scaleX: 0 }}
                  animate={inView ? { scaleX: 1 } : undefined}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: delay + words.length * stagger + 0.15 }}
                />
              </span>
            ) : (
              w
            )}
          </motion.span>
          {i < words.length - 1 ? " " : null}
        </React.Fragment>
      ))}
    </Comp>
  );
}

/** Loading text with a light sweep across it. */
export function ShimmerText({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("shimmer-text", className)}>{children}</span>;
}

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+<>";

/** Characters scramble through random glyphs before settling, left to right. Re-runs when `text` changes. */
export function ScrambleText({ text, duration = 900, className, as: Tag = "span" }: { text: string; duration?: number; className?: string; as?: Tag }) {
  const [out, setOut] = React.useState(text);
  React.useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const settled = Math.floor(p * text.length);
      setOut(
        text
          .split("")
          .map((c, i) => (i < settled || c === " " ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
          .join(""),
      );
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, duration]);
  return (
    <Tag className={cn("tabular-nums", className)} aria-label={text}>
      <span aria-hidden>{out}</span>
    </Tag>
  );
}

/** Swaps between phrases with a vertical blur crossfade every `interval` ms. */
export function RotatingText({ words, interval = 2200, className }: { words: string[]; interval?: number; className?: string }) {
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [words.length, interval]);
  return (
    <span className={cn("relative inline-grid", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={words[i]}
          initial={{ y: "60%", opacity: 0, filter: "blur(6px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          exit={{ y: "-60%", opacity: 0, filter: "blur(6px)" }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="inline-block whitespace-nowrap"
        >
          {words[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
