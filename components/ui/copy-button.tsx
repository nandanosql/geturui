"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CopyButtonProps {
  value: string;
  label?: string;
  onCopy?: (value: string) => void;
  className?: string;
}

/** Copies `value`; the glyph morphs into a check (scale + blur) for 1.6s. */
export function CopyButton({ value, label = "Copy", onCopy, className }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);
  const t = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => {
    if (t.current) clearTimeout(t.current);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      /* clipboard blocked — still show feedback */
    }
    setCopied(true);
    onCopy?.(value);
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => setCopied(false), 1600);
  }

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      onClick={copy}
      aria-label={copied ? "Copied" : label}
      className={cn(
        "relative inline-grid size-8 shrink-0 place-items-center rounded-[10px] text-ink-muted outline-none transition-colors hover:bg-surface-hover hover:text-ink focus-visible:shadow-[var(--focus-ring)]",
        className,
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={copied ? "check" : "copy"}
          initial={{ opacity: 0, scale: 0.4, filter: "blur(4px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.4, filter: "blur(4px)" }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
          className="col-start-1 row-start-1"
        >
          {copied ? <Check className="size-4 text-success" strokeWidth={2.25} /> : <Copy className="size-4" />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
