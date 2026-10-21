"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export type Theme = "dark" | "light";

const STORAGE_KEY = "theme";

/**
 * Inline this in <head> (e.g. `<script dangerouslySetInnerHTML={{ __html: themeInitScript }} />`)
 * so the saved theme applies before first paint.
 */
export const themeInitScript = `try{var t=localStorage.getItem("${STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

function read(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && (e.newValue === "light" || e.newValue === "dark")) apply(e.newValue);
  };
  window.addEventListener("storage", onStorage);
  return () => {
    mo.disconnect();
    window.removeEventListener("storage", onStorage);
  };
}

function apply(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* storage blocked — the attribute still switches */
  }
}

let restored = false;
function restore() {
  if (restored || typeof window === "undefined") return;
  restored = true;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if ((saved === "light" || saved === "dark") && saved !== read()) document.documentElement.setAttribute("data-theme", saved);
  } catch {
    /* ignore */
  }
}

/** Current theme from <html data-theme>, kept in sync across components and tabs. Persists to localStorage("theme"). */
export function useTheme() {
  const theme = React.useSyncExternalStore<Theme>(subscribe, read, () => "dark");
  React.useEffect(restore, []);
  const setTheme = React.useCallback((t: Theme) => apply(t), []);
  const toggle = React.useCallback(() => apply(read() === "dark" ? "light" : "dark"), []);
  return { theme, setTheme, toggle };
}

export interface ThemeToggleProps {
  /** circle: a circular reveal from the button. shutter: vertical slats sweep across from the button's side. */
  variant?: "circle" | "shutter";
  /** Length of the reveal, ms. */
  duration?: number;
  /** Number of slats for the shutter variant. */
  slats?: number;
  onThemeChange?: (theme: Theme) => void;
  className?: string;
}

type DocWithVT = Document & {
  startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> };
};

/** Turns off the default crossfade only while this component's reveal runs. */
const VT_CSS =
  ":root.theme-reveal::view-transition-old(root),:root.theme-reveal::view-transition-new(root){animation:none;mix-blend-mode:normal}";

const ease = (t: number) => 1 - Math.pow(1 - t, 3);

function shutterFrames(count: number, fromRight: boolean, steps = 24): Keyframe[] {
  const stagger = 0.45; // share of the timeline spent staggering starts
  const frames: Keyframe[] = [];
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const pts: string[] = [];
    for (let k = 0; k < count; k++) {
      const order = fromRight ? count - 1 - k : k;
      const start = (order / Math.max(1, count - 1)) * stagger;
      const local = Math.min(1, Math.max(0, (t - start) / (1 - stagger)));
      const p = ease(local);
      const w = 100 / count;
      const cx = w * k + w / 2;
      const half = (w / 2) * p + (p > 0 ? 0.01 : 0);
      const l = Math.max(0, cx - half).toFixed(3);
      const r = Math.min(100, cx + half).toFixed(3);
      pts.push(`${l}% 0%`, `${r}% 0%`, `${r}% 100%`, `${l}% 100%`, `${l}% 0%`);
    }
    frames.push({ clipPath: `polygon(${pts.join(",")})`, offset: t });
  }
  return frames;
}

/** Sun/moon button that flips <html data-theme> with a View Transition reveal from the button (circle or shutter slats). */
export function ThemeToggle({ variant = "circle", duration = 650, slats = 8, onThemeChange, className }: ThemeToggleProps) {
  const { theme } = useTheme();
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLButtonElement>(null);
  const busy = React.useRef(false);

  async function toggle() {
    if (busy.current) return;
    const next: Theme = read() === "dark" ? "light" : "dark";
    const doc = document as DocWithVT;
    if (!doc.startViewTransition || reduce) {
      apply(next);
      onThemeChange?.(next);
      return;
    }
    busy.current = true;
    const r = ref.current?.getBoundingClientRect();
    const x = r ? r.left + r.width / 2 : window.innerWidth / 2;
    const y = r ? r.top + r.height / 2 : 0;
    const root = document.documentElement;
    root.classList.add("theme-reveal");
    try {
      const vt = doc.startViewTransition(() => apply(next));
      await vt.ready;
      if (variant === "shutter") {
        root.animate(shutterFrames(slats, x > window.innerWidth / 2), {
          duration: duration * 1.15,
          easing: "linear",
          pseudoElement: "::view-transition-new(root)",
        });
      } else {
        const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration, easing: "cubic-bezier(.22,1,.36,1)", pseudoElement: "::view-transition-new(root)" },
        );
      }
      onThemeChange?.(next);
      await vt.finished;
    } catch {
      apply(next);
    } finally {
      root.classList.remove("theme-reveal");
      busy.current = false;
    }
  }

  const dark = theme === "dark";
  return (
    <>
      <style href="geturui-theme-reveal" precedence="default">
        {VT_CSS}
      </style>
      <motion.button
        ref={ref}
        type="button"
        onClick={toggle}
        whileTap={{ scale: 0.92 }}
        transition={{ type: "spring", stiffness: 520, damping: 26 }}
        aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
        className={cn(
          "relative inline-grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-surface text-ink outline-none transition-colors duration-150 hover:border-border-strong hover:bg-surface-raised focus-visible:shadow-[var(--focus-ring)]",
          className,
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={theme}
            className="col-start-1 row-start-1 grid place-items-center"
            initial={reduce ? { opacity: 0 } : { opacity: 0, rotate: dark ? -90 : 90, scale: 0.4, y: 10 }}
            animate={{ opacity: 1, rotate: 0, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, rotate: dark ? 90 : -90, scale: 0.4, y: -10 }}
            transition={{ type: "spring", stiffness: 420, damping: 24 }}
          >
            {dark ? <Moon className="size-[18px]" aria-hidden /> : <Sun className="size-[18px]" aria-hidden />}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </>
  );
}
